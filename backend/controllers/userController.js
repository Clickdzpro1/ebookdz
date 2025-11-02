const { query, queryOne } = require('../config/db');

const getPurchases = async (req, res) => {
  try {
    const purchases = await query(`
      SELECT 
        t.id, t.transaction_uuid, t.amount, t.status, t.created_at,
        b.id as book_id, b.title, b.author, b.cover_image
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      WHERE t.buyer_id = ? 
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: purchases });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getLibrary = async (req, res) => {
  try {
    const library = await query(`
      SELECT 
        up.download_count, up.last_downloaded_at, up.purchased_at,
        b.id, b.title, b.author, b.cover_image, b.file_path,
        t.transaction_uuid
      FROM user_purchases up
      JOIN books b ON up.book_id = b.id
      JOIN transactions t ON up.transaction_id = t.id
      WHERE up.user_id = ? AND t.status = 'completed'
      ORDER BY up.purchased_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: library });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const path = require('path');

const getUserStats = async (req, res) => {
  try {
    const [purchaseStats] = await query(`
      SELECT 
        COUNT(*) as total_purchases,
        COALESCE(SUM(amount), 0) as total_spent
      FROM transactions 
      WHERE buyer_id = ? AND status = 'completed'
    `, [req.user.id]);
    const [libraryCount] = await query(`
      SELECT COUNT(*) as books_owned 
      FROM user_purchases up
      JOIN transactions t ON up.transaction_id = t.id
      WHERE up.user_id = ? AND t.status = 'completed'
    `, [req.user.id]);
    res.json({ success: true, data: { ...purchaseStats, books_owned: libraryCount.books_owned } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const downloadBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const purchase = await queryOne(`
      SELECT b.file_path, b.title, up.id as purchase_id
      FROM user_purchases up
      JOIN books b ON up.book_id = b.id
      JOIN transactions t ON up.transaction_id = t.id
      WHERE up.user_id = ? AND b.id = ? AND t.status = 'completed'
    `, [req.user.id, bookId]);
    if (!purchase) return res.status(404).json({ success: false, message: 'Book not found in your library' });
    if (!purchase.file_path) return res.status(404).json({ success: false, message: 'Book file not available' });

    await query(`UPDATE user_purchases SET download_count = download_count + 1, last_downloaded_at = NOW() WHERE id = ?`, [purchase.purchase_id]);

    const baseDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
    const filePath = path.join(baseDir, purchase.file_path);
    res.download(filePath, `${purchase.title}.pdf`);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getPurchases, getLibrary, downloadBook, getUserStats };