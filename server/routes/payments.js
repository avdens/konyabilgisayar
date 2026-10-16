const express = require('express');
const router = express.Router();
const { db, runInTransaction, recalculateCariBalance, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/payments - List payments & collections with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { cari_id, type, date_start, date_end, payment_method, page = 1, limit = 25 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['p.is_deleted = 0'];
    let params = [];

    if (cari_id) {
      whereClauses.push('p.cari_id = ?');
      params.push(cari_id);
    }

    if (type && type !== 'all') {
      whereClauses.push('p.type = ?');
      params.push(type);
    }

    if (payment_method) {
      whereClauses.push('p.payment_method = ?');
      params.push(payment_method);
    }

    if (date_start) {
      whereClauses.push('p.date >= ?');
      params.push(date_start);
    }

    if (date_end) {
      whereClauses.push('p.date <= ?');
      params.push(date_end);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM payments p 
      JOIN cariler c ON p.cari_id = c.id 
      WHERE ${whereSql}
    `).get(...params);
    const total = countRow ? countRow.total : 0;

    const payments = await db.prepare(`
      SELECT 
        p.*,
        c.name as cari_name,
        c.phone as cari_phone,
        c.code as cari_code,
        u.full_name as user_name
      FROM payments p
      JOIN cariler c ON p.cari_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereSql}
      ORDER BY p.date DESC, p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    // Summary totals for the filtered results
    const summary = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN p.type = 'collection' THEN p.amount_cents ELSE 0 END), 0) as total_collections,
        COALESCE(SUM(CASE WHEN p.type = 'payment' THEN p.amount_cents ELSE 0 END), 0) as total_payments
      FROM payments p
      JOIN cariler c ON p.cari_id = c.id
      WHERE ${whereSql}
    `).get(...params);

    res.json({
      success: true,
      payments,
      summary,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payments - Create payment (Ödeme) or collection (Tahsilat)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      cari_id,
      type, // 'collection' (tahsilat - müşteriden para aldık) or 'payment' (ödeme - tedarikçiye para verdik)
      amount,
      payment_method = 'nakit',
      date,
      description
    } = req.body;

    if (!cari_id) {
      return res.status(400).json({ success: false, message: 'Cari seçilmelidir.' });
    }

    if (!type || !['collection', 'payment'].includes(type)) {
      return res.status(400).json({ success: false, message: 'İşlem türü geçerli olmalıdır (collection / payment).' });
    }

    const amountCents = Math.round((Number(amount) || 0) * 100);
    if (amountCents <= 0) {
      return res.status(400).json({ success: false, message: 'Tutar 0\'dan büyük olmalıdır.' });
    }

    const cari = await db.prepare('SELECT id, name FROM cariler WHERE id = ? AND is_deleted = 0').get(cari_id);
    if (!cari) {
      return res.status(404).json({ success: false, message: 'Cari hesap bulunamadı.' });
    }

    const txnDate = date || new Date().toISOString().substring(0, 10);

    const paymentResult = await runInTransaction(async () => {
      // 1. Generate Receipt No: THS-YYYY-XXXX (Tahsilat) or ODM-YYYY-XXXX (Ödeme)
      const prefix = type === 'collection' ? 'THS' : 'ODM';
      const currentYear = new Date().getFullYear();
      const last = await db.prepare(`SELECT receipt_no FROM payments WHERE receipt_no LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}-${currentYear}-%`);
      let nextSeq = 1;
      if (last && last.receipt_no) {
        const parts = last.receipt_no.split('-');
        if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
      }
      const receiptNo = `${prefix}-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;

      // 2. Insert into payments
      const insertPayment = db.prepare(`
        INSERT INTO payments (receipt_no, cari_id, type, amount_cents, payment_method, date, description, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `);

      const pRes = await insertPayment.run(
        receiptNo,
        cari_id,
        type,
        amountCents,
        payment_method,
        txnDate,
        description || null,
        req.user.id
      );

      const paymentId = pRes.lastInsertRowid;

      // 3. Insert into cari_transactions
      // If collection (tahsilat): Müşteriden para aldık -> Müşterinin borcu azaldı -> Credit cari (Alacak)
      // If payment (ödeme): Tedarikçiye ödeme yaptık -> Tedarikçinin bizden alacağı azaldı -> Debt cari (Borç)
      const debtCents = type === 'payment' ? amountCents : 0;
      const creditCents = type === 'collection' ? amountCents : 0;
      const txType = type === 'payment' ? 'payment_made' : 'collection_received';
      const label = type === 'payment' ? 'Tedarikçiye Ödeme' : 'Müşteriden Tahsilat';

      await db.prepare(`
        INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
        VALUES (?, ?, 'payments', ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        cari_id,
        txType,
        paymentId,
        receiptNo,
        debtCents,
        creditCents,
        txnDate,
        `${label} (${payment_method.toUpperCase()}) - ${description || receiptNo}`,
        req.user.id
      );

      // 4. Recalculate Cari balance
      const newBalance = await recalculateCariBalance(cari_id);

      await logAudit(req.user.id, req.user.username, 'CREATE', 'payment', paymentId, {
        receipt_no: receiptNo,
        type,
        cari_name: cari.name,
        amount_cents: amountCents,
        new_balance: newBalance
      }, req);

      return { paymentId, receiptNo, newBalance };
    });

    res.status(201).json({
      success: true,
      message: `${paymentResult.receiptNo} numaralı işlem başarıyla kaydedildi.`,
      paymentId: paymentResult.paymentId,
      receiptNo: paymentResult.receiptNo,
      cariBalance: paymentResult.newBalance
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, message: 'Ödeme/tahsilat kaydedilirken hata: ' + err.message });
  }
});

// DELETE /api/payments/:id - Soft delete payment & reverse cari balance
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const payment = await db.prepare('SELECT * FROM payments WHERE id = ? AND is_deleted = 0').get(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme/tahsilat kaydı bulunamadı.' });
    }

    await runInTransaction(async () => {
      await db.prepare('UPDATE payments SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(id);
      await db.prepare('UPDATE cari_transactions SET is_deleted = 1 WHERE ref_type = "payments" AND ref_id = ?').run(id);
      await recalculateCariBalance(payment.cari_id);

      await logAudit(req.user.id, req.user.username, 'DELETE', 'payment', id, {
        receipt_no: payment.receipt_no,
        amount_cents: payment.amount_cents
      }, req);
    });

    res.json({ success: true, message: 'Ödeme/tahsilat kaydı iptal edildi ve cari hesap bakiyesi düzeltildi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
