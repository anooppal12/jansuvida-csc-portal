const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();
const createAuthRouter = require('./auth');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

app.use('/api/auth', createAuthRouter(getPool()));

app.get('/api/health', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/services', async (_req, res) => {
  try {
    const [rows] = await getPool().query(`
      SELECT s.id, s.name, s.slug, s.description, s.price, s.processing_time,
             c.name AS category
      FROM services s
      LEFT JOIN service_categories c ON c.id = s.category_id
      WHERE s.status = 1
      ORDER BY s.id DESC
    `);
    res.json({ services: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load services' });
  }
});

app.get('/api/applications/:applicationNo', async (req, res) => {
  try {
    const [rows] = await getPool().query(`
      SELECT a.application_no, a.status, a.remarks, a.created_at,
             s.name AS service, c.name AS customer_name
      FROM applications a
      JOIN services s ON s.id = a.service_id
      JOIN customers c ON c.id = a.customer_id
      WHERE a.application_no = ?
      LIMIT 1
    `, [req.params.applicationNo]);
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load application' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'API route not found' }));

app.listen(port, () => console.log(`Jansuvida API listening on port ${port}`));
