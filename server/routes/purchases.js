const express = require('express');
const router = express.Router();
const { db, runInTransaction, recalculateCariBalance, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/purchases - List purchases with search and filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, cari_id, date_start, date_end, page = 1, limit = 25 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['p.is_deleted = 0'];
    let params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(p.invoice_no LIKE ? OR c.name LIKE ? OR p.notes LIKE ?)');
      params.push(term, term, term);
    }

    if (cari_id) {
      whereClauses.push('p.cari_id = ?');
      params.push(cari_id);
    }

    if (date_start) {
      whereClauses.push('p.purchase_date >= ?');
      params.push(date_start);
    }

    if (date_end) {
      whereClauses.push('p.purchase_date <= ?');
      params.push(date_end);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM purchases p 
      JOIN cariler c ON p.cari_id = c.id 
      WHERE ${whereSql}
    `).get(...params);
    const total = countRow ? countRow.total : 0;

    const purchases = db.prepare(`
      SELECT 
        p.*,
        c.name as cari_name,
        c.phone as cari_phone,
        u.full_name as user_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      JOIN cariler c ON p.cari_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereSql}
      ORDER BY p.purchase_date DESC, p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    res.json({
      success: true,
      purchases,
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

// GET /api/purchases/:id - Single purchase details with items
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const purchase = db.prepare(`
      SELECT 
        p.*,
        c.name as cari_name,
        c.phone as cari_phone,
        c.address as cari_address,
        c.tc_vkn as cari_tc_vkn,
        c.tax_office as cari_tax_office,
        c.balance_cents as cari_current_balance,
        u.full_name as user_name
      FROM purchases p
      JOIN cariler c ON p.cari_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_deleted = 0
    `).get(id);

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Alış kaydı bulunamadı.' });
    }

    const items = db.prepare(`
      SELECT 
        pi.*,
        pr.product_code,
        pr.name as product_name,
        pr.brand,
        pr.model,
        pr.serial_number,
        pr.imei,
        pr.status as product_status,
        cat.name as category_name
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      JOIN categories cat ON pr.category_id = cat.id
      WHERE pi.purchase_id = ?
    `).all(id);

    res.json({ success: true, purchase, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/purchases - Create purchase with items inside ACID transaction
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      cari_id,
      purchase_date,
      payment_method = 'nakit',
      paid_amount = 0,
      notes,
      items = [] // array of { name, category_id, brand, model, serial_number, imei, condition, cosmetic_grade, specs, purchase_price, estimated_sale_price } OR { existing_product_id, purchase_price }
    } = req.body;

    if (!cari_id) {
      return res.status(400).json({ success: false, message: 'Tedarikçi veya cari seçilmelidir.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'En az bir ürün eklenmelidir.' });
    }

    const cari = db.prepare('SELECT id, name FROM cariler WHERE id = ? AND is_deleted = 0').get(cari_id);
    if (!cari) {
      return res.status(404).json({ success: false, message: 'Seçilen cari bulunamadı.' });
    }

    const pDate = purchase_date || new Date().toISOString().substring(0, 10);
    const paidCents = Math.round((Number(paid_amount) || 0) * 100);

    // Calculate total amount from items
    let totalCents = 0;
    for (const item of items) {
      const priceCents = Math.round((Number(item.purchase_price) || 0) * 100);
      if (priceCents <= 0) {
        return res.status(400).json({ success: false, message: 'Ürün alış fiyatı 0 veya negatif olamaz.' });
      }
      totalCents += priceCents;
    }

    const remainingCents = totalCents - paidCents;

    // Run everything in an immediate transaction
    const purchaseResult = runInTransaction(() => {
      // 1. Generate Invoice No: ALS-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      const lastPurchase = db.prepare("SELECT invoice_no FROM purchases WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1").get(`ALS-${currentYear}-%`);
      let nextSeq = 1;
      if (lastPurchase && lastPurchase.invoice_no) {
        const parts = lastPurchase.invoice_no.split('-');
        if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
      }
      const invoiceNo = `ALS-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;

      // 2. Insert into purchases table
      const insertPurchase = db.prepare(`
        INSERT INTO purchases (
          invoice_no, cari_id, purchase_date, total_amount_cents, paid_amount_cents,
          remaining_amount_cents, payment_method, notes, user_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);

      const pRes = insertPurchase.run(
        invoiceNo,
        cari_id,
        pDate,
        totalCents,
        paidCents,
        remainingCents,
        payment_method,
        notes || null,
        req.user.id
      );

      const purchaseId = pRes.lastInsertRowid;

      // 3. Insert or link products and purchase_items
      const insertPurchaseItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, price_cents)
        VALUES (?, ?, ?)
      `);

      const insertProduct = db.prepare(`
        INSERT INTO products (
          product_code, name, category_id, brand, model, serial_number, imei,
          condition, cosmetic_grade, specs, description, purchase_price_cents,
          estimated_sale_price_cents, purchase_date, supplier_cari_id, status,
          images_json, created_by_user_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);

      for (const item of items) {
        const itemPriceCents = Math.round((Number(item.purchase_price) || 0) * 100);
        let productId = item.existing_product_id;
        if (!productId) {
          // Create new product with guaranteed unique code
          const maxRow = db.prepare(`SELECT MAX(CAST(SUBSTR(product_code, 5) AS INTEGER)) as max_seq FROM products WHERE product_code LIKE 'URN-%'`).get();
          const nextNum = (((maxRow && maxRow.max_seq) ? maxRow.max_seq : 0) + 1).toString().padStart(4, '0');
          const pCode = `URN-${nextNum}`;
          const estSaleCents = Math.round((Number(item.estimated_sale_price) || 0) * 100);

          const prodRes = insertProduct.run(
            pCode,
            item.name.trim(),
            item.category_id,
            item.brand.trim(),
            item.model.trim(),
            item.serial_number ? item.serial_number.trim() : null,
            item.imei ? item.imei.trim() : null,
            item.condition || 'second_hand',
            item.cosmetic_grade || null,
            item.specs || null,
            item.description || null,
            itemPriceCents,
            estSaleCents,
            pDate,
            cari_id,
            JSON.stringify(item.images || []),
            req.user.id
          );
          productId = prodRes.lastInsertRowid;
        } else {
          // If existing product, update supplier and purchase price
          db.prepare(`
            UPDATE products 
            SET supplier_cari_id = ?, purchase_price_cents = ?, purchase_date = ?, status = 'in_stock', updated_at = datetime('now', 'localtime')
            WHERE id = ?
          `).run(cari_id, itemPriceCents, pDate, productId);
        }

        insertPurchaseItem.run(purchaseId, productId, itemPriceCents);
      }

      // 4. Cari Hareketleri:
      // A) Mal Alışı -> Cari Alacaklandı (credit_cents: totalCents)
      db.prepare(`
        INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
        VALUES (?, 'purchase', 'purchases', ?, ?, 0, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        cari_id,
        purchaseId,
        invoiceNo,
        totalCents,
        pDate,
        `Alış Faturası: ${invoiceNo} (${items.length} Kalem Ürün)`,
        req.user.id
      );

      // B) Peşin Ödenen Tutar Varsa -> Cari Borçlandı (debt_cents: paidCents)
      if (paidCents > 0) {
        db.prepare(`
          INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
          VALUES (?, 'payment_made', 'purchases', ?, ?, ?, 0, ?, ?, ?, datetime('now', 'localtime'))
        `).run(
          cari_id,
          purchaseId,
          invoiceNo,
          paidCents,
          pDate,
          `Alış Sırasında Ödeme (${payment_method.toUpperCase()}) - ${invoiceNo}`,
          req.user.id
        );
      }

      // 5. Cari Güncel Bakiyesini Yeniden Hesapla
      const newBalance = recalculateCariBalance(cari_id);

      logAudit(req.user.id, req.user.username, 'CREATE', 'purchase', purchaseId, {
        invoice_no: invoiceNo,
        cari_name: cari.name,
        total_cents: totalCents,
        paid_cents: paidCents,
        remaining_cents: remainingCents
      }, req);

      return { purchaseId, invoiceNo, newBalance };
    });

    res.status(201).json({
      success: true,
      message: `${purchaseResult.invoiceNo} numaralı alış kaydı başarıyla oluşturuldu.`,
      purchaseId: purchaseResult.purchaseId,
      invoiceNo: purchaseResult.invoiceNo,
      cariBalance: purchaseResult.newBalance
    });
  } catch (err) {
    console.error('Purchase create error:', err);
    res.status(500).json({ success: false, message: 'Alış işlemi kaydedilirken hata: ' + err.message });
  }
});

// DELETE /api/purchases/:id - Cancel purchase (Soft delete and revert cari balance)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ? AND is_deleted = 0').get(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Alış kaydı bulunamadı.' });
    }

    // Check if any product from this purchase was already sold
    const soldItem = db.prepare(`
      SELECT pr.name, pr.product_code 
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ? AND pr.status = 'sold'
    `).get(id);

    if (soldItem) {
      return res.status(400).json({
        success: false,
        message: `Bu alışta yer alan "${soldItem.name}" (${soldItem.product_code}) adlı ürün daha sonra satılmış. Alış iptal edilemez.`
      });
    }

    runInTransaction(() => {
      // 1. Soft delete purchase
      db.prepare('UPDATE purchases SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(id);

      // 2. Soft delete related products or mark deleted
      const items = db.prepare('SELECT product_id FROM purchase_items WHERE purchase_id = ?').all(id);
      for (const item of items) {
        db.prepare('UPDATE products SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(item.product_id);
      }

      // 3. Soft delete cari transactions
      db.prepare(`
        UPDATE cari_transactions 
        SET is_deleted = 1 
        WHERE ref_type = 'purchases' AND ref_id = ?
      `).run(id);

      // 4. Recalculate Cari balance
      recalculateCariBalance(purchase.cari_id);

      logAudit(req.user.id, req.user.username, 'DELETE', 'purchase', id, {
        invoice_no: purchase.invoice_no,
        total_cents: purchase.total_amount_cents
      }, req);
    });

    res.json({ success: true, message: 'Alış kaydı iptal edildi ve stoklar/cari hareketleri güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
