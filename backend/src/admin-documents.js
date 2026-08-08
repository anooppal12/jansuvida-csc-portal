const express = require('express');
const { requireAdmin } = require('./admin-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT d.id,d.application_id,d.document_type,d.original_name,d.status,d.remarks,d.created_at,a.application_no,c.name AS customer_name,c.mobile FROM documents d JOIN applications a ON a.id=d.application_id JOIN customers c ON c.id=a.customer_id ORDER BY d.id DESC`);
      res.json({ documents: rows });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load documents' }); }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim().toLowerCase();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Valid document id and status are required' });
      const [result] = await pool.query('UPDATE documents SET status=?, remarks=? WHERE id=?', [status, remarks, id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Document not found' });
      res.json({ ok: true, status });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to update document status' }); }
  });
  return router;
};
