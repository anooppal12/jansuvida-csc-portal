const express = require('express');
const { requireAdmin } = require('./auth-middleware');
const router = express.Router();

module.exports = (pool) => {
  router.use(requireAdmin);
  router.get('/stats', async (_req, res) => {
    try {
      const [[customers]] = await pool.query('SELECT COUNT(*) AS total FROM customers');
      const [[applications]] = await pool.query('SELECT COUNT(*) AS total FROM applications');
      const [[payments]] = await pool.query("SELECT COUNT(*) AS total FROM payments WHERE status = 'pending'");
      const [[documents]] = await pool.query("SELECT COUNT(*) AS total FROM documents WHERE status = 'pending'");
      res.json({ stats: { customers: customers.total, applications: applications.total, pendingPayments: payments.total, pendingDocuments: documents.total } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load admin statistics' });
    }
  });
  return router;
};
