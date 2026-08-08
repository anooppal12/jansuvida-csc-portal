const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const router = express.Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function validMobile(value) { return /^[6-9]\d{9}$/.test(String(value || '')); }

module.exports = (pool) => {
  router.post('/register', async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      const mobile = String(req.body.mobile || '').trim();
      const email = String(req.body.email || '').trim() || null;
      const password = String(req.body.password || '');
      if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Valid name is required' });
      if (!validMobile(mobile)) return res.status(400).json({ error: 'Valid mobile number is required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      const [existing] = await pool.query('SELECT id FROM customers WHERE mobile = ? LIMIT 1', [mobile]);
      if (existing.length) return res.status(409).json({ error: 'Mobile number is already registered' });
      const passwordHash = hashPassword(password);
      const [result] = await pool.query('INSERT INTO customers (name,mobile,email,password_hash) VALUES (?,?,?,?)', [name,mobile,email,passwordHash]);
      res.status(201).json({ customer: { id: result.insertId, name, mobile, email } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const mobile = String(req.body.mobile || '').trim();
      const password = String(req.body.password || '');
      if (!validMobile(mobile) || !password) return res.status(400).json({ error: 'Mobile and password are required' });
      const [rows] = await pool.query('SELECT id,name,mobile,email,password_hash,status FROM customers WHERE mobile = ? LIMIT 1', [mobile]);
      if (!rows.length || rows[0].status !== 'active' || !verifyPassword(password, rows[0].password_hash)) return res.status(401).json({ error: 'Invalid mobile or password' });
      // Session/token issuance is intentionally left for the next auth-hardening step.
      res.json({ customer: { id: rows[0].id, name: rows[0].name, mobile: rows[0].mobile, email: rows[0].email } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
};
