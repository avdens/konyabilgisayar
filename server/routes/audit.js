const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/audit - List audit logs (Admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { action, entity_type, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['1=1'];
    let params = [];

    if (action && action !== 'all') {
      whereClauses.push('action = ?');
      params.push(action);
    }

    if (entity_type && entity_type !== 'all') {
      whereClauses.push('entity_type = ?');
      params.push(entity_type);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(username LIKE ? OR details_json LIKE ? OR ip_address LIKE ?)');
      params.push(term, term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereSql}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const logs = db.prepare(`
      SELECT *
      FROM audit_logs
      WHERE ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
