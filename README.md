# Sprint 7.1 Final Integration

تستبدل هذه الحزمة فقط:
- src/App.jsx
- src/layouts/CustomerPortalLayout.jsx

وتضيف:
- /portal/register
- /portal/requests
- حماية /quote
- قسم "طلباتي" في بوابة العميل

## التثبيت
```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-7.1-Final.zip" `
  -DestinationPath . `
  -Force

npm run dev
```

## الاختبار
1. افتح `/quote` بدون دخول.
2. يجب أن ينتقل إلى `/portal/login`.
3. افتح `/portal/register`.
4. أنشئ حساب عميل.
5. سجل الدخول.
6. افتح `/quote`.
7. أرسل طلبًا.
8. اضغط "متابعة طلبي".
9. يجب أن يظهر الطلب في `/portal/requests`.
