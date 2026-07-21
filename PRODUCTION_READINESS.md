# Governed financial-report release

The supported API is `/api/governance`. It records versioned source manifests, ledger reconciliation, period locks, controls, drafts, formula/citation evidence, variance review, qualified-accountant review, dual finance approval, export receipts, correction, supersession, and immutable audit history. It is non-advisory and never changes a ledger, moves funds, files a return, recommends an investment, or releases a report autonomously.

Apply `backend/migrations/001_governed_financial_report.sql` separately with a reviewed migration identity. Pre-provision tenant memberships; do not use demo identities. General-ledger, ERP, banking-readonly, tax, consolidation, document, e-signature, delivery, and audit workers remain disabled until credentials, typed contracts, period/materiality policies, signed receipts, idempotency, reconciliation, retry/dead-letter, and recovery exercises pass.

Use `.env.example`; production rejects weak secrets, wildcard CORS, demo/mock/provider flags, and startup mutation. `start.sh` never installs, seeds, migrates, resets data, or reclaims ports. Independent accountants must validate formulas, FX, eliminations, citations, materiality, access, privacy, correction, supersession, latency, backup/restore, and released-report outcomes on representative closed periods. No real report was filed or released here.
