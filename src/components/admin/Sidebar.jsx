import {
  FaBell,
  FaCalendarCheck,
  FaClockRotateLeft,
  FaCalendarDays,
  FaChartPie,
  FaChartSimple,
  FaGaugeHigh,
  FaChartLine,
  FaBuildingColumns,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaGear,
  FaShieldHalved,
  FaHandshake,
  FaHouse,
  FaHeadset,
  FaLayerGroup,
  FaListCheck,
  FaMoneyBillTrendUp,
  FaBookOpen,
  FaBoxesStacked,
  FaCartShopping,
  FaScrewdriverWrench,
  FaUserGroup,
  FaSackDollar,
  FaUsers,
  FaUserTie,
} from "react-icons/fa6";
import { Link, NavLink } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const groups = [
  {
    title: "إدارة الطلبات",
    items: [
      ["لوحة التحكم", "/admin", FaChartPie, true],
      ["رسائل التواصل", "/admin/contacts", FaEnvelope],
      ["طلبات عرض السعر", "/admin/rfqs", FaFileInvoiceDollar],
      ["طلبات الاستشارات", "/admin/consultations", FaUserTie],
      ["المستندات", "/admin/documents", FaFolderOpen],
    ],
  },
  {
    title: "CRM والمبيعات",
    items: [
      ["CRM Dashboard", "/admin/crm", FaChartSimple],
      ["العملاء", "/admin/customers", FaUsers],
      ["Sales Pipeline", "/admin/pipeline", FaHandshake],
      ["المتابعات", "/admin/followups", FaCalendarCheck],
      ["عروض الأسعار", "/admin/quotations", FaFileInvoiceDollar],
      ["الإشعارات", "/admin/notifications", FaBell],
      ["التحليلات", "/admin/analytics", FaChartSimple],
      ["التقارير التنفيذية", "/admin/executive-reports", FaChartPie],
      ["مركز القيادة والحوكمة", "/admin/executive-control", FaGaugeHigh],
      ["فريق العمل", "/admin/team", FaUserGroup],
    ],
  },
  {
    title: "رحلة العميل",
    items: [
      ["مركز سير العمل", "/admin/workflow", FaListCheck],
      ["مستخدمو بوابة العملاء", "/admin/portal-users", FaUserGroup],
    ],
  },
  {
    title: "المشاريع والتجاري",
    items: [
      ["Operations Dashboard", "/admin/operations", FaChartSimple],
      ["إدارة المشاريع", "/admin/project-management", FaLayerGroup],
      ["التنفيذ والتجاري", "/admin/project-commercial", FaListCheck],
      ["تكلفة وربحية المشاريع", "/admin/project-cost-control", FaChartLine],
      ["مستندات المشاريع", "/admin/project-documents", FaFolderOpen],
      ["الدعم والتذاكر", "/admin/support", FaHeadset],
      ["إدارة الخدمات وSLA", "/admin/service-management", FaChartLine],
    ],
  },
  {
    title: "المالية والمشتريات",
    items: [
      ["المالية والتحصيل", "/admin/finance", FaMoneyBillTrendUp],
      ["المحاسبة والقيود", "/admin/accounting", FaBookOpen],
      ["التخطيط المالي والميزانيات", "/admin/financial-planning", FaChartLine],
      ["الخزينة والذمم", "/admin/treasury", FaBuildingColumns],
      ["الرقابة المالية والإقفال", "/admin/financial-control", FaChartLine],
      ["أوامر البيع والفوترة والتحصيل", "/admin/order-to-cash", FaChartLine],
      ["العقود وSLA والفوترة المتكررة", "/admin/contract-lifecycle", FaChartLine],
      ["الشراء والاستلام ومطابقة الموردين", "/admin/procure-to-pay", FaChartLine],
      ["المشتريات والموردون", "/admin/procurement", FaCartShopping],
      ["المخزون والأصول", "/admin/inventory-assets", FaBoxesStacked],
    ],
  },
  {
    title: "إدارة النظام",
    items: [
      ["الصلاحيات والأدوار", "/admin/access-control", FaShieldHalved],
      ["الأمان و2FA", "/admin/mfa", FaShieldHalved],
      ["سجل النشاط", "/admin/activity-log", FaClockRotateLeft],
      ["الموارد البشرية", "/admin/hr", FaUserGroup],
      ["الحضور والإجازات", "/admin/attendance-leave", FaCalendarDays],
    ],
  },
  {
    title: "إدارة محتوى الموقع",
    items: [
      ["مشاريع الموقع", "/admin/projects", FaLayerGroup],
      ["الخدمات", "/admin/services", FaScrewdriverWrench],
      ["الشركاء", "/admin/partners", FaHandshake],
      ["الإعدادات", "/admin/settings", FaGear],
    ],
  },
];

