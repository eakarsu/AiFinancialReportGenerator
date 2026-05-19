const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');

// Helper: safely parse JSON fields that may already be objects
function safeParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

// Helper: render a section heading
function sectionHeading(doc, text, y) {
  doc
    .moveDown(0.5)
    .fontSize(13)
    .fillColor('#1a3a5c')
    .text(text, { underline: true })
    .moveDown(0.3)
    .fontSize(10)
    .fillColor('#333333');
}

// Helper: render key-value pairs from an object
function renderObject(doc, obj, indent = 0) {
  if (!obj || typeof obj !== 'object') {
    doc.text(String(obj || ''), { indent });
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      doc.font('Helvetica-Bold').text(`${label}:`, { indent }).font('Helvetica');
      renderObject(doc, value, indent + 20);
    } else if (Array.isArray(value)) {
      doc.font('Helvetica-Bold').text(`${label}:`, { indent }).font('Helvetica');
      value.forEach(item => {
        if (typeof item === 'object') renderObject(doc, item, indent + 20);
        else doc.text(`  • ${item}`, { indent: indent + 20 });
      });
    } else {
      doc.text(`${label}: ${value ?? ''}`, { indent });
    }
  }
}

// GET /api/board-report/:id/pdf — generate and stream a PDF for a saved board report
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Try ai_board_reports table first
    let report = null;
    try {
      const brResult = await pool.query(
        `SELECT br.*, c.name as company_name
         FROM ai_board_reports br
         LEFT JOIN companies c ON br.company_id = c.id
         WHERE br.id = $1`,
        [id]
      );
      if (brResult.rows.length > 0) report = brResult.rows[0];
    } catch (e) {
      // table may not exist
    }

    // Fallback: try ai_responses table with feature_type = 'board_report'
    if (!report) {
      const arResult = await pool.query(
        `SELECT ar.*, c.name as company_name
         FROM ai_responses ar
         LEFT JOIN companies c ON ar.company_id = c.id
         WHERE ar.id = $1 AND ar.feature_type = 'board_report'`,
        [id]
      );
      if (arResult.rows.length > 0) report = arResult.rows[0];
    }

    if (!report) {
      return res.status(404).json({ error: 'Board report not found' });
    }

    // Build PDF
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const fileName = `board-report-${id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // --- Cover Page ---
    doc
      .fontSize(22)
      .fillColor('#1a3a5c')
      .font('Helvetica-Bold')
      .text('BOARD REPORT', { align: 'center' })
      .moveDown(0.5)
      .fontSize(16)
      .text(report.report_title || 'Financial Board Report', { align: 'center' })
      .moveDown(0.3)
      .fontSize(12)
      .fillColor('#555555')
      .font('Helvetica')
      .text(`Company: ${report.company_name || 'N/A'}`, { align: 'center' })
      .text(`Period: ${report.report_period || 'N/A'}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
      .text(`Status: ${(report.status || 'generated').toUpperCase()}`, { align: 'center' })
      .moveDown(2);

    // Horizontal rule
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#1a3a5c').lineWidth(2).stroke().moveDown(1);

    // --- Executive Summary ---
    const execSummary = safeParse(report.executive_summary);
    if (execSummary) {
      sectionHeading(doc, 'Executive Summary');
      if (typeof execSummary === 'string') {
        doc.text(execSummary, { align: 'justify' });
      } else {
        renderObject(doc, execSummary);
      }
      doc.moveDown(0.5);
    }

    // --- Financial Highlights ---
    const finHighlights = safeParse(report.financial_highlights);
    if (finHighlights) {
      sectionHeading(doc, 'Financial Highlights');
      renderObject(doc, finHighlights);
      doc.moveDown(0.5);
    }

    // --- Key Metrics ---
    const keyMetrics = safeParse(report.key_metrics);
    if (keyMetrics) {
      sectionHeading(doc, 'Key Metrics');
      if (Array.isArray(keyMetrics)) {
        keyMetrics.forEach((m, idx) => {
          if (typeof m === 'object') renderObject(doc, m, 10);
          else doc.text(`${idx + 1}. ${m}`, { indent: 10 });
        });
      } else {
        renderObject(doc, keyMetrics);
      }
      doc.moveDown(0.5);
    }

    // --- Strategic Initiatives ---
    const strategic = safeParse(report.strategic_initiatives);
    if (strategic) {
      sectionHeading(doc, 'Strategic Initiatives');
      if (Array.isArray(strategic)) {
        strategic.forEach((item, idx) => {
          if (typeof item === 'object') renderObject(doc, item, 10);
          else doc.text(`${idx + 1}. ${item}`, { indent: 10 });
        });
      } else {
        renderObject(doc, strategic);
      }
      doc.moveDown(0.5);
    }

    // --- Risk Assessment ---
    const riskAssessment = safeParse(report.risk_assessment);
    if (riskAssessment) {
      sectionHeading(doc, 'Risk Assessment');
      renderObject(doc, riskAssessment);
      doc.moveDown(0.5);
    }

    // --- Recommendations ---
    const recommendations = safeParse(report.recommendations);
    if (recommendations) {
      sectionHeading(doc, 'Recommendations');
      if (Array.isArray(recommendations)) {
        recommendations.forEach((item, idx) => {
          if (typeof item === 'object') renderObject(doc, item, 10);
          else doc.text(`${idx + 1}. ${item}`, { indent: 10 });
        });
      } else {
        renderObject(doc, recommendations);
      }
      doc.moveDown(0.5);
    }

    // --- Outlook ---
    const outlook = safeParse(report.outlook);
    if (outlook) {
      sectionHeading(doc, 'Outlook');
      if (typeof outlook === 'string') {
        doc.text(outlook, { align: 'justify' });
      } else {
        renderObject(doc, outlook);
      }
      doc.moveDown(0.5);
    }

    // --- Footer ---
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#999999')
      .text(
        'This report was generated by AI Financial Report Generator. For internal use only.',
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    console.error('Board report PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

module.exports = router;
