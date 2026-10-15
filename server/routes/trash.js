const express = require('express');
const router = express.Router();
const { db, recalculateCariBalance, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/trash - List all deleted items across tables
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    // 1. Silinen Ürünler
    const products = db.prepare(`
      SELECT 'product' as item_type, p.id, p.product_code as code, p.name, p.brand, p.model, p.deleted_at
      FROM products p WHERE p.is_deleted = 1 ORDER BY p.deleted_at DESC
    `).all();

    // 2. Silinen Cariler
    const cariler = db.prepare(`
      SELECT 'cari' as item_type, c.id, c.code, c.name, c.type as brand, c.phone as model, c.deleted_at
      FROM cariler c WHERE c.is_deleted = 1 ORDER BY c.deleted_at DESC
    `).all();

    // 3. Silinen Masraflar
    const expenses = db.prepare(`
      SELECT 'expense' as item_type, e.id, e.expense_no as code, e.category as name, (e.amount_cents / 100.0) || ' TL' as brand, e.description as model, e.deleted_at
      FROM expenses e WHERE e.is_deleted = 1 ORDER BY e.deleted_at DESC
    `).all();

    // 4. Silinen Alışlar
    const purchases = db.prepare(`
      SELECT 'purchase' as item_type, p.id, p.invoice_no as code, (p.total_amount_cents / 100.0) || ' TL' as name, 'Alış Faturası' as brand, p.purchase_date as model, p.deleted_at
      FROM purchases p WHERE p.is_deleted = 1 ORDER BY p.deleted_at DESC
    `).all();

    // 5. Silinen Satışlar
    const sales = db.prepare(`
      SELECT 'sale' as item_type, s.id, s.invoice_no as code, (s.total_amount_cents / 100.0) || ' TL' as name, 'Satış Faturası' as brand, s.sale_date as model, s.deleted_at
      FROM sales s WHERE s.is_deleted = 1 ORDER BY s.deleted_at DESC
    `).all();

    const allItems = [...products, ...cariler, ...expenses, ...purchases, ...sales]
      .sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));

    res.json({ success: true, items: allItems });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/trash/restore - Restore soft deleted item
router.post('/restore', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) {
      return res.status(400).json({ success: false, message: 'Tip ve ID gereklidir.' });
    }

    if (type === 'product') {
      db.prepare('UPDATE products SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);
    } else if (type === 'cari') {
      db.prepare('UPDATE cariler SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);
      recalculateCariBalance(id);
    } else if (type === 'expense') {
      db.prepare('UPDATE expenses SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);
    } else if (type === 'purchase') {
      db.prepare('UPDATE purchases SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);
      db.prepare('UPDATE cari_transactions SET is_deleted = 0 WHERE ref_type = "purchases" AND ref_id = ?').run(id);
      const p = db.prepare('SELECT cari_id FROM purchases WHERE id = ?').get(id);
      if (p) recalculateCariBalance(p.cari_id);
    } else if (type === 'sale') {
      db.prepare('UPDATE sales SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);
      db.prepare('UPDATE cari_transactions SET is_deleted = 0 WHERE ref_type = "sales" AND ref_id = ?').run(id);
      // Mark products as sold again
      const items = db.prepare('SELECT product_id FROM sale_items WHERE sale_id = ?').all(id);
      for (const item of items) {
        db.prepare('UPDATE products SET status = "sold", sold_sale_id = ? WHERE id = ?').run(id, item.product_id);
      }
      const s = db.prepare('SELECT cari_id FROM sales WHERE id = ?').get(id);
      if (s) recalculateCariBalance(s.cari_id);
    } else {
      return res.status(400).json({ success: false, message: 'Geçersiz kayıt tipi.' });
    }

    logAudit(req.user.id, req.user.username, 'RESTORE', type, id, 'Çöp kutusundan geri yüklendi.', req);

    res.json({ success: true, message: 'Kayıt başarıyla geri yüklendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Geri yükleme hatası: ' + err.message });
  }
});

// Handler for purge
const handlePurge = (req, res) => {
  try {
    const type = req.body?.type || req.query?.type;
    const id = req.body?.id || req.query?.id;
    if (!type || !id) {
      return res.status(400).json({ success: false, message: 'Tip ve ID gereklidir.' });
    }

    if (type === 'product') {
      const { runInTransaction } = require('../db/connection');
      runInTransaction(() => {
        db.prepare('DELETE FROM purchase_items WHERE product_id = ?').run(id);
        db.prepare('DELETE FROM sale_items WHERE product_id = ?').run(id);
        db.prepare('DELETE FROM products WHERE id = ? AND is_deleted = 1').run(id);
      });
    } else if (type === 'cari') {
      const hasPurchases = db.prepare('SELECT 1 FROM purchases WHERE cari_id = ? LIMIT 1').get(id);
      const hasSales = db.prepare('SELECT 1 FROM sales WHERE cari_id = ? LIMIT 1').get(id);
      if (hasPurchases || hasSales) {
        return res.status(400).json({ 
          success: false, 
          message: 'Bu cari hesaba ait geçmiş faturalar bulunduğu için kalıcı silinemez; arşivde tutulmalıdır.' 
        });
      }
      const { runInTransaction } = require('../db/connection');
      runInTransaction(() => {
        db.prepare('DELETE FROM cari_transactions WHERE cari_id = ?').run(id);
        db.prepare('DELETE FROM payments WHERE cari_id = ?').run(id);
        db.prepare('DELETE FROM cariler WHERE id = ? AND is_deleted = 1').run(id);
      });
    } else if (type === 'expense') {
      db.prepare('DELETE FROM expenses WHERE id = ? AND is_deleted = 1').run(id);
    } else {
      return res.status(400).json({ success: false, message: 'Bu tür kayıtlar kalıcı silinemez, sadece arşivlenebilir.' });
    }

    logAudit(req.user.id, req.user.username, 'DELETE_PERMANENT', type, id, 'Kalıcı olarak silindi.', req);

    res.json({ success: true, message: 'Kayıt kalıcı olarak silindi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kalıcı silme hatası: ' + err.message });
  }
};

// DELETE & POST /api/trash/purge - Permanently delete item (Admin only)
router.delete('/purge', authenticateToken, requireAdmin, handlePurge);
router.post('/purge', authenticateToken, requireAdmin, handlePurge);

module.exports = router;
