import {
  FaArrowTrendUp,
  FaBoxesStacked,
  FaBuilding,
  FaChartLine,
  FaFileInvoiceDollar,
  FaFolderTree,
  FaHandshake,
  FaHeadset,
  FaMoneyBillTransfer,
  FaPeopleGroup,
  FaShieldHalved,
  FaUserTie,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

const modules = [
  ["CRM والمبيعات", "العملاء، الفرص، المتابعات، RFQ، العروض", "/admin/crm", FaHandshake, "جاهز"],
  ["المشاريع", "التنفيذ، المهام، التجاري، المستندات", "/admin/operations", FaFolderTree, "جاهز"],
  ["الموارد البشرية", "الموظفون، الصلاحيات، الحضور والإجازات", "/admin/hr", FaPeopleGroup, "قيد الإقفال"],
  ["المالية", "AR/AP، الفواتير، التحصيل، المصروفات، VAT", "/admin/project-commercial", FaFileInvoiceDollar, "المرحلة التالية"],
  ["المشتريات", "PR، RFQ Vendors، المقارنة، PO، الاستلام", null, FaBoxesStacked, "المرحلة التالية"],
  ["المخزون والأصول", "المستودعات، Serial، الأصول، العهد", null, FaBuilding, "مخطط"],
  ["Payroll", "الراتب، البدلات، الخصومات، المسير، Payslip", null, FaMoneyBillTransfer, "مخطط"],
  ["الدعم وSLA", "Tickets، Assignment، Escalation، SLA", "/admin/support", FaHeadset, "جاهز"],
  ["الإدارة التنفيذية", "KPI، الربحية، Cash Flow، Budget vs Actual", "/admin/executive-reports", FaChartLine, "يتوسع"],
  ["الأمن والحوكمة", "Roles، RLS، 2FA، Audit Trail", "/admin/access-control", FaShieldHalved, "جاهز"],
];

export default function AdminERPFoundation() {
  return (
    <div dir="rtl" className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-[#061a3a] p-7 text-white shadow-xl md:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-black tracking-wider text-orange-300">BASMAT ERP</p>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              منصة تشغيل موحدة لشركة بصمة النوابغ
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-blue-100">
              المبيعات والمشاريع والموظفون والمالية والمشتريات والدعم في دورة عمل واحدة،
              مع عميل وموظف ومشروع ككيانات رئيسية مشتركة بدل موديولات منفصلة.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <Kpi title="العميل" text="مصدر موحد للعميل عبر CRM والمشاريع والفوترة" icon={<FaUserTie />} />
          <Kpi title="المشروع" text="مركز التكلفة والتنفيذ والمشتريات والإيراد" icon={<FaFolderTree />} />
          <Kpi title="الموظف" text="هوية واحدة للصلاحيات والحضور والرواتب" icon={<FaPeopleGroup />} />
          <Kpi title="المالية" text="تتلقى الحركة من العمليات بدل الإدخال المكرر" icon={<FaArrowTrendUp />} />
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-black text-[#071d49]">خريطة ERP</h2>
          <p className="mt-2 text-slate-600">
            هذه الخريطة تستخدم الموديولات الحالية وتحدد ما سيتم استكماله في السبرنتات الكبيرة القادمة.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(([title, desc, path, Icon, state]) => {
            const body = (
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-2xl text-[#123878]"><Icon /></div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{state}</span>
                </div>
                <h3 className="mt-5 text-xl font-black text-[#071d49]">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{desc}</p>
              </div>
            );
            return path ? <Link key={title} to={path}>{body}</Link> : <div key={title}>{body}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, text, icon }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-2xl text-[#ff7417]">{icon}</div>
      <div className="mt-3 text-lg font-black text-[#071d49]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}
