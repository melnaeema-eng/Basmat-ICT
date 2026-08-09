# Basmat ICT — Sprint 3
## CRM + Request Workflow

### الوظائف
- فريق عمل من داخل لوحة الإدارة.
- تعيين RFQ أو Consultation لموظف/مهندس.
- الأولوية: منخفضة / عادية / عالية / عاجلة.
- Workflow Status.
- ملاحظات داخلية لا تظهر للعميل.
- سجل نشاط لكل طلب.

## 1) فك الضغط

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-3.zip" `
  -DestinationPath . `
  -Force
```

## 2) قاعدة البيانات

شغّل في Supabase SQL Editor:

```text
supabase/sprint3_crm_workflow.sql
```

## 3) شغل الموقع

```powershell
npm run dev
```

اختبر أولًا:

```text
/admin/team
```

وأضف عضو فريق واحد على الأقل.

## 4) دمج Workflow

اتبع الملف:

```text
PATCH-RFQ-AND-CONSULTATIONS.md
```

هذا متعمد حتى لا نستبدل نسختك الحالية من AdminRFQs/AdminConsultations ونفقد أي تعديلات نجحت عندك.

## 5) الاختبار

- أضف Sales Engineer أو Engineer.
- افتح RFQ.
- عيّن المسؤول.
- اختر الأولوية.
- غير الحالة.
- أضف ملاحظة داخلية.
- احفظ.
- تأكد من ظهور سجل المتابعة.
- أعد تحميل الصفحة وتأكد أن القيم بقيت محفوظة.
