const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');

// Simple password hashing (for demo - in production use bcrypt)
function hashPassword(password) {
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

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name, email, role || 'analyst', passwordHash]
    );

    res.status(201).json(result.rows[0]);
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

    // Demo login bypass
    if (email === 'demo@financialreports.ai' && password === 'demo123456') {
      return res.json({
        id: 'demo-user',
        name: 'Demo CFO',
        email: 'demo@financialreports.ai',
        role: 'CFO',
      });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordHash = hashPassword(password);

    if (user.password_hash && user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
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

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
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

    // For demo: accept any 6-digit code
    if (code.length !== 6) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const passwordHash = hashPassword(newPassword);
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

// Get current user profile
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
