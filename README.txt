BASMAT ICT — Sprint 8 Accepted Quotation to Project Patch

يشمل:
- يعرض في إدارة المشاريع فقط عروض الأسعار Accepted التي لم تتحول إلى مشروع.
- زر "تحويل إلى مشروع".
- يمنع تحويل نفس العرض مرتين.
- يسحب تلقائيًا:
  customer_id
  quotation_id
  rfq_id
  consultation_id
  قيمة العرض
  موضوع العرض
  الملاحظات / scope
- يبدأ المشروع بالحالة planning والتقدم 0%.
- يظهر المشروع تلقائيًا في بوابة العميل حسب customer_id.
- يظل نموذج المشروع اليدوي للحالات المباشرة فقط.

التثبيت:

1) فك الملف داخل المشروع:
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-Sprint8-Accepted-Quotation-to-Project.zip" `
  -DestinationPath . `
  -Force

2) شغّل في Supabase SQL Editor:
supabase/accepted_quotation_to_project.sql

3) شغّل:
npm run dev

الاختبار:
- العميل يقبل عرض سعر.
- الإدارة > إدارة المشاريع.
- يظهر العرض في "عروض مقبولة بانتظار التحويل".
- اضغط "تحويل إلى مشروع".
- يفتح التنفيذ والتجاري للمشروع.
- ارجع إدارة المشاريع: العرض لا يظهر مرة أخرى في الانتظار.
- ادخل بحساب العميل > المشاريع: يظهر المشروع.
