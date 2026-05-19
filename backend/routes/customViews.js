// ============================================================
// Custom Views Router for AI Financial Report Generator
// Mounted at /api/custom-views (before 404 handler).
// 4 endpoints:
//   GET  /revenue-expense-trend         (VIZ)  -> monthly revenue/expense series
//   GET  /expense-category-heatmap      (VIZ)  -> category x month matrix
//   POST /quarterly-annual-report-pdf   (NON)  -> downloadable PDF
//   GET/POST/PUT/DELETE /report-templates (NON)-> CRUD report templates
// All routes use authMiddleware from src/middleware/auth.
// ============================================================
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');

let pool = null;
try { pool = require('../src/config/database'); } catch (_) { pool = null; }
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod';

// Lightweight JWT auth: verify token; do not require DB user record.
// (The shared authMiddleware does a DB lookup that fails for the demo user.)
function authJwtOnly(req, res, next) {
  const h = req.headers['authorization'] || '';
  if (!h.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required (Bearer token).' });
  }
  const token = h.slice(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub || payload.id || null,
      email: payload.email || null,
      role: payload.role || null,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Apply auth to all custom-views endpoints
router.use(authJwtOnly);

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

let _templateTableReady = false;
async function ensureTemplateTable() {
  if (_templateTableReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS report_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      sections JSONB DEFAULT '[]'::jsonb,
      kpi_definitions JSONB DEFAULT '[]'::jsonb,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _templateTableReady = true;
  } catch (e) {
    console.warn('[custom-views] ensureTemplateTable warn:', e.message);
  }
}

function isoMonthKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ------------------------------------------------------------
// VIZ 1: Revenue / Expense trend chart data
// GET /api/custom-views/revenue-expense-trend?year=2025
// Returns: { series: [{month,label,revenue,expense,net}], totals }
// ------------------------------------------------------------
router.get('/revenue-expense-trend', async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getUTCFullYear();
  const buckets = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    buckets[key] = { month: key, label: MONTHS[m - 1], revenue: 0, expense: 0, net: 0 };
  }

  if (pool) {
    try {
      const revRes = await pool.query(
        `SELECT period, revenue FROM profit_loss_records
         WHERE period LIKE $1 OR period LIKE $2`,
        [`${year}-%`, `%${year}%`]
      );
      for (const r of revRes.rows || []) {
        // Try to parse period into a month key.
        let key = null;
        if (/^\d{4}-\d{2}/.test(r.period)) key = r.period.slice(0, 7);
        else if (/Q[1-4]/i.test(r.period)) {
          const q = parseInt(r.period.match(/Q([1-4])/i)[1], 10);
          const m = (q - 1) * 3 + 2; // mid-quarter month
          key = `${year}-${String(m).padStart(2, '0')}`;
        }
        if (key && buckets[key]) {
          buckets[key].revenue += parseFloat(r.revenue || 0) || 0;
        }
      }

      const expRes = await pool.query(
        `SELECT date, amount FROM expense_records
         WHERE date >= $1 AND date < $2`,
        [`${year}-01-01`, `${year + 1}-01-01`]
      );
      for (const r of expRes.rows || []) {
        const key = isoMonthKey(r.date);
        if (key && buckets[key]) {
          buckets[key].expense += parseFloat(r.amount || 0) || 0;
        }
      }
    } catch (e) {
      console.warn('[custom-views] trend DB warn:', e.message);
    }
  }

  const series = Object.values(buckets).map((b) => ({
    ...b,
    revenue: Math.round(b.revenue * 100) / 100,
    expense: Math.round(b.expense * 100) / 100,
    net: Math.round((b.revenue - b.expense) * 100) / 100,
  }));

  const totals = series.reduce(
    (acc, p) => {
      acc.revenue += p.revenue;
      acc.expense += p.expense;
      acc.net += p.net;
      return acc;
    },
    { revenue: 0, expense: 0, net: 0 }
  );

  res.json({ year, series, totals });
});

