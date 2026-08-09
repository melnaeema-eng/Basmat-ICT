# Basmat ICT — Sprint 3 Final Integration

هذه الحزمة تستبدل صفحتي:

- `src/pages/Admin/AdminRFQs.jsx`
- `src/pages/Admin/AdminConsultations.jsx`

بالنسختين الكاملتين بعد دمج `RequestWorkflowPanel`.

## التركيب

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-3-Final.zip" `
  -DestinationPath . `
  -Force
```

ثم:

```powershell
npm run dev
```

## الاختبار

1. افتح `/admin/rfqs`
2. تأكد من ظهور قسم **إدارة الطلب** داخل كل RFQ.
3. اختر المسؤول والأولوية والحالة وأدخل ملاحظة داخلية.
4. اضغط **حفظ التحديث**.
5. أعد تحميل الصفحة وتأكد من بقاء البيانات.
6. كرر نفس الاختبار في `/admin/consultations`.

> هذه الحزمة تفترض أنك نفذت بالفعل `supabase/sprint3_crm_workflow.sql`
> وأن ملف `src/components/admin/RequestWorkflowPanel.jsx` موجود من Sprint 3.
