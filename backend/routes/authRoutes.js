const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, authorize('profile', 'read'), getProfile);
router.put('/profile', authenticate, authorize('profile', 'update'), updateProfile);

// Check authentication status
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        status: req.user.status
      }
    }
  });
});

module.exports = router;