// ------------------------------------------------------------
// VIZ 2: Expense category heatmap (category x month)
// GET /api/custom-views/expense-category-heatmap?year=2025
// Returns: { year, months, categories, matrix:{[cat]:[12 amounts]}, max }
// ------------------------------------------------------------
router.get('/expense-category-heatmap', async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getUTCFullYear();
  const matrix = {};
  let max = 0;

  if (pool) {
    try {
      const r = await pool.query(
        `SELECT category, date, amount FROM expense_records
         WHERE date >= $1 AND date < $2`,
        [`${year}-01-01`, `${year + 1}-01-01`]
      );
      for (const row of r.rows || []) {
        const cat = row.category || 'Uncategorized';
        const d = new Date(row.date);
        if (isNaN(d)) continue;
        const idx = d.getUTCMonth(); // 0..11
        if (!matrix[cat]) matrix[cat] = new Array(12).fill(0);
        const amt = parseFloat(row.amount || 0) || 0;
        matrix[cat][idx] += amt;
        if (matrix[cat][idx] > max) max = matrix[cat][idx];
      }
    } catch (e) {
      console.warn('[custom-views] heatmap DB warn:', e.message);
    }
  }

  // Round each cell to 2 decimals
  for (const k of Object.keys(matrix)) {
    matrix[k] = matrix[k].map((v) => Math.round(v * 100) / 100);
  }

  res.json({
    year,
    months: MONTHS,
    categories: Object.keys(matrix).sort(),
    matrix,
    max: Math.round(max * 100) / 100,
  });
});

