# Basmat ICT Portal — Sprint 14.2

## Staff User Management
- التسجيل العام يبقى للعميل فقط.
- إنشاء Manager / Sales / Engineer / Support من `/admin/access-control` بواسطة Administrator فقط.
- لا يستطيع الموظف اختيار دوره بنفسه.
- النظام ينشئ كلمة مرور مؤقتة ويعرضها مرة للإدارة لتسليمها للموظف.
- تفعيل/إيقاف حساب الموظف وتغيير دوره من Access Control.
- إنشاء المستخدم يتم داخل Supabase Edge Function باستخدام Service Role، ولا يتم كشف Service Role داخل React.

## بعد فك الضغط
1. شغّل `supabase/sprint14_2_staff_user_management.sql` في SQL Editor.
2. انشر Edge Function بالأمر:
   `npx supabase functions deploy create-staff-user`
3. شغّل `npm run dev`.
4. افتح `/admin/access-control` وأنشئ حسابات اختبار Manager / Sales / Engineer / Support.
5. سجّل دخول كل حساب من `/admin/login` واختبر صلاحيات Sprint 14.1.
