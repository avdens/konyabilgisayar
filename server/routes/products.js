const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Multer storage configuration for product images (uses /tmp on serverless runtimes)
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem safeguard for serverless
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = 'prod_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece görsel formatları yüklenebilir (JPEG, PNG, WEBP vb.).'));
    }
  }
});

// POST /api/products/upload - Upload product photo
router.post('/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Görsel dosyası seçilmedi.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/search-quick - Fast lookup by Serial or IMEI or barcode
router.get('/search-quick', authenticateToken, async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) return res.json({ success: true, products: [] });

    const products = await db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        sup.name as supplier_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN cariler sup ON p.supplier_cari_id = sup.id
      WHERE p.is_deleted = 0 
        AND (
          p.serial_number LIKE ? 
          OR p.imei LIKE ? 
          OR p.product_code LIKE ?
          OR p.name LIKE ?
          OR p.model LIKE ?
        )
      LIMIT 15
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);

    const isAdmin = req.user.role === 'admin';
    const sanitized = products.map(p => ({
      ...p,
      images: JSON.parse(p.images_json || '[]'),
      purchase_price_cents: isAdmin ? p.purchase_price_cents : null
    }));

    res.json({ success: true, products: sanitized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products - List products with filter, search, and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      search,
      category_id,
      brand,
      status,
      condition,
      supplier_id,
      min_price,
      max_price,
      date_start,
      date_end,
      page = 1,
      limit = 25
    } = req.query;

    const isAdmin = req.user.role === 'admin';
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['p.is_deleted = 0'];
    let params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push(`(
        p.name LIKE ? 
        OR p.product_code LIKE ? 
        OR p.brand LIKE ? 
        OR p.model LIKE ? 
        OR p.serial_number LIKE ? 
        OR p.imei LIKE ?
        OR p.specs LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term);
    }

    if (category_id) {
      whereClauses.push('p.category_id = ?');
      params.push(category_id);
    }

    if (brand) {
      whereClauses.push('p.brand = ?');
      params.push(brand);
    }

    if (status) {
      whereClauses.push('p.status = ?');
      params.push(status);
    }

    if (condition) {
      whereClauses.push('p.condition = ?');
      params.push(condition);
    }

    if (supplier_id) {
      whereClauses.push('p.supplier_cari_id = ?');
      params.push(supplier_id);
    }

    if (min_price) {
      whereClauses.push('p.estimated_sale_price_cents >= ?');
      params.push(Math.round(Number(min_price) * 100));
    }

    if (max_price) {
      whereClauses.push('p.estimated_sale_price_cents <= ?');
      params.push(Math.round(Number(max_price) * 100));
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

    // Total count for pagination
    const countRow = await db.prepare(`
      SELECT COUNT(*) as total
      FROM products p
      WHERE ${whereSql}
    `).get(...params);

    const total = countRow ? countRow.total : 0;

    // Fetch page items
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        sup.name as supplier_name,
        cust.name as sold_customer_name,
        u.full_name as creator_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN cariler sup ON p.supplier_cari_id = sup.id
      LEFT JOIN cariler cust ON p.sold_cari_id = cust.id
      LEFT JOIN users u ON p.created_by_user_id = u.id
      WHERE ${whereSql}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    const products = await db.prepare(query).all(...params, Number(limit), Number(offset));

    const processed = products.map(p => ({
      ...p,
      images: JSON.parse(p.images_json || '[]'),
      purchase_price_cents: isAdmin ? p.purchase_price_cents : null
    }));

    res.json({
      success: true,
      products: processed,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/brands - List unique brands for filters
router.get('/meta/brands', authenticateToken, async (req, res) => {
  try {
    const brands = await db.prepare(`
      SELECT DISTINCT brand FROM products WHERE is_deleted = 0 AND brand IS NOT NULL AND brand != '' ORDER BY brand ASC
    `).all();
    res.json({ success: true, brands: brands.map(b => b.brand) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id - Single product detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        sup.name as supplier_name,
        sup.phone as supplier_phone,
        cust.name as sold_customer_name,
        cust.phone as sold_customer_phone,
        u.full_name as creator_name,
        s.invoice_no as sale_invoice_no
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN cariler sup ON p.supplier_cari_id = sup.id
      LEFT JOIN cariler cust ON p.sold_cari_id = cust.id
      LEFT JOIN users u ON p.created_by_user_id = u.id
      LEFT JOIN sales s ON p.sold_sale_id = s.id
      WHERE p.id = ? AND p.is_deleted = 0
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    const isAdmin = req.user.role === 'admin';
    product.images = JSON.parse(product.images_json || '[]');
    if (!isAdmin) {
      product.purchase_price_cents = null;
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products - Create new product
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      category_id,
      brand,
      model,
      serial_number,
      imei,
      condition = 'second_hand',
      cosmetic_grade,
      specs,
      description,
      purchase_price,
      estimated_sale_price,
      purchase_date,
      supplier_cari_id,
      status = 'in_stock',
      images = []
    } = req.body;

    if (!name || !category_id || !brand || !model) {
      return res.status(400).json({ success: false, message: 'Ürün adı, kategori, marka ve model zorunludur.' });
    }

    // Convert TL to cents (integer cents avoid float issues)
    const purchaseCents = Math.round((Number(purchase_price) || 0) * 100);
    const estSaleCents = Math.round((Number(estimated_sale_price) || 0) * 100);
    const pDate = purchase_date || new Date().toISOString().substring(0, 10);

    // Generate product code: URN-XXXX (guaranteed unique using max sequence)
    const maxRow = await db.prepare(`SELECT MAX(CAST(SUBSTR(product_code, 5) AS INTEGER)) as max_seq FROM products WHERE product_code LIKE 'URN-%'`).get();
    const nextNum = (((maxRow && maxRow.max_seq) ? maxRow.max_seq : 0) + 1).toString().padStart(4, '0');
    const productCode = `URN-${nextNum}`;

    const stmt = db.prepare(`
      INSERT INTO products (
        product_code, name, category_id, brand, model, serial_number, imei,
        condition, cosmetic_grade, specs, description, purchase_price_cents,
        estimated_sale_price_cents, purchase_date, supplier_cari_id, status,
        images_json, created_by_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const result = await stmt.run(
      productCode,
      name.trim(),
      category_id,
      brand.trim(),
      model.trim(),
      serial_number ? serial_number.trim() : null,
      imei ? imei.trim() : null,
      condition,
      cosmetic_grade || null,
      specs || null,
      description || null,
      purchaseCents,
      estSaleCents,
      pDate,
      supplier_cari_id ? Number(supplier_cari_id) : null,
      status,
      JSON.stringify(images),
      req.user.id
    );

    const newId = result.lastInsertRowid;

    await logAudit(req.user.id, req.user.username, 'CREATE', 'product', newId, {
      product_code: productCode,
      name,
      serial_number,
      imei
    }, req);

    res.status(201).json({
      success: true,
      message: 'Ürün başarıyla kaydedildi.',
      productId: newId,
      productCode
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Ürün kaydedilirken hata: ' + err.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    const {
      name,
      category_id,
      brand,
      model,
      serial_number,
      imei,
      condition,
      cosmetic_grade,
      specs,
      description,
      purchase_price,
      estimated_sale_price,
      purchase_date,
      supplier_cari_id,
      status,
      images
    } = req.body;

    const isAdmin = req.user.role === 'admin';
    const purchaseCents = isAdmin && purchase_price !== undefined
      ? Math.round(Number(purchase_price) * 100)
      : existing.purchase_price_cents;

    const estSaleCents = estimated_sale_price !== undefined
      ? Math.round(Number(estimated_sale_price) * 100)
      : existing.estimated_sale_price_cents;

    const stmt = db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        brand = COALESCE(?, brand),
        model = COALESCE(?, model),
        serial_number = ?,
        imei = ?,
        condition = COALESCE(?, condition),
        cosmetic_grade = ?,
        specs = ?,
        description = ?,
        purchase_price_cents = ?,
        estimated_sale_price_cents = ?,
        purchase_date = COALESCE(?, purchase_date),
        supplier_cari_id = ?,
        status = COALESCE(?, status),
        images_json = COALESCE(?, images_json),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    await stmt.run(
      name ? name.trim() : null,
      category_id || null,
      brand ? brand.trim() : null,
      model ? model.trim() : null,
      serial_number !== undefined ? (serial_number ? serial_number.trim() : null) : existing.serial_number,
      imei !== undefined ? (imei ? imei.trim() : null) : existing.imei,
      condition || null,
      cosmetic_grade !== undefined ? cosmetic_grade : existing.cosmetic_grade,
      specs !== undefined ? specs : existing.specs,
      description !== undefined ? description : existing.description,
      purchaseCents,
      estSaleCents,
      purchase_date || null,
      supplier_cari_id !== undefined ? (supplier_cari_id ? Number(supplier_cari_id) : null) : existing.supplier_cari_id,
      status || null,
      images ? JSON.stringify(images) : null,
      id
    );

    await logAudit(req.user.id, req.user.username, 'UPDATE', 'product', id, { name, model, status }, req);

    res.json({ success: true, message: 'Ürün bilgileri güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id - Soft delete product (Trash bin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
    }

    if (existing.status === 'sold') {
      return res.status(400).json({ 
        success: false, 
        message: 'Satılmış olan ürün silinemez. Önce ilgili satış kaydını iptal etmelisiniz.' 
      });
    }

    await db.prepare(`
      UPDATE products 
      SET is_deleted = 1, deleted_at = datetime('now', 'localtime') 
      WHERE id = ?
    `).run(id);

    await logAudit(req.user.id, req.user.username, 'DELETE', 'product', id, {
      product_code: existing.product_code,
      name: existing.name
    }, req);

    res.json({ success: true, message: 'Ürün çöp kutusuna taşındı.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
