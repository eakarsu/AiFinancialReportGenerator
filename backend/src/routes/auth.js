const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { signToken } = require('../middleware/auth');

// Detect whether stored hash is a bcrypt hash (recognized prefix)
function isBcryptHash(hash) {
  return typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
}
function legacySha256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name, email, role || 'analyst', passwordHash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Demo login bypass — short-circuited for dev convenience
    if (email === 'demo@financialreports.ai' && password === 'demo123456') {
      const demoUser = {
        id: 'demo-user',
        name: 'Demo CFO',
        email: 'demo@financialreports.ai',
        role: 'CFO',
      };
      const token = signToken(demoUser);
      return res.json({ user: demoUser, token, ...demoUser });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    let ok = false;
    if (isBcryptHash(user.password_hash)) {
      ok = await bcrypt.compare(password, user.password_hash);
    } else if (user.password_hash) {
      // Legacy SHA256 fallback. If correct, transparently upgrade to bcrypt.
      ok = user.password_hash === legacySha256(password);
      if (ok) {
        const newHash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
      }
    }

    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      // Backwards compat fields
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Password Reset Request
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    // Always return success (don't reveal if email exists)
    res.json({ message: 'If the email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// Password Reset Confirm
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (code.length !== 6) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user profile (legacy: query.user_id; preferred: Authorization)
router.get('/profile', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const result = await pool.query(
      'SELECT id, name, email, role, company_id, created_at, updated_at FROM users WHERE id = $1',
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { user_id, name, email } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, email, role',
      [name, email, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
