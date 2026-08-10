BASMAT ICT — Sprint 8 Consultation to Quotation Patch

يشمل:
- زر "إنشاء عرض سعر من الاستشارة".
- فتح:
  /admin/quotations/new?consultation=<ID>
- تعبئة:
  customer_id
  اسم العميل
  الشركة
  البريد
  الجوال
  نوع/موضوع الاستشارة
  التفاصيل
- حفظ consultation_id داخل ict_quotations.
- عند إرسال العرض تتحول حالة الاستشارة إلى quoted.
- منع إنشاء أكثر من عرض واحد لنفس الاستشارة عبر unique index.

التثبيت:
1) فك ZIP داخل:
C:\projects\Basmat-ICT

2) شغّل في Supabase SQL Editor:
supabase/consultation_to_quotation.sql

3) ثم:
npm run dev

الاختبار:
الإدارة > طلبات الاستشارات
→ إنشاء عرض سعر من الاستشارة
→ يجب أن يفتح محرر العرض مع بيانات العميل والاستشارة
→ احفظ وأرسل
→ يجب أن تظهر حالة الاستشارة quoted
→ يظهر العرض للعميل
→ العميل يقبل/يرفض كالمعتاد.
