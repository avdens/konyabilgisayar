const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/expenses - List expenses with filters & summary
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, date_start, date_end, search, page = 1, limit = 25 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['e.is_deleted = 0'];
    let params = [];

    if (category && category !== 'all') {
      whereClauses.push('e.category = ?');
      params.push(category);
    }

    if (date_start) {
      whereClauses.push('e.date >= ?');
      params.push(date_start);
    }

    if (date_end) {
      whereClauses.push('e.date <= ?');
      params.push(date_end);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(e.expense_no LIKE ? OR e.description LIKE ? OR e.category LIKE ?)');
      params.push(term, term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    const countRow = await db.prepare(`SELECT COUNT(*) as total FROM expenses e WHERE ${whereSql}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const expenses = await db.prepare(`
      SELECT 
        e.*,
        u.full_name as user_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE ${whereSql}
      ORDER BY e.date DESC, e.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset));

    // Summary by category and total
    const totalAmount = await db.prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) as total_amount FROM expenses e WHERE ${whereSql}
    `).get(...params);

    const categoryBreakdown = await db.prepare(`
      SELECT category, COALESCE(SUM(amount_cents), 0) as total_amount, COUNT(*) as count
      FROM expenses e
      WHERE ${whereSql}
      GROUP BY category
      ORDER BY total_amount DESC
    `).all(...params);

    res.json({
      success: true,
      expenses,
      summary: {
        totalAmountCents: totalAmount ? Number(totalAmount.total_amount) : 0,
        categoryBreakdown
      },
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

// POST /api/expenses - Create expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      category,
      amount,
      date,
      payment_method = 'nakit',
      description
    } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Masraf kategorisi zorunludur.' });
    }

    const amountCents = Math.round((Number(amount) || 0) * 100);
    if (amountCents <= 0) {
      return res.status(400).json({ success: false, message: 'Masraf tutarı 0\'dan büyük olmalıdır.' });
    }

    const expDate = date || new Date().toISOString().substring(0, 10);

    // Generate Expense No: MSF-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const last = await db.prepare('SELECT expense_no FROM expenses WHERE expense_no LIKE ? ORDER BY id DESC LIMIT 1').get(`MSF-${currentYear}-%`);
    let nextSeq = 1;
    if (last && last.expense_no) {
      const parts = last.expense_no.split('-');
      if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
    }
    const expenseNo = `MSF-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;

    const insert = db.prepare(`
      INSERT INTO expenses (expense_no, category, amount_cents, date, payment_method, description, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const result = await insert.run(
      expenseNo,
      category.trim(),
      amountCents,
      expDate,
      payment_method,
      description || null,
      req.user.id
    );

    const expenseId = result.lastInsertRowid;

    await logAudit(req.user.id, req.user.username, 'CREATE', 'expense', expenseId, {
      expense_no: expenseNo,
      category,
      amount_cents: amountCents,
      date: expDate
    }, req);

    res.status(201).json({
      success: true,
      message: `${expenseNo} numaralı masraf kaydı eklendi.`,
      expenseId,
      expenseNo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Masraf kaydedilirken hata: ' + err.message });
  }
});

// DELETE /api/expenses/:id - Soft delete expense
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const expense = await db.prepare('SELECT * FROM expenses WHERE id = ? AND is_deleted = 0').get(id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Masraf kaydı bulunamadı.' });
    }

    await db.prepare('UPDATE expenses SET is_deleted = 1, deleted_at = datetime("now", "localtime") WHERE id = ?').run(id);

    await logAudit(req.user.id, req.user.username, 'DELETE', 'expense', id, {
      expense_no: expense.expense_no,
      category: expense.category,
      amount_cents: expense.amount_cents
    }, req);

    res.json({ success: true, message: 'Masraf kaydı silindi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
