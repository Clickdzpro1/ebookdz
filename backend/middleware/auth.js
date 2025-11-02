const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/db');
const { hasPermission, needsApproval } = require('../config/permissions');

// Generate JWT tokens
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });

  const refreshToken = jwt.sign(
    { id: user.id }, 
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Verify JWT token
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    // Get user from database to ensure they still exist and status is current
    const user = await queryOne(
      'SELECT * FROM users WHERE id = ? AND status != ?',
      [decoded.id, 'suspended']
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or suspended'
      });
    }

    // Update user info in token if status changed
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.first_name,
      lastName: user.last_name
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

// Optional authentication (for public endpoints that work better with user info)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      const user = await queryOne(
        'SELECT * FROM users WHERE id = ? AND status != ?',
        [decoded.id, 'suspended']
      );

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          firstName: user.first_name,
          lastName: user.last_name
        };
      }
    }
    next();
  } catch (error) {
    // Continue without user info if token is invalid
    next();
  }
};

// Authorization middleware for role and permission checking
const authorize = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user needs approval (except for reading profile)
    if (needsApproval(req.user.status) && !(resource === 'profile' && action === 'read')) {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval by admin'
      });
    }

    // Check permissions
    if (!hasPermission(req.user.role, resource, action)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Require specific role
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for your role'
      });
    }

    next();
  };
};

// Require approved status
const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Account must be approved by admin'
    });
  }

  next();
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Vendor or Admin middleware
const vendorOrAdmin = (req, res, next) => {
  if (!req.user || !['vendor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Vendor or admin access required'
    });
  }
  next();
};

module.exports = {
  generateTokens,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  requireRole,
  requireApproved,
  adminOnly,
  vendorOrAdmin
};