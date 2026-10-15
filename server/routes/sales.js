const express = require('express');
const router = express.Router();
const { db, runInTransaction, recalculateCariBalance, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/sales - List sales
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, cari_id, date_start, date_end, page = 1, limit = 25 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const isAdmin = req.user.role === 'admin';

    let whereClauses = ['s.is_deleted = 0'];
    let params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(s.invoice_no LIKE ? OR c.name LIKE ? OR s.notes LIKE ?)');
      params.push(term, term, term);
    }

    if (cari_id) {
      whereClauses.push('s.cari_id = ?');
      params.push(cari_id);
    }

    if (date_start) {
      whereClauses.push('s.sale_date >= ?');
      params.push(date_start);
    }

    if (date_end) {
      whereClauses.push('s.sale_date <= ?');
      params.push(date_end);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM sales s 
      JOIN cariler c ON s.cari_id = c.id 
      WHERE ${whereSql}
    `).get(...params);
    const total = countRow ? countRow.total : 0;

    const sales = db.prepare(`
      SELECT 
        s.*,
        c.name as cari_name,
        c.phone as cari_phone,
        u.full_name as user_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      JOIN cariler c ON s.cari_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE ${whereSql}
      ORDER BY s.sale_date DESC, s.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    const processed = sales.map(s => ({
      ...s,
      cost_amount_cents: isAdmin ? s.cost_amount_cents : null,
      gross_profit_cents: isAdmin ? s.gross_profit_cents : null
    }));

    res.json({
      success: true,
      sales: processed,
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

// GET /api/sales/:id - Single sale details with sold products & customer info
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const id = req.params.id;
    const isAdmin = req.user.role === 'admin';

    const sale = db.prepare(`
      SELECT 
        s.*,
        c.name as cari_name,
        c.phone as cari_phone,
        c.address as cari_address,
        c.tc_vkn as cari_tc_vkn,
        c.tax_office as cari_tax_office,
        c.balance_cents as cari_current_balance,
        u.full_name as user_name
      FROM sales s
      JOIN cariler c ON s.cari_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.is_deleted = 0
    `).get(id);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Satış kaydı bulunamadı.' });
    }

    const items = db.prepare(`
      SELECT 
        si.*,
        pr.product_code,
        pr.name as product_name,
        pr.brand,
        pr.model,
        pr.serial_number,
        pr.imei,
        pr.condition,
        pr.cosmetic_grade,
        cat.name as category_name
      FROM sale_items si
      JOIN products pr ON si.product_id = pr.id
      JOIN categories cat ON pr.category_id = cat.id
      WHERE si.sale_id = ?
    `).all(id);

    if (!isAdmin) {
      sale.cost_amount_cents = null;
      sale.gross_profit_cents = null;
      items.forEach(i => {
        i.cost_price_cents = null;
        i.profit_cents = null;
      });
    }

    res.json({ success: true, sale, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sales - Create sale (Sell stock items, mark as sold, update Cari ledger in transaction)
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      cari_id,
      sale_date,
      payment_method = 'nakit',
      collected_amount = 0,
      notes,
      items = [] // array of { product_id, sale_price }
    } = req.body;

    if (!cari_id) {
      return res.status(400).json({ success: false, message: 'Müşteri (Cari) seçilmelidir.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Satılacak en az bir ürün seçilmelidir.' });
    }

    const cari = db.prepare('SELECT id, name FROM cariler WHERE id = ? AND is_deleted = 0').get(cari_id);
    if (!cari) {
      return res.status(404).json({ success: false, message: 'Müşteri cari kaydı bulunamadı.' });
    }

    const sDate = sale_date || new Date().toISOString().substring(0, 10);
    const collectedCents = Math.round((Number(collected_amount) || 0) * 100);

    // Verify all selected products are in stock
    const productIds = items.map(i => i.product_id);
    const placeholders = productIds.map(() => '?').join(',');
    const stockProducts = db.prepare(`
      SELECT id, name, product_code, status, purchase_price_cents 
      FROM products 
      WHERE id IN (${placeholders}) AND is_deleted = 0
    `).all(...productIds);

    if (stockProducts.length !== items.length) {
      return res.status(400).json({ success: false, message: 'Seçilen ürünlerden bazıları sistemde bulunamadı.' });
    }

    for (const prod of stockProducts) {
      if (prod.status === 'sold') {
        return res.status(400).json({ 
          success: false, 
          message: `"${prod.name}" (${prod.product_code}) zaten satılmış durumda!` 
        });
      }
    }

    const prodMap = {};
    stockProducts.forEach(p => { prodMap[p.id] = p; });

    let totalSaleCents = 0;
    let totalCostCents = 0;

    for (const item of items) {
      const salePriceCents = Math.round((Number(item.sale_price) || 0) * 100);
      if (salePriceCents <= 0) {
        return res.status(400).json({ success: false, message: 'Satış fiyatı 0 veya negatif olamaz.' });
      }
      totalSaleCents += salePriceCents;
      const product = prodMap[item.product_id];
      totalCostCents += Number(product.purchase_price_cents || 0);
    }

    const grossProfitCents = totalSaleCents - totalCostCents;
    const remainingCents = totalSaleCents - collectedCents;

    // Run transaction
    const saleResult = runInTransaction(() => {
      // 1. Generate Invoice No: SAT-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      const lastSale = db.prepare("SELECT invoice_no FROM sales WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1").get(`SAT-${currentYear}-%`);
      let nextSeq = 1;
      if (lastSale && lastSale.invoice_no) {
        const parts = lastSale.invoice_no.split('-');
        if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
      }
      const invoiceNo = `SAT-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;

      // 2. Insert into sales table
      const insertSale = db.prepare(`
        INSERT INTO sales (
          invoice_no, cari_id, sale_date, total_amount_cents, cost_amount_cents,
          gross_profit_cents, collected_amount_cents, remaining_amount_cents,
          payment_method, notes, user_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      `);

      const sRes = insertSale.run(
        invoiceNo,
        cari_id,
        sDate,
        totalSaleCents,
        totalCostCents,
        grossProfitCents,
        collectedCents,
        remainingCents,
        payment_method,
        notes || null,
        req.user.id
      );

      const saleId = sRes.lastInsertRowid;

      // 3. Insert sale items & update products status to 'sold'
      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, sale_price_cents, cost_price_cents, profit_cents)
        VALUES (?, ?, ?, ?, ?)
      `);

      const updateProduct = db.prepare(`
        UPDATE products 
        SET status = 'sold', sold_sale_id = ?, sold_at = datetime('now', 'localtime'),
            sold_price_cents = ?, sold_cari_id = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      for (const item of items) {
        const salePriceCents = Math.round((Number(item.sale_price) || 0) * 100);
        const prod = prodMap[item.product_id];
        const costCents = Number(prod.purchase_price_cents || 0);
        const profitCents = salePriceCents - costCents;

        insertSaleItem.run(saleId, item.product_id, salePriceCents, costCents, profitCents);
        updateProduct.run(saleId, salePriceCents, cari_id, item.product_id);
      }

      // 4. Cari Hareketleri:
      // A) Satış Yapıldı -> Cari Borçlandı (debt_cents: totalSaleCents)
      db.prepare(`
        INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
        VALUES (?, 'sale', 'sales', ?, ?, ?, 0, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        cari_id,
        saleId,
        invoiceNo,
        totalSaleCents,
        sDate,
        `Satış Faturası: ${invoiceNo} (${items.length} Kalem Ürün)`,
        req.user.id
      );

      // B) Satış Sırasında Tahsilat Yapıldıysa -> Cari Alacaklandı (credit_cents: collectedCents)
      if (collectedCents > 0) {
        db.prepare(`
          INSERT INTO cari_transactions (cari_id, type, ref_type, ref_id, document_no, debt_cents, credit_cents, date, description, user_id, created_at)
          VALUES (?, 'collection_received', 'sales', ?, ?, 0, ?, ?, ?, ?, datetime('now', 'localtime'))
        `).run(
          cari_id,
          saleId,
          invoiceNo,
          collectedCents,
          sDate,
          `Satış Anı Tahsilat (${payment_method.toUpperCase()}) - ${invoiceNo}`,
          req.user.id
        );
      }

      // 5. Cari Güncel Bakiyesini Yeniden Hesapla
      const newBalance = recalculateCariBalance(cari_id);

      logAudit(req.user.id, req.user.username, 'CREATE', 'sale', saleId, {
        invoice_no: invoiceNo,
        cari_name: cari.name,
        total_cents: totalSaleCents,
        collected_cents: collectedCents,
        remaining_cents: remainingCents,
        profit_cents: grossProfitCents
      }, req);

      return { saleId, invoiceNo, newBalance };
    });

    res.status(201).json({
      success: true,
      message: `${saleResult.invoiceNo} numaralı satış başarıyla tamamlandı.`,
      saleId: saleResult.saleId,
      invoiceNo: saleResult.invoiceNo,
      cariBalance: saleResult.newBalance
    });
  } catch (err) {
    console.error('Sale create error:', err);
    res.status(500).json({ success: false, message: 'Satış işlemi kaydedilirken hata: ' + err.message });
  }
});

// DELETE /api/sales/:id - Cancel sale (Soft delete, return products to 'in_stock', revert cari ledger)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND is_deleted = 0').get(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Satış kaydı bulunamadı.' });
    }

    runInTransaction(() => {
      // 1. Soft delete sale
      db.prepare('UPDATE sales SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(id);

      // 2. Return sold products back to 'in_stock'
      const items = db.prepare('SELECT product_id FROM sale_items WHERE sale_id = ?').all(id);
      for (const item of items) {
        db.prepare(`
          UPDATE products 
          SET status = 'in_stock', sold_sale_id = NULL, sold_at = NULL, sold_price_cents = NULL, sold_cari_id = NULL, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(item.product_id);
      }

      // 3. Soft delete cari transactions
      db.prepare(`
        UPDATE cari_transactions 
        SET is_deleted = 1 
        WHERE ref_type = 'sales' AND ref_id = ?
      `).run(id);

      // 4. Recalculate Cari balance
      recalculateCariBalance(sale.cari_id);

      logAudit(req.user.id, req.user.username, 'DELETE', 'sale', id, {
        invoice_no: sale.invoice_no,
        total_cents: sale.total_amount_cents
      }, req);
    });

    res.json({ success: true, message: 'Satış iptal edildi, ürünler stoka iade edildi ve cari bakiye düzeltildi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
