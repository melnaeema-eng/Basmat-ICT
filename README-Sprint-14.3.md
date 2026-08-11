# Basmat ICT Portal — Sprint 14.3

## Password Recovery for Staff

Adds password recovery for Admin / Manager / Sales / Engineer / Support accounts.

### Included
- "Forgot password?" button on `/admin/login`
- Password reset email through Supabase Auth
- New `/admin/reset-password` page
- Minimum password length: 8 characters
- No database schema changes
- No Edge Function changes

### Supabase Auth setting
Ensure the following Redirect URL is allowed in Supabase Auth URL Configuration:

- Local: `http://localhost:5173/admin/reset-password`
- If Vite uses another port during testing, add that local URL too (for example `http://localhost:5174/admin/reset-password`).
- Production: `https://YOUR-DOMAIN/admin/reset-password`

