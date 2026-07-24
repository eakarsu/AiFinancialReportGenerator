const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

async function authenticate(req, res, next) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id::text = $1 LIMIT 1',
      [String(payload.sub || '')],
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'IDENTITY_NOT_ACTIVE' });
    req.user = result.rows[0];
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    const user = result.rows[0];
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'INVALID_EMAIL_OR_PASSWORD' });
    }
    const { password_hash: _passwordHash, ...safeUser } = user;
    return res.json({ token: signToken(safeUser), user: safeUser });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
module.exports.authenticate = authenticate;
