# Sprint 17 — Customer Portal History

Purpose:
Keep the customer's operational portal clean while preserving finished transactions.

Adds:
- `/portal/history`
- History tabs for projects, support, quotations, invoices and requests.
- Closed/resolved support tickets hidden from the active Support page.
- Paid/cancelled invoices hidden from the active Invoices page.
- Sprint 16 already filters completed/closed projects and requests from active views.
- No records are deleted; finished items remain in the database and are visible in History.

No SQL and no Edge Function are required.
