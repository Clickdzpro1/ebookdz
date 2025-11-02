const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { listUsers, approveUser, rejectUser, suspendUser, analyticsOverview } = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, adminOnly);

router.get('/users', listUsers);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/reject', rejectUser);
router.patch('/users/:id/suspend', suspendUser);
router.get('/analytics/overview', analyticsOverview);

module.exports = router;