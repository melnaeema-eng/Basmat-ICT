# Basmat ICT Portal — Sprint 12

## Unified Notifications & Activity Center

Sprint 12 unifies important operational activity in Admin and adds a customer notification center.

### Admin
- Unified notification center with filters: unread, action required, sales, projects, finance, support.
- Existing Sprint 11.3 action tracking remains active.
- New admin notifications for RFQ and consultation requests.
- Read all / refresh / action workflow.

### Customer Portal
- New `/portal/notifications` page.
- Notifications for quotation sent, new project, project document, issued invoice, and admin support reply.
- RLS ensures each customer only sees their own notifications.
- Read/unread state and direct links to the related portal area.

### Installation
1. Extract this ZIP over the Basmat-ICT project.
2. Run `supabase/sprint12_unified_notifications.sql` in Supabase SQL Editor.
3. Run `npm run dev`.
4. Test `/admin/notifications` and `/portal/notifications`.
