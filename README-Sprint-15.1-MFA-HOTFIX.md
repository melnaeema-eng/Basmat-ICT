# Sprint 15.1 MFA HOTFIX

Built directly from the uploaded Sprint 15 ZIP.

Fix:
- Prevents the enrollment screen from appearing before Supabase finishes loading existing factors.
- Re-checks existing TOTP factors before calling `mfa.enroll()`.
- If a verified factor already exists, the page switches to 6-digit verification instead of creating another factor.
- Keeps the successful production password-reset flow unchanged.
- No SQL and no Edge Function changes.
