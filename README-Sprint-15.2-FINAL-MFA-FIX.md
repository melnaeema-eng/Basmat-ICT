# Sprint 15.2 — FINAL MFA FIX

Built from the Sprint 15 ZIP uploaded by the user.

## Fix
- MFA state is determined from Supabase AAL first.
- `aal1 -> aal2`: existing verified factor; show 6-digit challenge directly.
- `aal1 -> aal1`: no verified factor; show optional enrollment.
- `aal2 -> aal2`: current session already passed MFA.
- Existing-factor login uses `challengeAndVerify()`.
- Enrollment is never attempted when AAL says an MFA factor already exists.
- Password reset flow is untouched.

No SQL. No Edge Function.
