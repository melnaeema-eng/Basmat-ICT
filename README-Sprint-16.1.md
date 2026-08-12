# Sprint 16.1 — Existing Customer as Staff

Updates `create-staff-user` so an existing Supabase Auth user can also become a staff user.

- Reuses the existing `user_id`.
- Preserves `ict_customer_portal_users`.
- Adds/updates `ict_admin_users`.
- Keeps the user's existing password.
- Creates a new Auth account only when the email does not already exist.
- Does not touch MFA or password recovery.
