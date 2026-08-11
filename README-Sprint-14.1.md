# Basmat ICT Portal — Sprint 14.1

## الهدف
إضافة دور Support وضبط الصلاحيات الفعلية لكل من Manager / Sales / Engineer / Support، مع حماية Routes وليس إخفاء القوائم فقط.

## الأدوار الافتراضية
- Manager: جميع وحدات العمل والإدارة التشغيلية والتقارير والمحتوى، بدون Access Control.
- Sales: الطلبات + CRM + Quotations + Notifications + Reports.
- Engineer: Operations + Project Documents + Support + Notifications + Reports.
- Support: Dashboard + Support + Notifications فقط.
- Admin: وصول كامل.

## الجديد
- Support Role.
- Access Denied page.
- حماية مباشرة للـ Admin routes عند كتابة الرابط يدويًا.
- فصل Notifications عن Reports.
- فصل Team كصلاحية مستقلة.
- تحديث Access Control matrix إلى 5 أدوار.

## اختبار سريع
1. أنشئ/استخدم أربعة حسابات إدارة تجريبية.
2. من `/admin/access-control` عيّن: manager / sales / engineer / support.
3. سجّل الدخول بكل حساب على حدة.
4. تأكد أن الـSidebar يعرض الصفحات المسموح بها فقط.
5. جرّب كتابة رابط غير مسموح يدويًا؛ يجب الانتقال إلى `/admin/access-denied`.

### أمثلة اختبار مباشر
- Sales → `/admin/project-management` = Access Denied.
- Engineer → `/admin/customers` = Access Denied.
- Support → `/admin/support` = مسموح.
- Support → `/admin/executive-reports` = Access Denied.
- Manager → `/admin/access-control` = Access Denied.
