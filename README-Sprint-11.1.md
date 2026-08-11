# Basmat ICT — Sprint 11.1

Support attachments upgrade.

- Customer can attach multiple files when opening a support ticket.
- Customer can attach files with every reply.
- Admin can review/download customer attachments.
- Admin can attach files in replies.
- Attachments are linked to each support message.
- Private Supabase Storage bucket with RLS.
- 25 MB maximum per file.

## Install
1. Extract ZIP over project root.
2. Run `supabase/sprint11_1_support_attachments.sql` in Supabase SQL Editor.
3. Run `npm run dev`.
4. Test `/portal/support` and `/admin/support`.
