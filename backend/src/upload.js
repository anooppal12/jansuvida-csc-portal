const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireCustomer } = require('./auth-middleware');

const router = express.Router();
const allowedTypes = new Set(['aadhaar','pan','bank_passbook','photo','address_proof','other']);
const allowedMime = new Set(['application/pdf','image/jpeg','image/png']);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => cb(null, allowedMime.has(file.mimetype))
});

module.exports = (pool) => {
  router.post('/upload', requireCustomer, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Valid PDF, JPG or PNG file is required' });
    try {
      const applicationId = Number(req.body.applicationId);
      const type = String(req.body.type || '').trim();
      if (!Number.isInteger(applicationId) || applicationId <= 0 || !allowedTypes.has(type)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'Valid applicationId and document type are required' });
      }
      const [owned] = await pool.query('SELECT id FROM applications WHERE id=? AND customer_id=? LIMIT 1', [applicationId, req.customerId]);
      if (!owned.length) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Application not found' });
      }
      const storageKey = path.relative(process.cwd(), req.file.path).replaceAll(path.sep, '/');
      const [result] = await pool.query('INSERT INTO documents (application_id,document_type,original_name,storage_key,status) VALUES (?,?,?,?,?)', [applicationId,type,req.file.originalname,storageKey,'pending']);
      res.status(201).json({ document: { id: result.insertId, applicationId, type, originalName: req.file.originalname, status: 'pending' } });
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      console.error(error);
      res.status(500).json({ error: 'Unable to upload document' });
    }
  });
  return router;
};
