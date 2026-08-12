# Basmat ICT Portal — Sprint 15

## Security & 2FA (TOTP)

This patch is based on the stable Sprint 14.4 HOTFIX and adds:

- Optional TOTP 2FA for Admin / Manager / Sales / Engineer / Support.
- QR enrollment using Supabase MFA.
- 6-digit Authenticator verification.
- Once a staff account enables 2FA, that account must verify 2FA on future sessions.
- 2FA can be disabled again during the trial period.
- Password recovery redirects to the production domain:
  `https://ict.basmat-alnawabig.com.sa/admin/reset-password`
- No customer MFA changes.
- No database SQL required.

## Important Supabase setting

Authentication → URL Configuration

Site URL:
`https://ict.basmat-alnawabig.com.sa`

Redirect URLs:
- `https://ict.basmat-alnawabig.com.sa/admin/reset-password`
- `http://localhost:5173/admin/reset-password`
- `http://localhost:5174/admin/reset-password`

TOTP MFA is handled by Supabase Auth and does not require a real staff email after the account exists.
