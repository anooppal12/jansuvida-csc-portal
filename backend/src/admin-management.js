const express = require('express');
const { requireAdmin } = require('./auth-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireAdmin);

  router.get('/customers', async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT id,name,mobile,email,status,created_at FROM customers ORDER BY id DESC`);
      res.json({ customers: rows });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load customers' }); }
  });

  router.get('/applications', async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT a.id,a.application_no,a.status,a.remarks,a.created_at,a.updated_at,c.name AS customer_name,c.mobile,s.name AS service,s.price FROM applications a JOIN customers c ON c.id=a.customer_id JOIN services s ON s.id=a.service_id ORDER BY a.id DESC`);
      res.json({ applications: rows });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load applications' }); }
  });

  router.patch('/applications/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim().toLowerCase();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !['pending','processing','approved','completed','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid application status' });
      const [result] = await pool.query('UPDATE applications SET status=?, remarks=? WHERE id=?', [status, remarks, id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Application not found' });
      res.json({ ok: true, status });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to update application' }); }
  });

  router.get('/summary', async (_req, res) => {
    try {
      const [[customers]] = await pool.query('SELECT COUNT(*) total FROM customers');
      const [[applications]] = await pool.query('SELECT COUNT(*) total FROM applications');
      const [[payments]] = await pool.query("SELECT COUNT(*) total FROM payments WHERE status='pending'");
      const [[documents]] = await pool.query("SELECT COUNT(*) total FROM documents WHERE status='pending'");
      res.json({ customers: customers.total, applications: applications.total, pendingPayments: payments.total, pendingDocuments: documents.total });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load summary' }); }
  });

  return router;
};
