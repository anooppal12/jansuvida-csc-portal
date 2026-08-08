const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('./admin-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT d.id,d.application_id,d.document_type,d.original_name,d.storage_key,d.status,d.remarks,d.created_at,a.application_no,c.name AS customer_name,c.mobile FROM documents d JOIN applications a ON a.id=d.application_id JOIN customers c ON c.id=a.customer_id ORDER BY d.id DESC`);
      res.json({ documents: rows });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load documents' }); }
  });

  router.get('/:id/file', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid document id' });
      const [[doc]] = await pool.query('SELECT original_name,storage_key FROM documents WHERE id=? LIMIT 1', [id]);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      const base = path.resolve(process.env.UPLOAD_DIR || './uploads');
      const file = path.resolve(doc.storage_key);
      if (!file.startsWith(base + path.sep)) return res.status(403).json({ error: 'Invalid document storage path' });
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'Stored file not found' });
      res.download(file, doc.original_name);
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to open document' }); }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim().toLowerCase();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Valid document id and status are required' });
      const [[doc]] = await pool.query(`SELECT d.status AS old_status,d.document_type,d.original_name,a.application_no,c.id AS customer_id FROM documents d JOIN applications a ON a.id=d.application_id JOIN customers c ON c.id=a.customer_id WHERE d.id=? LIMIT 1`, [id]);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      const [result] = await pool.query('UPDATE documents SET status=?, remarks=? WHERE id=?', [status, remarks, id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Document not found' });
      if (doc.old_status !== status) {
        const title = status === 'approved' ? 'Document approved' : 'Document rejected';
        const message = status === 'approved' ? `Your ${doc.document_type} document for application ${doc.application_no} has been approved.` : `Your ${doc.document_type} document for application ${doc.application_no} has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`;
        await pool.query('INSERT INTO notifications(customer_id,title,message,type,is_read) VALUES(?,?,?,?,0)', [doc.customer_id, title, message, 'document']);
      }
      res.json({ ok: true, status });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to update document status' }); }
  });
  return router;
};