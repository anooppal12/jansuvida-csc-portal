const { verifySession } = require('./auth-middleware');

function requireAdmin(req, res, next) {
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const session = verifySession(token);
  if (!session || session.role !== 'admin') return res.status(401).json({ error: 'Admin authentication required' });
  req.admin = session;
  next();
}

module.exports = { requireAdmin };
