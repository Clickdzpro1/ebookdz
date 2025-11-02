const express = require('express');
const { authenticate, authorize, requireApproved } = require('../middleware/auth');
const { getPurchases, getLibrary, downloadBook, getUserStats } = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/purchases', authorize('transactions', 'read'), getPurchases);
router.get('/library', requireApproved, authorize('purchases', 'read'), getLibrary);
router.get('/download/:bookId', requireApproved, authorize('downloads', 'read'), downloadBook);
router.get('/stats', authorize('profile', 'read'), getUserStats);

module.exports = router;