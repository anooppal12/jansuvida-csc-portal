const express = require('express');
const { requireAdmin } = require('./admin-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT p.id,p.application_id,p.customer_id,p.amount,p.method,p.status,p.remarks,p.created_at,a.application_no,c.name AS customer_name,c.mobile FROM payments p JOIN applications a ON a.id=p.application_id JOIN customers c ON c.id=p.customer_id ORDER BY p.id DESC`);
      res.json({ payments: rows });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to load payments' }); }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim().toLowerCase();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !['verified','rejected'].includes(status)) return res.status(400).json({ error: 'Valid payment id and status are required' });
      const [result] = await pool.query('UPDATE payments SET status=?, remarks=? WHERE id=?', [status, remarks, id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Payment not found' });
      res.json({ ok: true, status });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to update payment status' }); }
  });
  return router;
};
