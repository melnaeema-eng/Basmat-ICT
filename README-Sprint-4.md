# Basmat ICT — Sprint 4
## Quotations + PDF/Print + Notifications + Email + Analytics

## الوظائف الجديدة

- إدارة عروض الأسعار.
- إنشاء عرض من الصفر.
- إمكانية إنشاء العرض من RFQ عبر:
  `/admin/quotations/new?rfq=RFQ_UUID`
- بنود متعددة، كمية، سعر وحدة، ضريبة وإجمالي.
- حفظ العرض في Supabase.
- طباعة العرض أو حفظه PDF من المتصفح.
- إرسال العرض بالبريد عبر Supabase Edge Function + Resend.
- إشعارات داخل النظام للـ RFQ والاستشارات والعروض الجديدة.
- صفحة Analytics.
- RLS للإدارة فقط.

## 1) فك الضغط

```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-4.zip" `
  -DestinationPath . `
  -Force
```

## 2) قاعدة البيانات

في Supabase SQL Editor شغّل:

```text
supabase/sprint4_quotations_notifications.sql
```

## 3) التشغيل المحلي بدون البريد

```powershell
npm run dev
```

اختبر:

```text
/admin/quotations
/admin/quotations/new
/admin/notifications
/admin/analytics
```

## 4) حفظ PDF

افتح عرض السعر ثم اضغط:

```text
طباعة / حفظ PDF
```

في نافذة الطباعة اختر:

```text
Save as PDF / حفظ كملف PDF
```

هذا الأسلوب يحافظ على العربية وتنسيق العرض بشكل أفضل من توليد PDF في المتصفح بمكتبات لا تحتوي خطًا عربيًا.

## 5) تفعيل إرسال البريد - Resend

تحتاج حساب Resend ودومين/مرسل موثق.

في Supabase CLI:

```powershell
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set "MAIL_FROM=Basmat Alnawabigh ICT <sales@YOUR-VERIFIED-DOMAIN>"
```

ثم:

```powershell
supabase functions deploy send-quotation-email
```

Supabase Edge Functions تعمل بـ Deno/TypeScript ويمكن استخدامها للبريد المعاملاتي، ومفاتيح الخدمات الخارجية تحفظ كـ project secrets.

## 6) الاختبار

1. أنشئ عرض سعر.
2. أضف بندين.
3. تأكد من حساب الضريبة والإجمالي.
4. احفظ.
5. اطبع واحفظ PDF.
6. بعد إعداد Resend اضغط إرسال بالبريد.
7. افتح `/admin/notifications`.
8. افتح `/admin/analytics`.

## ملاحظة مهمة

زر البريد لن يعمل قبل ضبط `RESEND_API_KEY` و `MAIL_FROM` ونشر Edge Function.
بقية Sprint 4 تعمل بدون Resend.
