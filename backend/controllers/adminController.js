const { query, queryOne } = require('../config/db');

const listUsers = async (req, res) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;
    const where = [];
    const vals = [];
    if (status) { where.push('status = ?'); vals.push(status); }
    if (role) { where.push('role = ?'); vals.push(role); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT id, email, first_name, last_name, role, status, created_at FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...vals, +limit, +offset]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await queryOne('SELECT id FROM users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await query('UPDATE users SET status="approved", approved_by=?, approved_at=NOW(), rejection_reason=NULL WHERE id=?', [req.user.id, id]);
    res.json({ success: true, message: 'User approved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason required' });
    const user = await queryOne('SELECT id FROM users WHERE id=?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await query('UPDATE users SET status="rejected", approved_by=?, approved_at=NOW(), rejection_reason=? WHERE id=?', [req.user.id, reason, id]);
    res.json({ success: true, message: 'User rejected' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE users SET status="suspended" WHERE id=?', [id]);
    res.json({ success: true, message: 'User suspended' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const analyticsOverview = async (req, res) => {
  try {
    const [userCounts, bookCounts, trxCounts] = await Promise.all([
      query(`SELECT role, status, COUNT(*) as count FROM users GROUP BY role, status`),
      query(`SELECT status, COUNT(*) as count FROM books GROUP BY status`),
      query(`SELECT status, COUNT(*) as count FROM transactions GROUP BY status`)
    ]);
    res.json({ success: true, data: { users: userCounts, books: bookCounts, transactions: trxCounts } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { listUsers, approveUser, rejectUser, suspendUser, analyticsOverview };