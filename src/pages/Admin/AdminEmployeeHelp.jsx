import { Link } from "react-router-dom";
import { FaBookOpen, FaCircleCheck, FaShieldHalved, FaRoute } from "react-icons/fa6";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const roleNames={admin:"مدير النظام",manager:"الإدارة",sales:"المبيعات",engineer:"الهندسة",support:"الدعم",hr:"الموارد البشرية",finance:"المالية",it:"تقنية المعلومات"};

const guides=[
 ["الدخول والأمان","سجّل الدخول من بوابة الإدارة. إذا كان 2FA مفعّلًا أكمل رمز التحقق قبل فتح صفحات الإدارة."],
 ["الصلاحيات","القائمة تعرض الموديولات المسموحة لدورك فقط. كتابة رابط مباشر لا تتجاوز الصلاحية؛ الصفحة المحمية ترفض الدخول."],
 ["سير العمل","ابدأ من مركز سير العمل لمعرفة المرحلة الحالية: طلب/استشارة → NDA → عرض سعر → قبول → مشروع → تنفيذ → فوترة وتحصيل → إغلاق."],
 ["المستندات","ارفع مستندات المشروع من مستندات المشاريع، واستخدم رقم المشروع/العميل الصحيح حتى تبقى الوثائق مرتبطة بسجلها."],
 ["الإشعارات","راجع الإشعارات للمهام والتحديثات التي تحتاج إجراء، ثم افتح الموديول المرتبط لإكمال العمل."],
 ["عند ظهور خطأ","انسخ نص الخطأ واسم الصفحة، ثم أرسله لفريق تقنية المعلومات. لا تغيّر قاعدة البيانات أو الصلاحيات يدويًا."]
];

export default function AdminEmployeeHelp(){
 const {adminProfile}=useAdminAuth();
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1300px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">EMPLOYEE HELP CENTER</span><h1 className="erp-page-title">دليل ومساعدة الموظف</h1><p className="erp-page-subtitle">دليل استخدام مختصر وآمن لموظفي بصمة النوابغ داخل نظام ERP.</p></div><FaBookOpen className="text-4xl text-[#ff7417]"/></section>
  <section className="erp-card mt-6 p-6"><p className="font-black text-[#0f2747]">المستخدم: {adminProfile?.full_name||"—"}</p><p className="mt-2 text-slate-500">الدور: {roleNames[adminProfile?.role]||adminProfile?.role||"—"}</p></section>
  <div className="mt-6 grid gap-4 md:grid-cols-2">{guides.map(([t,d],i)=><article key={t} className="erp-card p-6"><div className="flex items-center gap-2"><FaCircleCheck className="text-green-600"/><h2 className="font-black text-[#0f2747]">{t}</h2></div><p className="mt-3 leading-7 text-slate-600">{d}</p></article>)}</div>
  <section className="erp-card mt-6 p-6"><h2 className="flex items-center gap-2 text-xl font-black text-[#0f2747]"><FaRoute/>روابط سريعة</h2><div className="mt-4 flex flex-wrap gap-3"><Link className="erp-btn-secondary" to="/admin/workflow">مركز سير العمل</Link><Link className="erp-btn-secondary" to="/admin/notifications">الإشعارات</Link><Link className="erp-btn-secondary" to="/admin/mfa"><FaShieldHalved/>الأمان و2FA</Link></div></section>
 </div></div>
}