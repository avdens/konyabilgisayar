const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/categories - List all categories with product count
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT 
        c.*,
        COUNT(CASE WHEN p.status = 'in_stock' AND p.is_deleted = 0 THEN 1 END) as in_stock_count,
        COUNT(CASE WHEN p.is_deleted = 0 THEN 1 END) as total_products_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/categories - Create new category
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, icon = 'folder' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Kategori adı gereklidir.' });
    }

    const slug = name.trim().toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const result = await db.prepare(`
      INSERT INTO categories (name, slug, icon, created_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `).run(name.trim(), slug, icon);

    await logAudit(req.user.id, req.user.username, 'CREATE', 'category', result.lastInsertRowid, { name }, req);

    res.status(201).json({ success: true, message: 'Kategori başarıyla eklendi.', categoryId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kategori eklenirken hata: ' + err.message });
  }
});

module.exports = router;
