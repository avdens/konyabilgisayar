const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/users - List users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT id, username, full_name, role, is_active, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `).all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role = 'staff' } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı, şifre ve ad soyad zorunludur.' });
    }

    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Geçersiz rol.' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanımda.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `).run(username.trim(), hash, full_name.trim(), role);

    await logAudit(req.user.id, req.user.username, 'CREATE', 'user', result.lastInsertRowid, { username, role }, req);

    res.status(201).json({ success: true, message: 'Kullanıcı oluşturuldu.', userId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { full_name, role, is_active, password } = req.body;

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    // Do not deactivate only admin
    if (user.role === 'admin' && is_active === 0) {
      const adminCount = await db.prepare('SELECT count(*) as count FROM users WHERE role = ? AND is_active = 1').get('admin');
      if (adminCount.count <= 1) {
        return res.status(400).json({ success: false, message: 'Sistemdeki tek aktif yönetici pasife alınamaz.' });
      }
    }

    let passwordHash = user.password_hash;
    if (password && password.trim().length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password.trim(), salt);
    }

    await db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        role = COALESCE(?, role),
        is_active = COALESCE(?, is_active),
        password_hash = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      full_name ? full_name.trim() : null,
      role || null,
      is_active !== undefined ? Number(is_active) : null,
      passwordHash,
      id
    );

    await logAudit(req.user.id, req.user.username, 'UPDATE', 'user', id, { full_name, role, is_active }, req);

    res.json({ success: true, message: 'Kullanıcı bilgileri güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
