const express = require('express');
const { requireCustomer } = require('./auth-middleware');

const router = express.Router();

const allowedTypes = new Set(['aadhaar','pan','bank_passbook','photo','address_proof','other']);

module.exports = (pool) => {
  router.post('/', requireCustomer, async (req, res) => {
    try {
      const applicationId = Number(req.body.applicationId);
      const type = String(req.body.type || '').trim();
      const originalName = String(req.body.originalName || '').trim();
      const storageKey = String(req.body.storageKey || '').trim();
      if (!Number.isInteger(applicationId) || applicationId <= 0 || !allowedTypes.has(type) || !originalName || !storageKey) {
        return res.status(400).json({ error: 'applicationId, type, originalName and storageKey are required' });
      }
      const [owned] = await pool.query('SELECT id FROM applications WHERE id = ? AND customer_id = ? LIMIT 1', [applicationId, req.customerId]);
      if (!owned.length) return res.status(404).json({ error: 'Application not found' });
      const [result] = await pool.query(
        'INSERT INTO documents (application_id, document_type, original_name, storage_key, status) VALUES (?,?,?,?,?)',
        [applicationId, type, originalName, storageKey, 'pending']
      );
      res.status(201).json({ document: { id: result.insertId, applicationId, type, originalName, status: 'pending' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to save document' });
    }
  });

  router.get('/application/:applicationId', requireCustomer, async (req, res) => {
    try {
      const applicationId = Number(req.params.applicationId);
      const [rows] = await pool.query(`
        SELECT d.id, d.document_type, d.original_name, d.status, d.remarks, d.created_at
        FROM documents d
        JOIN applications a ON a.id = d.application_id
        WHERE d.application_id = ? AND a.customer_id = ?
        ORDER BY d.id DESC
      `, [applicationId, req.customerId]);
      res.json({ documents: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load documents' });
    }
  });

  return router;
};
