# Basmat ICT — Sprint 2
## Admin Authentication + Secure RLS

## ما تمت إضافته

- `/admin/login`
- Supabase Email/Password Login
- حماية جميع `/admin/*`
- جدول `ict_admin_users`
- Roles:
  - admin
  - manager
  - sales
  - engineer
- تسجيل الخروج
- استبدال صلاحية المستندات المؤقتة بصلاحية Admin فقط
- حماية قراءة/تعديل/حذف:
  - Contact
  - RFQ
  - Consultations
- حماية تنزيل الملفات من `engineering-documents`
- حماية إدارة Projects / Services / Partners / Settings

---

## 1. فك الضغط

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-2.zip" `
  -DestinationPath . `
  -Force
```

---

## 2. نفذ SQL

في Supabase:

```text
SQL Editor
→ New query
```

شغّل:

```text
supabase/admin_auth_and_secure_rls.sql
```

---

## 3. أنشئ مستخدم الإدارة

في Supabase:

```text
Authentication
→ Users
→ Add user
```

أنشئ بريد الإدارة وكلمة المرور.

بعدها انسخ:

```text
User UID
```

ثم نفذ:

```sql
insert into public.ict_admin_users (
  user_id,
  full_name,
  role,
  is_active
)
values (
  'PUT-USER-UUID-HERE',
  'Administrator',
  'admin',
  true
)
on conflict (user_id)
do update set
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
```

---

## 4. التشغيل

```powershell
npm run dev
```

افتح:

```text
http://localhost:5173/admin
```

يجب أن يحولك تلقائيًا إلى:

```text
/admin/login
```

سجل الدخول بالحساب الذي أنشأته.

---

## 5. الاختبار

بعد تسجيل الدخول تأكد من:

- Dashboard تظهر الأعداد.
- Contacts تظهر.
- RFQs تظهر.
- Consultations تظهر.
- Documents تظهر ويمكن تنزيلها.
- Projects تعمل.
- Services تعمل.
- Partners تعمل.
- Settings تعمل.
- Logout يعيدك خارج لوحة الإدارة.

---

## مهم

ملف SQL لا يحذف سياسات INSERT العامة للنماذج، لذلك يجب أن تظل نماذج الموقع العام قادرة على استقبال:
- Contact
- RFQ
- Consultation

بعد نجاح Sprint 2 اختبر نموذج RFQ من الموقع أيضًا للتأكد من استمرار الحفظ.
