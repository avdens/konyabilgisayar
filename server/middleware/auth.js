const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'konya_bilgisayar_secure_jwt_secret_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Oturum süresi dolmuş veya geçersiz jeton.' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Bu işlemi yapmaya yetkiniz yok. Sadece Yöneticiler erişebilir.' 
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};
