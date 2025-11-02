const { query, queryOne } = require('../config/db');

const listBooks = async (req, res) => {
  try {
    const { q, categoryId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE status="approved"';
    if (categoryId) { where += ' AND category_id=?'; params.push(categoryId); }
    if (q) { where += ' AND MATCH(title, author, description) AGAINST(? IN NATURAL LANGUAGE MODE)'; params.push(q); }
    const rows = await query(`SELECT id, title, author, price, cover_image FROM books ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, +limit, +offset]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBook = async (req, res) => {
  try {
    const b = await queryOne('SELECT * FROM books WHERE id=? AND status="approved"', [req.params.id]);
    if (!b) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, data: b });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createBook = async (req, res) => {
  try {
    const { title, author, price, description, categoryId, language = 'ar' } = req.body;
    if (!title || !author || !price) return res.status(400).json({ success: false, message: 'title, author, price required' });
    const result = await query('INSERT INTO books (vendor_id, title, author, price, description, category_id, language, status) VALUES (?,?,?,?,?,?,?, "pending")', [req.user.id, title, author, price, description || null, categoryId || null, language]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateBook = async (req, res) => {
  try {
    const book = await queryOne('SELECT * FROM books WHERE id=?', [req.params.id]);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== book.vendor_id) return res.status(403).json({ success: false, message: 'Forbidden' });

    const fields = ['title', 'author', 'price', 'description', 'category_id', 'language'];
    const updates = [];
    const vals = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); vals.push(req.body[f]); }
    });
    if (!updates.length) return res.status(400).json({ success: false, message: 'No updates' });

    vals.push(req.params.id);
    await query(`UPDATE books SET ${updates.join(', ')} WHERE id=?`, vals);
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await queryOne('SELECT * FROM books WHERE id=?', [req.params.id]);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== book.vendor_id) return res.status(403).json({ success: false, message: 'Forbidden' });
    await query('DELETE FROM books WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const approveBook = async (req, res) => {
  try {
    await query('UPDATE books SET status="approved", approved_by=?, approved_at=NOW(), rejection_reason=NULL WHERE id=?', [req.user.id, req.params.id]);
    res.json({ success: true, message: 'Book approved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const rejectBook = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
    await query('UPDATE books SET status="rejected", approved_by=?, approved_at=NOW(), rejection_reason=? WHERE id=?', [req.user.id, reason, req.params.id]);
    res.json({ success: true, message: 'Book rejected' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const uploadCover = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'cover file required' });
    const book = await queryOne('SELECT * FROM books WHERE id=?', [req.params.id]);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== book.vendor_id) return res.status(403).json({ success: false, message: 'Forbidden' });
    await query('UPDATE books SET cover_image=? WHERE id=?', [req.file.filename, req.params.id]);
    res.json({ success: true, message: 'Cover uploaded', file: req.file.filename });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'book file required' });
    const book = await queryOne('SELECT * FROM books WHERE id=?', [req.params.id]);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role !== 'admin' && req.user.id !== book.vendor_id) return res.status(403).json({ success: false, message: 'Forbidden' });
    await query('UPDATE books SET file_path=?, file_size=? WHERE id=?', [req.file.filename, req.file.size, req.params.id]);
    res.json({ success: true, message: 'Book file uploaded', file: req.file.filename });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook, approveBook, rejectBook, uploadCover, uploadFile };