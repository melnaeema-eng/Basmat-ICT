# Basmat ICT — Sprint 6 Corrected

## لماذا توجد نسخة مصححة؟

كان Sprint 6 الأول يعيد استخدام جدول `ict_projects` الموجود أصلًا لإدارة مشاريع الموقع التسويقية. هذا غير صحيح لأن CMS Projects وOperational Projects يجب أن يكونا منفصلين.

هذه النسخة تستخدم جداول جديدة:

- `ict_delivery_projects`
- `ict_delivery_contracts`
- `ict_delivery_tasks`
- `ict_delivery_purchase_orders`
- `ict_delivery_invoices`
- `ict_delivery_payments`

وبذلك لا يتم لمس بيانات مشاريع الموقع القديمة.

## التثبيت

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-6-Corrected.zip" `
  -DestinationPath . `
  -Force
```

ثم شغّل في Supabase SQL Editor:

```text
supabase/sprint6_corrected.sql
```

ثم:

```powershell
npm run dev
```

## الاختبار

1. `/admin/project-management`
2. أنشئ مشروعًا تشغيليًا جديدًا.
3. افتح **العقد والمهام والمالية**.
4. أضف عقدًا.
5. أضف مهمة.
6. أضف PO.
7. أضف فاتورة.
8. سجل دفعة.
9. افتح `/admin/operations`.

## ملاحظة

الصفحات Routes موجودة بالفعل إذا سبق تركيب Sprint 6 Final.
