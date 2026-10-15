const express = require('express');
const router = express.Router();
const fs = require('fs');
const { db, dbPath, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/settings - Get settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, description FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
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
      upsert.run(key, String(val));
    }

    logAudit(req.user.id, req.user.username, 'UPDATE', 'settings', null, settings, req);

    res.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/backup/download - Download SQLite DB backup file
router.get('/backup/download', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Checkpoint WAL before backing up to make sure all data is flushed to main file
    db.exec('PRAGMA wal_checkpoint(FULL);');

    const filename = `KonyaBilgisayar_Yedek_${new Date().toISOString().substring(0, 10)}.db`;
    res.download(dbPath, filename, (err) => {
      if (err) {
        console.error('Backup download error:', err);
      } else {
        logAudit(req.user.id, req.user.username, 'BACKUP', 'system', null, 'Veritabanı yedeği indirildi.', req);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Yedek alınamadı: ' + err.message });
  }
});

// GET /api/settings/backup/json - Export all system data as JSON
router.get('/backup/json', authenticateToken, requireAdmin, (req, res) => {
  try {
    const backupData = {
      exportDate: new Date().toISOString(),
      company: 'KONYA BİLGİSAYAR',
      version: '1.0.0',
      settings: db.prepare('SELECT * FROM settings').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      cariler: db.prepare('SELECT * FROM cariler').all(),
      products: db.prepare('SELECT * FROM products').all(),
      purchases: db.prepare('SELECT * FROM purchases').all(),
      purchase_items: db.prepare('SELECT * FROM purchase_items').all(),
      sales: db.prepare('SELECT * FROM sales').all(),
      sale_items: db.prepare('SELECT * FROM sale_items').all(),
      cari_transactions: db.prepare('SELECT * FROM cari_transactions').all(),
      payments: db.prepare('SELECT * FROM payments').all(),
      expenses: db.prepare('SELECT * FROM expenses').all()
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
