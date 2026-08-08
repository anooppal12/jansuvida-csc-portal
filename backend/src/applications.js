const express = require('express');
const crypto = require('crypto');
const { requireCustomer } = require('./auth-middleware');

const router = express.Router();

function makeApplicationNo() {
  return `JS-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
}

module.exports = (pool) => {
  router.use(requireCustomer);

  router.post('/', async (req, res) => {
    try {
      const serviceId = Number(req.body.serviceId);
      const details = req.body.details && typeof req.body.details === 'object' ? req.body.details : {};
      if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ error: 'Valid serviceId is required' });

      const [services] = await pool.query('SELECT id, name, price FROM services WHERE id = ? AND status = 1 LIMIT 1', [serviceId]);
      if (!services.length) return res.status(400).json({ error: 'Service is not available' });

      let applicationNo;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = makeApplicationNo();
        const [existing] = await pool.query('SELECT id FROM applications WHERE application_no = ? LIMIT 1', [candidate]);
        if (!existing.length) { applicationNo = candidate; break; }
      }
      if (!applicationNo) return res.status(500).json({ error: 'Could not generate application number' });

      const [result] = await pool.query(
        'INSERT INTO applications (application_no, customer_id, service_id, status, details) VALUES (?,?,?,?,?)',
        [applicationNo, req.customerId, serviceId, 'pending', JSON.stringify(details)]
      );
      res.status(201).json({ application: { id: result.insertId, applicationNo, service: services[0].name, amount: services[0].price, status: 'pending' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to create application' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT a.id, a.application_no, a.status, a.remarks, a.created_at,
               s.name AS service, s.price
        FROM applications a
        JOIN services s ON s.id = a.service_id
        WHERE a.customer_id = ?
        ORDER BY a.id DESC
      `, [req.customerId]);
      res.json({ applications: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load applications' });
    }
  });

  router.get('/:applicationNo', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT a.id, a.application_no, a.status, a.remarks, a.details, a.created_at,
               s.name AS service, s.price
        FROM applications a
        JOIN services s ON s.id = a.service_id
        WHERE a.application_no = ? AND a.customer_id = ?
        LIMIT 1
      `, [req.params.applicationNo, req.customerId]);
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });
      res.json({ application: rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load application' });
    }
  });

  return router;
};
