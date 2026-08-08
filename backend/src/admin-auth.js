const express = require('express');
const crypto = require('crypto');
const { createSession } = require('./auth-middleware');
const router = express.Router();

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = () => {
  router.post('/login', (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedUser || !expectedPassword || !safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    const accessToken = createSession({ id: `admin:${username}`, role: 'admin' });
    res.json({ accessToken, tokenType: 'Bearer', admin: { username, role: 'admin' } });
  });
  return router;
};
