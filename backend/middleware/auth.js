const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await db.query(
      'SELECT user_id, email, full_name, role, status FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || users[0].status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

// Check if user is vendor
const isVendor = (req, res, next) => {
  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor privileges required.'
    });
  }
  next();
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  isVendor,
  isAdmin
};
