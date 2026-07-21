const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

async function main() {
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!email || password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters are required');
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    console.log('bootstrap administrator already exists; no credentials or roles changed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [crypto.randomUUID(), email, 'Runtime Administrator', passwordHash],
  );
  console.log('bootstrap administrator created');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