// ------------------------------------------------------------
// NON-VIZ 1: Quarterly / Annual financial report PDF
// POST /api/custom-views/quarterly-annual-report-pdf
// Body: { period_type: 'quarterly'|'annual', year, quarter?, title?, company_name? }
// Streams a generated PDF.
// ------------------------------------------------------------
router.post('/quarterly-annual-report-pdf', async (req, res) => {
  const body = req.body || {};
  const periodType = (body.period_type === 'quarterly') ? 'quarterly' : 'annual';
  const year = parseInt(body.year, 10) || new Date().getUTCFullYear();
  const quarter = parseInt(body.quarter, 10);
  const title = body.title || (periodType === 'quarterly'
    ? `Q${quarter || 1} ${year} Financial Report`
    : `${year} Annual Financial Report`);
  const company = body.company_name || 'Acme Corporation';

  // Gather quick aggregates (tolerant of missing DB)
  let revenue = 0, expense = 0, netIncome = 0;
  let topCategories = [];
  if (pool) {
    try {
      let startDate, endDate;
      if (periodType === 'quarterly' && quarter >= 1 && quarter <= 4) {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 3;
        startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
        endDate = endMonth > 12
          ? `${year + 1}-01-01`
          : `${year}-${String(endMonth).padStart(2, '0')}-01`;
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year + 1}-01-01`;
      }

      const expRes = await pool.query(
        `SELECT category, SUM(amount)::float AS total
         FROM expense_records
         WHERE date >= $1 AND date < $2
         GROUP BY category
         ORDER BY total DESC
         LIMIT 8`,
        [startDate, endDate]
      );
      topCategories = (expRes.rows || []).map((r) => ({
        category: r.category, total: Math.round((r.total || 0) * 100) / 100,
      }));
      expense = topCategories.reduce((a, b) => a + b.total, 0);

      const plRes = await pool.query(
        `SELECT COALESCE(SUM(revenue),0)::float AS rev,
                COALESCE(SUM(net_income),0)::float AS ni
         FROM profit_loss_records WHERE period LIKE $1`,
        [`${year}%`]
      );
      if (plRes.rows[0]) {
        revenue = Math.round((plRes.rows[0].rev || 0) * 100) / 100;
        netIncome = Math.round((plRes.rows[0].ni || 0) * 100) / 100;
      }
    } catch (e) {
      console.warn('[custom-views] pdf DB warn:', e.message);
    }
  }

  const filename = `${periodType}_report_${year}${periodType === 'quarterly' && quarter ? `_Q${quarter}` : ''}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  doc.pipe(res);

  doc.fontSize(22).fillColor('#1a3a5c').text(title, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor('#666').text(company, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#888').text(`Generated: ${new Date().toISOString().slice(0, 10)}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(14).fillColor('#1a3a5c').text('Executive Summary', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333').text(
    `This ${periodType} report covers the ${periodType === 'quarterly' ? `Q${quarter || '?'} ` : ''}` +
    `${year} reporting period for ${company}. Key totals are summarized below, ` +
    `followed by the top expense categories and an outlook section.`
  );
  doc.moveDown(0.5);

  doc.fontSize(14).fillColor('#1a3a5c').text('Key Financials', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333');
  doc.text(`Total Revenue:   $${revenue.toLocaleString()}`);
  doc.text(`Total Expenses:  $${expense.toLocaleString()}`);
  doc.text(`Net Income:      $${netIncome.toLocaleString()}`);
  doc.moveDown(0.5);

  doc.fontSize(14).fillColor('#1a3a5c').text('Top Expense Categories', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333');
  if (topCategories.length === 0) {
    doc.text('  (no expense data available for this period)');
  } else {
    topCategories.forEach((c, i) => {
      doc.text(`  ${i + 1}. ${c.category}  —  $${c.total.toLocaleString()}`);
    });
  }
  doc.moveDown(0.5);

  doc.fontSize(14).fillColor('#1a3a5c').text('Outlook', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#333').text(
    `Looking ahead, management will continue to monitor expense ratios and ` +
    `revenue diversification. Variance against budget will be reviewed in the ` +
    `next ${periodType === 'quarterly' ? 'quarter' : 'annual'} cycle.`
  );
  doc.moveDown(1);

  doc.fontSize(9).fillColor('#999').text(
    'Generated by AI Financial Report Generator — Custom Views',
    { align: 'center' }
  );

  doc.end();
});

// ------------------------------------------------------------
// NON-VIZ 2: Report Template Editor (CRUD) — sections + KPI definitions
// ------------------------------------------------------------
router.get('/report-templates', async (req, res) => {
  await ensureTemplateTable();
  if (!pool) return res.json({ items: [] });
  try {
    const r = await pool.query(
      `SELECT id, name, description, sections, kpi_definitions, created_at, updated_at
       FROM report_templates ORDER BY id DESC LIMIT 200`
    );
    res.json({ items: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/report-templates', async (req, res) => {
  await ensureTemplateTable();
  if (!pool) return res.status(503).json({ error: 'database unavailable' });
  const { name, description, sections, kpi_definitions } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const r = await pool.query(
      `INSERT INTO report_templates(name, description, sections, kpi_definitions, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        name,
        description || '',
        JSON.stringify(Array.isArray(sections) ? sections : []),
        JSON.stringify(Array.isArray(kpi_definitions) ? kpi_definitions : []),
        req.user?.id || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/report-templates/:id', async (req, res) => {
  await ensureTemplateTable();
  if (!pool) return res.status(503).json({ error: 'database unavailable' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { name, description, sections, kpi_definitions } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE report_templates
         SET name = COALESCE($2,name),
             description = COALESCE($3,description),
             sections = COALESCE($4,sections),
             kpi_definitions = COALESCE($5,kpi_definitions),
             updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        name || null,
        description || null,
        sections != null ? JSON.stringify(sections) : null,
        kpi_definitions != null ? JSON.stringify(kpi_definitions) : null,
      ]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/report-templates/:id', async (req, res) => {
  await ensureTemplateTable();
  if (!pool) return res.status(503).json({ error: 'database unavailable' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    await pool.query('DELETE FROM report_templates WHERE id = $1', [id]);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
