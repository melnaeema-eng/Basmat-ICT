# Basmat ICT — Sprint 8 Unified Customer & Project Workflow

هذا Sprint يجمع تعديلات 7.1 وكل ما تم الاتفاق عليه بعدها.

## ماذا يشمل؟
- العميل الموجود مسبقًا لا يحتاج إعادة تسجيل أو ربط يدوي من الأدمن.
- تسجيل دخول / إنشاء حساب / نسيت كلمة المرور / العودة للموقع.
- حفظ الوجهة الأصلية والرجوع إلى `/quote` أو `/consultation`.
- إجبار حساب العميل قبل:
  - طلب عرض السعر.
  - طلب الاستشارة.
  - `/project` و`/have-project` كمسارات "عندك مشروع".
- ربط RFQ والاستشارة تلقائيًا بـ `customer_id`.
- قسم "طلباتي" يجمع RFQ + Consultation.
- NDA آلي عند اختيار NDA:
  - إنشاء سجل NDA.
  - إرسال بريد تلقائي.
  - قبول إلكتروني من البورتال.
- عرض السعر المنشأ من RFQ يرث `customer_id` تلقائيًا.
- مركز سير عمل للأدمن `/admin/workflow`.
- تحويل عرض السعر المقبول إلى مشروع تشغيلي بنقرة واحدة.
- المشروع يظهر في إدارة المشاريع / التنفيذ والتجاري.

## التثبيت

### 1) نسخة احتياطية Git
يفضل أن تكون نسخة Sprint 7.1 الحالية مرفوعة بالفعل.

### 2) فك الحزمة
```powershell
cd C:\projects\Basmat-ICT

Expand-Archive `
  "$env:USERPROFILE\Downloads\Basmat-ICT-Sprint-8-Unified.zip" `
  -DestinationPath . `
  -Force
```

### 3) Supabase SQL
شغّل:
`supabase/sprint8_unified_workflow.sql`

### 4) Deploy NDA Edge Function
```powershell
cd C:\projects\Basmat-ICT
npx supabase functions deploy send-nda-email
```

إذا كان الدومين النهائي مختلفًا:
```powershell
npx supabase secrets set SITE_URL=https://ict.basmat-alnawabig.com.sa
```

### 5) تشغيل
```powershell
npm run dev
```

## اختبار Sprint 8
1. افتح `/quote` بدون تسجيل → Login.
2. جرّب بريد مستخدم قديم → دخول بدون ربط يدوي من الأدمن.
3. جرّب "نسيت كلمة المرور".
4. جرّب "إنشاء حساب" وبريد مسجل مسبقًا → رسالة توجه للدخول.
5. أرسل RFQ بدون NDA → يظهر في `/portal/requests`.
6. أرسل RFQ مع NDA → يصل البريد وتظهر NDA في الطلبات.
7. اقبل NDA من `/portal/nda/:id`.
8. اختبر `/consultation` بنفس حساب العميل.
9. من الأدمن أنشئ عرض سعر من RFQ → العميل مرتبط تلقائيًا.
10. العميل يقبل عرض السعر.
11. افتح `/admin/workflow` واضغط "تحويل إلى مشروع".
12. تحقق من المشروع في `/admin/project-management` و`/admin/project-commercial`.

## ملاحظة قانونية
ميزة NDA تسجل قبولًا إلكترونيًا داخل النظام (اسم، بريد، وقت، User-Agent، نص الإقرار).
إذا احتجت توقيعًا رقميًا مؤهلًا بشهادة رقمية، يمكن لاحقًا ربط DocuSign أو Adobe Acrobat Sign.
