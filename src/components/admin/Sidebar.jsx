import {
  FaBell,
  FaCalendarCheck,
  FaChartPie,
  FaChartSimple,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaGear,
  FaHandshake,
  FaHouse,
  FaHeadset,
  FaLayerGroup,
  FaListCheck,
  FaScrewdriverWrench,
  FaUserGroup,
  FaUsers,
  FaUserTie,
} from "react-icons/fa6";
import { Link, NavLink } from "react-router-dom";

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
      ["مستندات المشاريع", "/admin/project-documents", FaFolderOpen],
      ["الدعم والتذاكر", "/admin/support", FaHeadset],
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

export default function Sidebar({ menuOpen, onClose }) {
  return (
    <aside
      className={[
        "fixed inset-y-0 right-0 z-40 w-72 bg-[#041632] text-white shadow-2xl transition-transform duration-300 lg:translate-x-0",
        menuOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="flex min-h-28 items-center gap-4 border-b border-white/10 px-6">
        <img src="/logo.png" alt="بصمة النوابغ"
          className="h-16 w-16 rounded-full bg-white object-contain" />
        <div>
          <h1 className="text-xl font-black">بصمة النوابغ</h1>
          <p className="mt-1 text-xs font-bold tracking-wider text-blue-200">
            ADMIN PORTAL
          </p>
        </div>
      </div>

      <nav className="flex h-[calc(100vh-7rem)] flex-col overflow-y-auto px-4 py-6">
        {groups.map((group, index) => (
          <div key={group.title} className={index ? "mt-8" : ""}>
            <p className="px-3 text-xs font-black tracking-wider text-blue-300">
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
                      "flex items-center gap-3 rounded-2xl px-4 py-4 font-bold transition",
                      isActive
                        ? "bg-[#ff7417] text-white shadow-lg"
                        : "text-blue-100 hover:bg-white/10",
                    ].join(" ")
                  }
                >
                  <Icon className="text-xl" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-auto pt-8">
          <Link to="/"
            className="flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-4 font-bold">
            <FaHouse />
            العودة إلى الموقع
          </Link>
        </div>
      </nav>
    </aside>
  );
}
