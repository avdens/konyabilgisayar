const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pctakip.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for consistency and ACID compliance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

// Execute schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schemaSql);

/**
 * Execute a callback within an immediate transaction
 */
function runInTransaction(fn) {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Recalculates and updates the balance of a specific Cari
 * Positive balance = Bizim alacağımız var (Müşteri borçlu)
 * Negative balance = Bizim borcumuz var (Tedarikçiye borcumuz var)
 */
function recalculateCariBalance(cariId) {
  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(debt_cents), 0) AS total_debt,
      COALESCE(SUM(credit_cents), 0) AS total_credit
    FROM cari_transactions
    WHERE cari_id = ? AND is_deleted = 0
  `).get(cariId);

  const totalDebt = result ? Number(result.total_debt) : 0;
  const totalCredit = result ? Number(result.total_credit) : 0;
  const balance = totalDebt - totalCredit;

  db.prepare(`
    UPDATE cariler 
    SET balance_cents = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(balance, cariId);

  return balance;
}

/**
 * Logs an event to the audit trail
 */
function logAudit(userId, username, action, entityType, entityId, details, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.prepare(`
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
  recalculateCariBalance,
  runInTransaction,
  logAudit
};
