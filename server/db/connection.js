try { require('dotenv').config(); } catch (e) {}
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('node:async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isPg = Boolean(connectionString);

let pool = null;
let sqliteDb = null;
let dbPath = null;
let pgInitialized = false;
let pgInitPromise = null;

if (isPg) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000
  });
  console.log('[Database] Connecting to PostgreSQL (Vercel Postgres / Neon)...');
} else if (process.env.VERCEL) {
  console.warn('[Database] POSTGRES_URL not found on Vercel environment. Attempting fallback...');
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dataDir = '/tmp';
    dbPath = path.join(dataDir, 'pctakip.db');
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
    sqliteDb.exec("PRAGMA foreign_keys = ON;");
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    sqliteDb.exec(schemaSql);
    console.log('[Database] Initialized temporary SQLite database in /tmp for Vercel');
  } catch (err) {
    console.error('[Database WARNING] SQLite unavailable on Vercel serverless runtime:', err.message);
  }
} else {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'pctakip.db');
    sqliteDb = new DatabaseSync(dbPath);

    // Enable WAL mode & foreign keys for consistency and ACID compliance
    sqliteDb.exec("PRAGMA journal_mode = WAL;");
    sqliteDb.exec("PRAGMA foreign_keys = ON;");
    sqliteDb.exec("PRAGMA busy_timeout = 5000;");

    // Execute SQLite schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    sqliteDb.exec(schemaSql);
    console.log('[Database] Using local SQLite database (pctakip.db)');
  } catch (err) {
    console.error('[Database] Failed to open local SQLite database:', err.message);
  }
}

/**
 * Convert SQLite ? parameters to PostgreSQL $1, $2 and date/time functions
 */
function toPgSql(sql) {
  let i = 0;
  let converted = sql.replace(/\?/g, () => `$${++i}`);
  // Replace SQLite datetime('now', 'localtime') with CURRENT_TIMESTAMP
  converted = converted.replace(/datetime\(['"]now['"],?\s*['"]localtime['"]?\)/gi, 'CURRENT_TIMESTAMP');
  converted = converted.replace(/datetime\(['"]now['"]\)/gi, 'CURRENT_TIMESTAMP');
  return converted;
}

/**
 * Automatically creates tables and runs seed if PostgreSQL is brand new
 */
async function ensurePgReady() {
  if (!isPg || pgInitialized) return;
  if (!pgInitPromise) {
    pgInitPromise = (async () => {
      try {
        const res = await pool.query("SELECT to_regclass('public.users') AS tbl;");
        if (!res.rows[0] || !res.rows[0].tbl) {
          console.log('[PostgreSQL] Initializing tables from schema.pg.sql...');
          const schemaPg = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8');
          await pool.query(schemaPg);
          console.log('[PostgreSQL] Tables created successfully.');

          // Run initial seed data
          const { seedDatabase } = require('./seed');
          await seedDatabase();
          console.log('[PostgreSQL] Seed data loaded successfully.');
        }
        pgInitialized = true;
      } catch (err) {
        console.error('[PostgreSQL] Error checking/initializing schema:', err.message);
      } finally {
        pgInitPromise = null;
      }
    })();
  }
  await pgInitPromise;
}

/**
 * Unified db interface supporting both PostgreSQL (Vercel) and SQLite (Local)
 */
const db = {
  prepare(sql) {
    if (isPg) {
      return {
        async all(...params) {
          await ensurePgReady();
          const client = asyncLocalStorage.getStore() || pool;
          const pgSql = toPgSql(sql);
          const flatParams = params.flat ? params.flat() : params;
          const res = await client.query(pgSql, flatParams);
          return res.rows || [];
        },
        async get(...params) {
          await ensurePgReady();
          const client = asyncLocalStorage.getStore() || pool;
          const pgSql = toPgSql(sql);
          const flatParams = params.flat ? params.flat() : params;
          const res = await client.query(pgSql, flatParams);
          return (res.rows && res.rows[0]) ? res.rows[0] : null;
        },
        async run(...params) {
          await ensurePgReady();
          const client = asyncLocalStorage.getStore() || pool;
          let pgSql = toPgSql(sql);
          const isInsert = /^\s*INSERT\s+INTO\b/i.test(pgSql);
          const hasReturning = /\bRETURNING\b/i.test(pgSql);
          const isSettings = /\bINTO\s+settings\b/i.test(pgSql);
          if (isInsert && !hasReturning && !isSettings) {
            pgSql += ' RETURNING id';
          }
          const flatParams = params.flat ? params.flat() : params;
          const res = await client.query(pgSql, flatParams);
          return {
            lastInsertRowid: (res.rows && res.rows[0]) ? res.rows[0].id : null,
            changes: res.rowCount || 0
          };
        }
      };
    } else if (sqliteDb) {
      const stmt = sqliteDb.prepare(sql);
      return {
        all(...params) { return stmt.all(...params); },
        get(...params) { return stmt.get(...params); },
        run(...params) { return stmt.run(...params); }
      };
    } else {
      throw new Error('Veritabanı bağlantısı henüz kurulmadı. Lütfen Vercel panelinizden Storage sekmesine girip Postgres (Neon) veritabanı ekleyin.');
    }
  },
  exec(sql) {
    if (isPg) {
      return pool.query(toPgSql(sql));
    } else if (sqliteDb) {
      return sqliteDb.exec(sql);
    } else {
      throw new Error('Veritabanı bağlantısı henüz kurulmadı.');
    }
  }
};

/**
 * Execute a callback within a transaction (works in both PG and SQLite)
 */
async function runInTransaction(fn) {
  if (isPg) {
    await ensurePgReady();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await asyncLocalStorage.run(client, async () => {
        return await fn();
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else if (sqliteDb) {
    sqliteDb.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = await fn();
      sqliteDb.exec('COMMIT;');
      return result;
    } catch (err) {
      sqliteDb.exec('ROLLBACK;');
      throw err;
    }
  } else {
    throw new Error('Veritabanı bağlantısı henüz kurulmadı.');
  }
}

/**
 * Recalculates and updates the balance of a specific Cari
 */
async function recalculateCariBalance(cariId) {
  const result = await db.prepare(`
    SELECT 
      COALESCE(SUM(debt_cents), 0) AS total_debt,
      COALESCE(SUM(credit_cents), 0) AS total_credit
    FROM cari_transactions
    WHERE cari_id = ? AND is_deleted = 0
  `).get(cariId);

  const totalDebt = result ? Number(result.total_debt) : 0;
  const totalCredit = result ? Number(result.total_credit) : 0;
  const balance = totalDebt - totalCredit;

  await db.prepare(`
    UPDATE cariler 
    SET balance_cents = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(balance, cariId);

  return balance;
}

/**
 * Logs an event to the audit trail
 */
async function logAudit(userId, username, action, entityType, entityId, details, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    await db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details_json, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      userId || null,
      username || 'Sistem',
      action,
      entityType,
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : (details || ''),
      String(ip)
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = {
  db,
  dbPath,
  isPg,
  pool,
  recalculateCariBalance,
  runInTransaction,
  logAudit,
  ensurePgReady
};
