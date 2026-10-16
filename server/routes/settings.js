const express = require('express');
const router = express.Router();
const fs = require('fs');
const { db, dbPath, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/settings - Get settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value, description FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Geçersiz ayar verisi.' });
    }

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, description)
      VALUES (?, ?, '')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, val] of Object.entries(settings)) {
      await upsert.run(key, String(val));
    }

    await logAudit(req.user.id, req.user.username, 'UPDATE', 'settings', null, settings, req);

    res.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/backup/download - Download DB backup file
router.get('/backup/download', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isPg } = require('../db/connection');
    if (isPg || !dbPath || !fs.existsSync(dbPath)) {
      // In PostgreSQL mode on Vercel, generate full JSON export
      return res.redirect('/api/settings/backup/json');
    }

    // Checkpoint WAL before backing up to make sure all data is flushed to main file
    await db.exec('PRAGMA wal_checkpoint(FULL);');

    const filename = `KonyaBilgisayar_Yedek_${new Date().toISOString().substring(0, 10)}.db`;
    res.download(dbPath, filename, async (err) => {
      if (err) {
        console.error('Backup download error:', err);
      } else {
        await logAudit(req.user.id, req.user.username, 'BACKUP', 'system', null, 'Veritabanı yedeği indirildi.', req);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Yedek alınamadı: ' + err.message });
  }
});

// GET /api/settings/backup/json - Export all system data as JSON
router.get('/backup/json', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backupData = {
      exportDate: new Date().toISOString(),
      company: 'KONYA BİLGİSAYAR',
      version: '1.0.0',
      settings: await db.prepare('SELECT * FROM settings').all(),
      categories: await db.prepare('SELECT * FROM categories').all(),
      cariler: await db.prepare('SELECT * FROM cariler').all(),
      products: await db.prepare('SELECT * FROM products').all(),
      purchases: await db.prepare('SELECT * FROM purchases').all(),
      purchase_items: await db.prepare('SELECT * FROM purchase_items').all(),
      sales: await db.prepare('SELECT * FROM sales').all(),
      sale_items: await db.prepare('SELECT * FROM sale_items').all(),
      cari_transactions: await db.prepare('SELECT * FROM cari_transactions').all(),
      payments: await db.prepare('SELECT * FROM payments').all(),
      expenses: await db.prepare('SELECT * FROM expenses').all()
    };

    const filename = `KonyaBilgisayar_JSON_Yedek_${new Date().toISOString().substring(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: 'JSON yedeği alınamadı: ' + err.message });
  }
});

module.exports = router;
