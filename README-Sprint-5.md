# Basmat ICT — Sprint 5
## CRM + Sales Pipeline + Follow-ups

## الجديد

- CRM Dashboard.
- قاعدة بيانات العملاء.
- أفراد وشركات.
- Sales Pipeline.
- مراحل:
  - New
  - Qualified
  - Proposal
  - Negotiation
  - Won
  - Lost
- قيمة الفرصة.
- Probability.
- Weighted Pipeline.
- ربط الفرصة بعميل.
- ربط الفرصة بـ RFQ.
- ربط الفرصة بموظف/مهندس.
- مواعيد ومتابعات:
  - Call
  - Email
  - Meeting
  - Visit
  - Task
- عرض المتابعات المتأخرة.
- تحويل المتابعة إلى Completed.
- دالة SQL اختيارية لإنشاء عميل من RFQ.

## 1) فك الضغط

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-5.zip" `
  -DestinationPath . `
  -Force
```

## 2) Supabase

شغّل في SQL Editor:

```text
supabase/sprint5_crm_pipeline.sql
```

## 3) التشغيل

```powershell
npm run dev
```

## 4) الاختبار

افتح:

```text
/admin/crm
/admin/customers
/admin/pipeline
/admin/followups
```

### Test 1 — Customer

أضف عميلًا جديدًا ثم تأكد أنه يظهر في صفحة العملاء.

### Test 2 — Opportunity

من صفحة العملاء اضغط:

```text
إنشاء فرصة
```

أضف فرصة وقيمة متوقعة وحدد المسؤول.

### Test 3 — Pipeline

غيّر الفرصة بين مراحل Pipeline وتأكد أن انتقالها يحفظ في قاعدة البيانات.

### Test 4 — Follow-up

أضف اتصالًا أو اجتماعًا بموعد قادم ثم أكمله.

### Test 5 — CRM Dashboard

تأكد من:
- عدد العملاء.
- الفرص المفتوحة.
- Weighted Pipeline.
- المتابعات المتأخرة.
- قيمة الفرص الرابحة.

## مهم

Sprint 5 لا يغيّر RFQ أو Quotations أو Email Function من Sprint 4.
