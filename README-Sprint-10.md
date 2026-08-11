# Basmat ICT — Sprint 10

## Project Documents & Deliverables

Sprint 10 adds a dedicated project-document workflow to Admin and Customer Portal.

### Included
- `ict_project_documents` table.
- Private Supabase Storage bucket: `project-documents`.
- Admin RLS: full document/file management.
- Customer RLS: read/download own customer documents only.
- Admin page: `/admin/project-documents`.
- Customer page: `/portal/documents`.
- Upload, download, delete, document type, revision, status, issue date and notes.
- Project/customer linkage.

## Installation
1. Extract the Sprint 10 ZIP over the Basmat-ICT project folder.
2. Run `supabase/sprint10_project_documents.sql` in Supabase SQL Editor.
3. Run `npm run dev`.
4. Test Admin upload/download and Customer Portal download.
5. After success, commit and push to GitHub.

## Important
The `project-documents` bucket is private. Customer file paths are stored as:

`<customer_id>/<project_id>/<timestamp>-<filename>`

This is used by the Storage RLS policy to isolate customer files.
