const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/db');
const { generateTokens, verifyToken } = require('../middleware/auth');
const crypto = require('crypto');

// Register new user (requires admin approval)
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'client' } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name and last name are required'
      });
    }

    // Check if email already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate role (only allow client and vendor registration)
    if (!['client', 'vendor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only client and vendor registration allowed'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user (status defaults to 'pending')
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [email.toLowerCase(), hashedPassword, firstName, lastName, phone, role]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Account pending admin approval.',
      data: {
        id: result.insertId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user from database
    const user = await queryOne(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Contact admin for assistance.'
      });
    }

    // Check if account is rejected
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Account registration was rejected.',
        rejectionReason: user.rejection_reason
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store session in database
    const sessionData = {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
      refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    };

    await query(
      `INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, expires_at, user_agent, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionData.userId, sessionData.tokenHash, sessionData.refreshTokenHash, 
       sessionData.expiresAt, sessionData.userAgent, sessionData.ipAddress]
    );

    // Return user info and tokens
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          profileImage: user.profile_image
        },
        accessToken,
        refreshToken,
        needsApproval: user.status === 'pending'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Check if session exists and is active
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await queryOne(
      'SELECT * FROM user_sessions WHERE refresh_token_hash = ? AND is_active = true AND expires_at > NOW()',
      [refreshTokenHash]
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get current user data
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

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update session with new tokens
    const newTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    
    await query(
      'UPDATE user_sessions SET token_hash = ?, refresh_token_hash = ? WHERE id = ?',
      [newTokenHash, newRefreshTokenHash, session.id]
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Deactivate session
      await query(
        'UPDATE user_sessions SET is_active = false WHERE token_hash = ?',
        [tokenHash]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, email, first_name, last_name, phone, role, status, profile_image, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profile_image,
        memberSince: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const updates = [];
    const values = [];

    if (firstName) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    values.push(req.user.id);
    
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile
};