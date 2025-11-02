const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}_${safe}`);
  },
});

const fileFilter = (allowedList) => (req, file, cb) => {
  const ext = (path.extname(file.originalname) || '').replace('.', '').toLowerCase();
  const allowed = (allowedList || '').split(',').map(s => s.trim().toLowerCase());
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error(`File type not allowed: .${ext}`));
};

const uploadImage = multer({ storage, limits: { fileSize: maxSize }, fileFilter: fileFilter(process.env.ALLOWED_IMAGE_TYPES || 'jpeg,jpg,png,webp') });
const uploadBook = multer({ storage, limits: { fileSize: maxSize }, fileFilter: fileFilter(process.env.ALLOWED_BOOK_TYPES || 'pdf,epub,mobi') });

module.exports = { uploadImage, uploadBook, UPLOAD_DIR };