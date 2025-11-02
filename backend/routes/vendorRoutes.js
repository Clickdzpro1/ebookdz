const express = require('express');
const { authenticate, requireApproved, requireRole } = require('../middleware/auth');
const { getVendorBooks, getAnalytics, getTransactions } = require('../controllers/vendorController');

const router = express.Router();

router.use(authenticate, requireApproved, requireRole(['vendor', 'admin']));

router.get('/books', getVendorBooks);
router.get('/analytics', getAnalytics);
router.get('/transactions', getTransactions);

module.exports = router;