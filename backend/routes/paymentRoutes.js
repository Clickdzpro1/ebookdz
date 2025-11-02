const express = require('express');
const { authenticate, authorize, requireApproved } = require('../middleware/auth');
const { getConfig, upsertConfig, testConfig, checkout, webhook } = require('../controllers/paymentController');

const router = express.Router();

router.get('/config', authenticate, authorize('slickpay', 'read'), getConfig);
router.post('/config', authenticate, authorize('slickpay', 'update'), upsertConfig);
router.post('/config/test', authenticate, authorize('slickpay', 'read'), testConfig);

router.post('/checkout', authenticate, requireApproved, authorize('transactions', 'read'), checkout);

router.get('/webhook', (req, res) => res.json({ success: true }));
router.post('/webhook', express.json({ verify: (req, res, buf) => (req.rawBody = buf.toString()) }), webhook);

module.exports = router;