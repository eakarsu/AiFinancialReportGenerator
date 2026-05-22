const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Revenue Recognition Drift',
    summary: {
      driftScore: 72,
      highRiskContracts: 4,
      deferredRevenueGap: 185000,
      reviewPriority: 'High',
    },
    cohorts: [
      { segment: 'Enterprise SaaS', recognized: 1420000, billed: 1310000, drift: 8.4, status: 'Review' },
      { segment: 'Services', recognized: 680000, billed: 702000, drift: -3.1, status: 'Monitor' },
      { segment: 'Usage Based', recognized: 391000, billed: 355000, drift: 10.1, status: 'Review' },
    ],
    controls: [
      'Tie recognized revenue to contract obligation milestones before close.',
      'Flag invoices where usage evidence arrives after recognition date.',
      'Require controller approval for drift above 7 percent by segment.',
    ],
  });
});

module.exports = router;
