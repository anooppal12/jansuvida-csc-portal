const crypto = require('crypto');

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function createSession(customer) {
  const payload = base64url(JSON.stringify({ sub: customer.id, role: 'customer', iat: Math.floor(Date.now() / 1000) }));
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { return null; }
}

function requireCustomer(req, res, next) {
  const auth = req.get('authorization') || '';
  const session = verifySession(auth.startsWith('Bearer ') ? auth.slice(7) : null);
  if (!session || session.role !== 'customer') return res.status(401).json({ error: 'Authentication required' });
  req.customerId = session.sub;
  next();
}

module.exports = { createSession, requireCustomer };