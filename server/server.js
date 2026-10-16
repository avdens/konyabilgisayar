const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { seedDatabase } = require('./db/seed');

// Run seed if database is new
seedDatabase().catch(err => {
  console.error('Seed check failed:', err.message);
});

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static directory for uploaded images (ephemeral on serverless)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    // Read-only filesystem in some serverless runtimes
  }
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cariler', require('./routes/cariler'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/trash', require('./routes/trash'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/settings', require('./routes/settings'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'KONYA BİLGİSAYAR',
    system: 'Stok + Alım/Satım + Cari Hesap Yönetim Sistemi',
    db_mode: process.env.POSTGRES_URL ? 'PostgreSQL (Vercel/Neon)' : 'SQLite (Local)',
    time: new Date().toISOString()
  });
});

// Serve frontend build if present (for single port local development or monolithic serving)
const distCandidates = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../client/dist')
];
const clientDist = distCandidates.find(d => fs.existsSync(d));
if (clientDist) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Sunucu içi beklenmeyen hata oluştu.'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  KONYA BİLGİSAYAR - STOK & CARİ YÖNETİM SİSTEMİ   `);
    console.log(`  Sunucu aktif: http://localhost:${PORT}          `);
    console.log(`  API Uç Noktası: http://localhost:${PORT}/api/health `);
    console.log(`====================================================`);
  });
}

module.exports = app;
