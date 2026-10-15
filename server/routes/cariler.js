const express = require('express');
const router = express.Router();
const { db, recalculateCariBalance, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/cariler - List cariler with search, filter (customer, supplier, both), and balance filter
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, type, balance_status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['c.is_deleted = 0'];
    let params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push(`(
        c.name LIKE ? 
        OR c.code LIKE ? 
        OR c.phone LIKE ? 
        OR c.tc_vkn LIKE ? 
        OR c.email LIKE ? 
        OR c.city LIKE ?
        OR c.district LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term);
    }

    if (type && type !== 'all') {
      if (type === 'customer') {
        whereClauses.push("(c.type = 'customer' OR c.type = 'both')");
      } else if (type === 'supplier') {
        whereClauses.push("(c.type = 'supplier' OR c.type = 'both')");
      } else {
        whereClauses.push('c.type = ?');
        params.push(type);
      }
    }

    if (balance_status) {
      if (balance_status === 'receivable') {
        // Alacaklı olduğumuz cariler (bakiye > 0)
        whereClauses.push('c.balance_cents > 0');
      } else if (balance_status === 'payable') {
        // Borçlu olduğumuz cariler (bakiye < 0)
        whereClauses.push('c.balance_cents < 0');
      } else if (balance_status === 'zero') {
        // Bakiyesi sıfır olanlar
        whereClauses.push('c.balance_cents = 0');
      }
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM cariler c WHERE ${whereSql}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const cariler = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM purchases WHERE cari_id = c.id AND is_deleted = 0) as total_purchases_count,
        (SELECT COUNT(*) FROM sales WHERE cari_id = c.id AND is_deleted = 0) as total_sales_count
      FROM cariler c
      WHERE ${whereSql}
      ORDER BY ABS(c.balance_cents) DESC, c.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    res.json({
      success: true,
      cariler,
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

// GET /api/cariler/:id - Single Cari detail with summary stats
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const cari = db.prepare('SELECT * FROM cariler WHERE id = ? AND is_deleted = 0').get(id);
    if (!cari) {
      return res.status(404).json({ success: false, message: 'Cari hesap bulunamadı.' });
    }

    // Alış istatistikleri
    const purchasesStats = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount_cents), 0) as total_amount,
        COALESCE(SUM(paid_amount_cents), 0) as total_paid
      FROM purchases
      WHERE cari_id = ? AND is_deleted = 0
    `).get(id);

    // Satış istatistikleri
    const salesStats = db.prepare(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount_cents), 0) as total_amount,
        COALESCE(SUM(collected_amount_cents), 0) as total_collected
      FROM sales
      WHERE cari_id = ? AND is_deleted = 0
    `).get(id);

    // Ödeme & Tahsilat istatistikleri
    const paymentStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'collection' THEN amount_cents ELSE 0 END), 0) as total_collections,
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount_cents ELSE 0 END), 0) as total_payments
      FROM payments
      WHERE cari_id = ? AND is_deleted = 0
    `).get(id);

    res.json({
      success: true,
      cari,
      stats: {
        purchases: purchasesStats,
        sales: salesStats,
        payments: paymentStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cariler/:id/statement - Cari Ekstre (Chronological statement with running balance)
router.get('/:id/statement', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const cari = db.prepare('SELECT id, code, name, balance_cents FROM cariler WHERE id = ? AND is_deleted = 0').get(id);
    if (!cari) {
      return res.status(404).json({ success: false, message: 'Cari hesap bulunamadı.' });
    }

    // Fetch all transactions for this Cari in ascending order to compute running balance
    const transactions = db.prepare(`
      SELECT 
        tx.*,
        u.full_name as user_name
      FROM cari_transactions tx
      LEFT JOIN users u ON tx.user_id = u.id
      WHERE tx.cari_id = ? AND tx.is_deleted = 0
      ORDER BY tx.date ASC, tx.id ASC
    `).all(id);

    // Compute running balance
    let currentRunningBalance = 0;
    const statement = transactions.map(item => {
      // Bizim açımızdan: Borç (debt_cents) alacağımızı artırır (+), Alacak (credit_cents) borcumuzu artırır veya alacağımızı azaltır (-)
      currentRunningBalance += (Number(item.debt_cents) - Number(item.credit_cents));
      return {
        ...item,
        running_balance_cents: currentRunningBalance
      };
    });

    res.json({
      success: true,
      cari,
      statement: statement.reverse(), // Send latest on top for display, but running balance is accurate
      currentBalanceCents: cari.balance_cents
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cariler - Create new Cari
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      name,
      type = 'both',
      phone,
      email,
      tc_vkn,
      tax_office,
      city = 'Konya',
      district,
      address,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Cari Adı / Firma Ünvanı zorunludur.' });
    }

    // Generate code CR-XXXX (guaranteed unique using max sequence)
    const maxRow = db.prepare(`SELECT MAX(CAST(SUBSTR(code, 4) AS INTEGER)) as max_seq FROM cariler WHERE code LIKE 'CR-%'`).get();
    const nextNum = (((maxRow && maxRow.max_seq) ? maxRow.max_seq : 0) + 1).toString().padStart(4, '0');
    const nextCode = `CR-${nextNum}`;

    const result = db.prepare(`
      INSERT INTO cariler (code, type, name, phone, email, tc_vkn, tax_office, city, district, address, notes, balance_cents, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `).run(
      nextCode,
      type,
      name.trim(),
      phone || null,
      email || null,
      tc_vkn || null,
      tax_office || null,
      city || 'Konya',
      district || null,
      address || null,
      notes || null
    );

    const newId = result.lastInsertRowid;
    logAudit(req.user.id, req.user.username, 'CREATE', 'cari', newId, { code: nextCode, name, type }, req);

    res.status(201).json({
      success: true,
      message: 'Cari hesap başarıyla oluşturuldu.',
      cariId: newId,
      code: nextCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cari eklenirken hata: ' + err.message });
  }
});

// PUT /api/cariler/:id - Update Cari
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM cariler WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cari hesap bulunamadı.' });
    }

    const {
      name,
      type,
      phone,
      email,
      tc_vkn,
      tax_office,
      city,
      district,
      address,
      notes
    } = req.body;

    db.prepare(`
      UPDATE cariler SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        phone = ?,
        email = ?,
        tc_vkn = ?,
        tax_office = ?,
        city = COALESCE(?, city),
        district = ?,
        address = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      type || null,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      tc_vkn !== undefined ? tc_vkn : existing.tc_vkn,
      tax_office !== undefined ? tax_office : existing.tax_office,
      city || null,
      district !== undefined ? district : existing.district,
      address !== undefined ? address : existing.address,
      notes !== undefined ? notes : existing.notes,
      id
    );

    logAudit(req.user.id, req.user.username, 'UPDATE', 'cari', id, { name, type }, req);

    res.json({ success: true, message: 'Cari hesap bilgileri güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cariler/:id - Soft delete Cari
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM cariler WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cari hesap bulunamadı.' });
    }

    if (existing.balance_cents !== 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bakiyesi 0 olmayan cari hesap silinemez. Lütfen önce bakiyeyi sıfırlayınız.' 
      });
    }

    db.prepare('UPDATE cariler SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(id);
    logAudit(req.user.id, req.user.username, 'DELETE', 'cari', id, { name: existing.name, code: existing.code }, req);

    res.json({ success: true, message: 'Cari hesap çöp kutusuna taşındı.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
