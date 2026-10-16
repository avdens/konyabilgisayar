try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { seedDatabase } = require('./db/seed');

// Run seed on local development if database is new
if (!process.env.VERCEL) {
  seedDatabase().catch(err => {
    console.log('[Seed] Info:', err.message);
  });
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static directory for uploaded images (uses /tmp on serverless)
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    // Read-only filesystem in some serverless runtimes
  }
}
app.use(['/api/uploads', '/uploads'], express.static(uploadsDir));

// URL normalizer for Vercel serverless functions
app.use((req, res, next) => {
  if (req.query && req.query.path && !req.url.startsWith('/api/')) {
    req.url = '/api/' + req.query.path;
  }
  next();
});

// Health check endpoint
app.get(['/api/health', '/health', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    store: 'KONYA BİLGİSAYAR',
    system: 'Stok + Alım/Satım + Cari Hesap Yönetim Sistemi',
    db_mode: process.env.POSTGRES_URL ? 'PostgreSQL (Vercel/Neon)' : 'SQLite (Local)',
    time: new Date().toISOString()
  });
});

// Register all API routes on both /api/<prefix> and /<prefix> for 100% routing resilience
const routes = [
  ['/auth', require('./routes/auth')],
  ['/dashboard', require('./routes/dashboard')],
  ['/products', require('./routes/products')],
  ['/categories', require('./routes/categories')],
  ['/cariler', require('./routes/cariler')],
  ['/purchases', require('./routes/purchases')],
  ['/sales', require('./routes/sales')],
  ['/payments', require('./routes/payments')],
  ['/expenses', require('./routes/expenses')],
  ['/reports', require('./routes/reports')],
  ['/users', require('./routes/users')],
  ['/trash', require('./routes/trash')],
  ['/audit', require('./routes/audit')],
  ['/settings', require('./routes/settings')]
];

for (const [routePath, handler] of routes) {
  app.use(`/api${routePath}`, handler);
  app.use(routePath, handler);
}

// Serve frontend build ONLY if NOT in Vercel serverless environment
// (On Vercel, static assets and SPA rewrites are handled by Vercel CDN directly from dist/)
if (!process.env.VERCEL) {
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
}

// 404 handler for API requests
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API uç noktası bulunamadı: [${req.method}] ${req.originalUrl || req.url}`
  });
});

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