const permissionForPath = (path) => {
  if (path === "/admin") return "dashboard";
  if (["/admin/contacts","/admin/rfqs","/admin/consultations","/admin/documents","/admin/workflow","/admin/portal-users"].includes(path)) return "requests";
  if (["/admin/crm","/admin/customers","/admin/pipeline","/admin/followups"].includes(path)) return "crm";
  if (path.startsWith("/admin/quotations")) return "quotations";
  if (["/admin/operations","/admin/project-management","/admin/project-commercial"].includes(path)) return "operations";
  if (path === "/admin/project-cost-control") return "project_cost_control";
  if (path === "/admin/project-documents") return "documents";
  if (path === "/admin/support") return "support";
  if (path === "/admin/service-management") return "service_management";
  if (path === "/admin/notifications") return "notifications";
  if (["/admin/analytics","/admin/executive-reports"].includes(path)) return "reports";
  if (path === "/admin/executive-control") return "executive_control";
  if (path === "/admin/team") return "team";
  if (path === "/admin/access-control") return "access_control";
  if (path === "/admin/mfa") return null;
  if (path === "/admin/activity-log") return "access_control";
  if (path === "/admin/hr") return "hr";
  if (path === "/admin/payroll") return "payroll";
  if (path === "/admin/finance") return "finance";
  if (path === "/admin/accounting") return "accounting";
  if (path === "/admin/financial-planning") return "financial_planning";
  if (path === "/admin/treasury") return "treasury";
  if (path === "/admin/financial-control") return "financial_control";
  if (path === "/admin/order-to-cash") return "order_to_cash";
  if (path === "/admin/contract-lifecycle") return "contract_lifecycle";
  if (path === "/admin/procure-to-pay") return "procure_to_pay";
  if (path === "/admin/procurement") return "procurement";
  if (path === "/admin/inventory-assets") return "inventory";
  if (path === "/admin/attendance-leave") return null;
  if (["/admin/projects","/admin/services","/admin/partners","/admin/settings"].includes(path)) return "content";
  return "dashboard";
};

export default function Sidebar({ menuOpen, onClose }) {
  const { hasPermission } = useAdminAuth();
  const visibleGroups = groups.map(group => ({...group, items: group.items.filter(([,path]) => hasPermission(permissionForPath(path)))})).filter(group => group.items.length);
  return (
    <aside
      className={[
        "erp-sidebar fixed inset-y-0 right-0 z-40 w-72 border-l border-slate-200 bg-white text-slate-700 shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-transform duration-300 lg:translate-x-0",
        menuOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="flex min-h-24 items-center gap-3 border-b border-slate-100 px-5">
        <img src="/logo.png" alt="بصمة النوابغ"
          className="h-12 w-12 rounded-2xl border border-slate-100 bg-white object-contain p-1 shadow-sm" />
        <div>
          <h1 className="text-[17px] font-black text-[#0f2747]">بصمة النوابغ</h1>
          <p className="mt-1 text-[10px] font-black tracking-[0.16em] text-slate-400">
            BASMAT ERP
          </p>
        </div>
      </div>

      <nav className="erp-scroll flex h-[calc(100vh-6rem)] flex-col overflow-y-auto px-3 py-5">
        {visibleGroups.map((group, index) => (
          <div key={group.title} className={index ? "mt-8" : ""}>
            <p className="px-3 text-[11px] font-black tracking-wide text-slate-400">
              {group.title}
            </p>

            <div className="mt-4 space-y-2">
              {group.items.map(([label, path, Icon, end]) => (
                <NavLink
                  key={path}
                  to={path}
                  end={Boolean(end)}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] font-bold transition",
                      isActive
                        ? "bg-[#ff7417] text-white shadow-sm ring-1 ring-[#ff7417]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#0f2747]",
                    ].join(" ")
                  }
                >
                  <Icon className="text-[17px]" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-auto pt-8">
          <Link to="/"
            className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-600 hover:border-slate-300 hover:bg-white">
            <FaHouse />
            العودة إلى الموقع
          </Link>
        </div>
      </nav>
    </aside>
  );
}
