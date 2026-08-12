# Sprint 16 — Lifecycle Management

Adds:
- Customer temporary disable, archive, restore/reactivate.
- Team-member temporary disable, archive, restore/reactivate.
- Safe permanent-delete RPCs that block deletion when business relations exist.
- Hides clearly closed/finished projects and requests from the customer portal.

Important:
- This patch manages `ict_team_members` (operational team records).
- It does not delete Supabase Auth users or modify MFA/password recovery.
