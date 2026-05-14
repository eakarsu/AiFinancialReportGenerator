const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  // In production we refuse to start without an explicit secret.
  throw new Error('JWT_SECRET env var is required in production');
}
const EFFECTIVE_SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod';

/**
 * JWT-based auth middleware.
 *
 * Accepts: Authorization: Bearer <jwt>
 * Falls back to legacy `Bearer <user_id>` for backwards compatibility
 * during migration. Legacy mode is disabled when NODE_ENV=production.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required (Bearer token).' });
    }
    const token = authHeader.slice(7).trim();

    let payload = null;
    try {
      payload = jwt.verify(token, EFFECTIVE_SECRET);
    } catch (jwtErr) {
      if (process.env.NODE_ENV !== 'production') {
        // Legacy fallback: token might be a raw user_id (UUID/int)
        const result = await pool.query(
          'SELECT id, name, email, role, company_id FROM users WHERE id::text = $1',
          [token]
        );
        if (result.rows.length > 0) {
          req.user = result.rows[0];
          return next();
        }
      }
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Validate user exists & load fresh
    const result = await pool.query(
      'SELECT id, name, email, role, company_id FROM users WHERE id = $1',
      [payload.sub || payload.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User no longer exists.' });
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    EFFECTIVE_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authMiddleware, signToken };
