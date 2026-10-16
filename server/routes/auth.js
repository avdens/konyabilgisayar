const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, logAudit } = require('../db/connection');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get company settings
    const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(s => { settings[s.key] = s.value; });

    await logAudit(user.id, user.username, 'LOGIN', 'user', user.id, 'Sisteme giriş yapıldı.', req);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      settings
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Giriş yapılırken sunucu hatası oluştu: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, username, full_name, role, is_active FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.is_active !== 1) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı veya pasif durumda.' });
    }

    const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(s => { settings[s.key] = s.value; });

    res.json({ success: true, user, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mevcut şifre ve yeni şifre gereklidir.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mevcut şifreniz hatalı.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now", "localtime") WHERE id = ?')
      .run(newHash, user.id);

    await logAudit(user.id, user.username, 'UPDATE', 'user', user.id, 'Şifre değiştirildi.', req);

    res.json({ success: true, message: 'Şifreniz başarıyla güncellendi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
