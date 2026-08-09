# Basmat ICT — Admin Documents RLS Fix

هذا Hotfix مخصص فقط لمشكلة عدم ظهور المستندات قبل Sprint 2.

## 1) فك الضغط

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Admin-Documents-RLS-Fix.zip" `
  -DestinationPath . `
  -Force
```

## 2) شغّل SQL

افتح Supabase > SQL Editor وشغّل:

supabase/admin_documents_rls_fix.sql

## 3) أعد تشغيل المشروع

```powershell
Ctrl + C
npm run dev
```

ثم Ctrl + Shift + R في المتصفح وافتح:

http://localhost:5173/admin/documents

## مهم

السياسات في هذا Hotfix مؤقتة وتسمح بالقراءة قبل تركيب تسجيل دخول الإدارة.
بعد التأكد من ظهور المستندات، Sprint 2 سيستبدلها بسياسات Admin-only.
