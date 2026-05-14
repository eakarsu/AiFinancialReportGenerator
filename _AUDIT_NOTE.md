# Audit Apply Notes — AiFinancialReportGenerator

Audit source: `_AUDIT/reports/batch_03.md` (#28). Verdict: **substantive** (39 routes, 24 AI endpoints).

## Original recommendations

Missing AI counterparts:
- `/audit-readiness` — pre-audit findings preview
- `/covenant-tracking` — monitor debt covenants
- `/segment-analysis` — business unit / segment performance

Missing non-AI: accounting integrations, multi-currency, consolidation, approval workflows.

Custom features: agentic CFO, real-time dashboards, predictive cash flow, audit support, FP&A module, consolidation, ESG.

## Implementations applied

Added three AI endpoints to `backend/src/routes/ai.js` matching existing style (uses `pool`, `callOpenRouter`, returns JSON shaped responses):

1. `POST /api/ai/audit-readiness` — pre-audit readiness review with severity-classified findings, doc gaps, control weaknesses, remediation actions, readiness score.
2. `POST /api/ai/covenant-tracking` — evaluates user-provided covenants against current financial ratios/cash flow; flags breach risk.
3. `POST /api/ai/segment-analysis` — segment-level scoring, outperformers/underperformers, capital reallocation, strategic options.

All sourced from the audit's "missing AI counterparts" list. Syntax-checked via `node --check`.

## Backlog (prioritized)

### Mechanical, easy
- Replace duplicated OpenRouter helper at the top of every AI route with an import from `services/openrouter.js`.

### Needs creds / external
- QuickBooks / NetSuite / SAP integration.
- Multi-currency FX feed.

### Needs product decision
- Consolidation engine (parent-subsidiary financials, intercompany elimination).
- Approval workflow design.

### Custom features (larger scope)
- Agentic CFO assistant orchestrating the existing 24 endpoints.
- Real-time KPI streaming dashboard.
- Predictive cash flow tied to AR/AP aging.
- ESG-financial linkage module.

## Apply pass 3 (frontend)

- Frontend stack: React (CRA). The three apply-pass-2 endpoints (`/audit-readiness`, `/covenant-tracking`, `/segment-analysis`) already have dedicated pages — `AiAuditReadiness.js`, `AiCovenantTracking.js`, `AiSegmentAnalysis.js` — routed under `/ai-audit-readiness`, `/ai-covenant-tracking`, `/ai-segment-analysis`. Each calls a corresponding helper in `services/api.js`.
- Action: **LEFT-AS-IS** — FE already wired. No files changed.
