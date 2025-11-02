const express = require('express');
const { authenticate, authorize, requireApproved } = require('../middleware/auth');
const { listBooks, getBook, createBook, updateBook, deleteBook, approveBook, rejectBook, uploadCover, uploadFile } = require('../controllers/bookController');
const { uploadImage, uploadBook } = require('../middleware/upload');

const router = express.Router();

router.get('/', listBooks);
router.get('/:id', getBook);

router.post('/', authenticate, requireApproved, (req, res, next) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Vendor or admin access required' });
  next();
}, createBook);

router.put('/:id', authenticate, requireApproved, (req, res, next) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Vendor or admin access required' });
  next();
}, updateBook);

router.delete('/:id', authenticate, requireApproved, (req, res, next) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Vendor or admin access required' });
  next();
}, deleteBook);

router.patch('/:id/approve', authenticate, authorize('books', 'update'), approveBook);
router.patch('/:id/reject', authenticate, authorize('books', 'update'), rejectBook);

router.post('/:id/cover', authenticate, requireApproved, (req, res, next) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Vendor or admin access required' });
  next();
}, uploadImage.single('cover'), uploadCover);

router.post('/:id/file', authenticate, requireApproved, (req, res, next) => {
  if (!['vendor', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Vendor or admin access required' });
  next();
}, uploadBook.single('file'), uploadFile);

module.exports = router;