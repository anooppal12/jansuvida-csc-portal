const express = require('express');
const { requireCustomer } = require('./auth-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireCustomer);

  router.post('/', async (req, res) => {
    try {
      const applicationId = Number(req.body.applicationId);
      const method = String(req.body.method || '').trim().toLowerCase();
      if (!Number.isInteger(applicationId) || !['upi', 'cash'].includes(method)) return res.status(400).json({ error: 'Valid applicationId and payment method are required' });
      const [apps] = await pool.query('SELECT id, service_id FROM applications WHERE id = ? AND customer_id = ? LIMIT 1', [applicationId, req.customerId]);
      if (!apps.length) return res.status(404).json({ error: 'Application not found' });
      const [services] = await pool.query('SELECT price FROM services WHERE id = ? LIMIT 1', [apps[0].service_id]);
      const amount = Number(services[0]?.price || 0);
      const [result] = await pool.query('INSERT INTO payments (application_id, customer_id, amount, method, status) VALUES (?,?,?,?,?)', [applicationId, req.customerId, amount, method, 'pending']);
      res.status(201).json({ payment: { id: result.insertId, applicationId, amount, method, status: 'pending' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to create payment request' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT p.id, p.application_id, p.amount, p.method, p.status, p.created_at, a.application_no FROM payments p JOIN applications a ON a.id = p.application_id WHERE p.customer_id = ? ORDER BY p.id DESC`, [req.customerId]);
      res.json({ payments: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load payments' });
    }
  });
  return router;
};