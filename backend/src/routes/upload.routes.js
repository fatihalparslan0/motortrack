const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth.middleware');
const { success, error } = require('../utils/apiResponse');

// Uploads klasörünü garantiye al
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece görsel dosyaları yüklenebilir.'), false);
    }
  },
});

// Multipart form-data ile dosya yükleme
router.post('/', authenticate, upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'Yüklenecek görsel bulunamadı.', 400);
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return success(res, { url: fileUrl, filename: req.file.filename, size: req.file.size }, 'Fotoğraf başarıyla yüklendi.', 201);
  } catch (err) {
    next(err);
  }
});

// Base64 doğrudan görsel yükleme (mobil için son derece pratik)
router.post('/base64', authenticate, (req, res, next) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) {
      return error(res, 'Base64 görsel verisi bulunamadı.', 400);
    }

    // data:image/png;base64,.... formatını ayrıştır
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    let ext = '.jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('gif')) ext = '.gif';
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(base64, 'base64');
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fname = filename ? `${uniqueSuffix}-${filename}` : `img-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fname);

    fs.writeFileSync(filePath, imageBuffer);
    const fileUrl = `/uploads/${fname}`;

    return success(res, { url: fileUrl, filename: fname, size: imageBuffer.length }, 'Fotoğraf başarıyla kaydedildi.', 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
