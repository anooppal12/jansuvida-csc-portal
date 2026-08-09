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

      const [[payment]] = await pool.query(`SELECT p.status AS old_status,p.amount,p.method,a.application_no,c.id AS customer_id FROM payments p JOIN applications a ON a.id=p.application_id JOIN customers c ON c.id=p.customer_id WHERE p.id=? LIMIT 1`, [id]);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      if (payment.old_status !== 'pending') return res.status(409).json({ error: `Payment is already ${payment.old_status}` });

      const [result] = await pool.query(`UPDATE payments SET status=?, remarks=? WHERE id=? AND status='pending'`, [status, remarks, id]);
      if (!result.affectedRows) return res.status(409).json({ error: 'Payment status was already changed' });

      const title = status === 'verified' ? 'Payment verified' : 'Payment rejected';
      const message = status === 'verified'
        ? `Your payment of ₹${Number(payment.amount).toFixed(2)} for application ${payment.application_no} has been verified.`
        : `Your payment of ₹${Number(payment.amount).toFixed(2)} for application ${payment.application_no} has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`;
      await pool.query('INSERT INTO notifications(customer_id,title,message,type,is_read) VALUES(?,?,?,?,0)', [payment.customer_id, title, message, 'payment']);

      res.json({ ok: true, status });
    } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to update payment status' }); }
  });
  return router;
};