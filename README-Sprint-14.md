# Basmat ICT Portal — Sprint 14

## Admin Roles & Permissions

Sprint 14 adds role-based access control for the existing admin roles:
- admin
- manager
- sales
- engineer

### Added
- `/admin/access-control`
- Permission matrix by role
- Enable/disable admin accounts
- Change admin roles
- Sidebar automatically hides modules without permission
- Route guard for the Access Control page

### Install
1. Extract this ZIP over the project root.
2. Run `supabase/sprint14_roles_permissions.sql` in Supabase SQL Editor.
3. Restart Vite with `npm run dev`.
4. Test `/admin/access-control` using an account with role `admin`.

### Important
The existing `admin` role always retains access to the Access Control page to prevent accidental lockout.
