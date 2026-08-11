const express = require('express');
const { requireAdmin } = require('./admin-middleware');

const router = express.Router();
const ALLOWED_STATUSES = new Set(['pending', 'processing', 'approved', 'rejected', 'completed']);
const TRANSITIONS = {
  pending: new Set(['processing', 'rejected']),
  processing: new Set(['approved', 'rejected']),
  approved: new Set(['completed']),
  rejected: new Set(),
  completed: new Set()
};

module.exports = (pool) => {
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const status = String(req.query.status || '').trim().toLowerCase();
      const params = [];
      let where = '';
      if (status) {
        if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid application status' });
        where = 'WHERE a.status = ?';
        params.push(status);
      }
      const [rows] = await pool.query(`
        SELECT a.id, a.application_no, a.status, a.remarks, a.created_at, a.updated_at,
               c.id AS customer_id, c.name AS customer_name, c.mobile,
               s.id AS service_id, s.name AS service, s.price,
               COALESCE((SELECT p.status FROM payments p WHERE p.application_id=a.id ORDER BY p.id DESC LIMIT 1), 'none') AS payment_status
        FROM applications a
        JOIN customers c ON c.id=a.customer_id
        JOIN services s ON s.id=a.service_id
        ${where}
        ORDER BY a.id DESC
      `, params);
      res.json({ applications: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load applications' });
    }
  });

  router.get('/:applicationNo', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT a.id, a.application_no, a.status, a.remarks, a.details, a.created_at, a.updated_at,
               c.id AS customer_id, c.name AS customer_name, c.mobile, c.email,
               s.id AS service_id, s.name AS service, s.price
        FROM applications a
        JOIN customers c ON c.id=a.customer_id
        JOIN services s ON s.id=a.service_id
        WHERE a.application_no=? LIMIT 1
      `, [req.params.applicationNo]);
      if (!rows.length) return res.status(404).json({ error: 'Application not found' });
      const [payments] = await pool.query(
        'SELECT id, amount, method, transaction_id, status, created_at FROM payments WHERE application_id=? ORDER BY id DESC',
        [rows[0].id]
      );
      const [documents] = await pool.query(
        'SELECT id, document_type, file_path, status, created_at FROM documents WHERE application_id=? ORDER BY id DESC',
        [rows[0].id]
      );
      res.json({ application: rows[0], payments, documents });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load application' });
    }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim().toLowerCase();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Valid application id and status are required' });
      }

      const [[application]] = await pool.query(
        `SELECT a.id, a.application_no, a.customer_id, a.status AS old_status,
                COALESCE((SELECT p.status FROM payments p WHERE p.application_id=a.id ORDER BY p.id DESC LIMIT 1), 'none') AS payment_status
         FROM applications a WHERE a.id=? LIMIT 1`,
        [id]
      );
      if (!application) return res.status(404).json({ error: 'Application not found' });
      if (application.old_status === status) return res.status(409).json({ error: `Application is already ${status}` });
      if (!TRANSITIONS[application.old_status]?.has(status)) {
        return res.status(409).json({ error: `Cannot change application from ${application.old_status} to ${status}` });
      }

      if (status === 'processing' && !['verified', 'success'].includes(application.payment_status)) {
        return res.status(409).json({ error: 'A verified payment is required before processing the application' });
      }

      const [result] = await pool.query(
        'UPDATE applications SET status=?, remarks=? WHERE id=? AND status=?',
        [status, remarks, id, application.old_status]
      );
      if (!result.affectedRows) return res.status(409).json({ error: 'Application status was already changed' });

      const title = `Application ${status}`;
      const message = `Your application ${application.application_no} is now ${status}.${remarks ? ` Remark: ${remarks}` : ''}`;
      await pool.query(
        'INSERT INTO notifications(customer_id,title,message,type,is_read) VALUES(?,?,?,?,0)',
        [application.customer_id, title, message, 'application']
      );

      res.json({ ok: true, applicationNo: application.application_no, status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to update application status' });
    }
  });

  return router;
};
