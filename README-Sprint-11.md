# Basmat ICT — Sprint 11

## Customer Support Tickets

Sprint 11 adds a complete support workflow between the Admin portal and Customer Portal.

### Included
- `ict_support_tickets`
- `ict_support_messages`
- Customer creates a ticket and selects an optional project
- Customer replies and follows ticket status
- Admin sees all tickets and customer/project information
- Admin replies, changes status and priority
- Admin internal notes hidden from customers
- RLS for Admin and Customer Portal
- Routes and navigation for Admin and Portal

### Routes
- `/admin/support`
- `/portal/support`

### Installation
1. Extract the Sprint ZIP over the project root.
2. Run `supabase/sprint11_support_tickets.sql` in Supabase SQL Editor.
3. Run `npm run dev`.
4. Test customer ticket creation and Admin reply.
