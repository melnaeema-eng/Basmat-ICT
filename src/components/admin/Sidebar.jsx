import {
  FaChartPie,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaGear,
  FaGift,
  FaHandshake,
  FaHouse,
  FaLayerGroup,
  FaScrewdriverWrench,
} from "react-icons/fa6";
import { Link, NavLink } from "react-router-dom";

const navigationGroups = [
  {
    title: "إدارة الطلبات",
    items: [
      {
        label: "لوحة التحكم",
        path: "/admin",
        icon: FaChartPie,
        end: true,
      },
      {
        label: "رسائل التواصل",
        path: "/admin/contacts",
        icon: FaEnvelope,
      },
      {
        label: "طلبات عرض السعر",
        path: "/admin/rfqs",
        icon: FaFileInvoiceDollar,
      },
      {
        label: "طلبات الاستشارات",
        path: "/admin/consultations",
        icon: FaGift,
      },
      {
        label: "المستندات",
        path: "/admin/documents",
        icon: FaFolderOpen,
      },
    ],
  },
  {
    title: "إدارة المحتوى",
    items: [
      {
        label: "المشاريع",
        path: "/admin/projects",
        icon: FaLayerGroup,
      },
      {
        label: "الخدمات",
        path: "/admin/services",
        icon: FaScrewdriverWrench,
      },
      {
        label: "الشركاء",
        path: "/admin/partners",
        icon: FaHandshake,
      },
      {
        label: "الإعدادات",
        path: "/admin/settings",
        icon: FaGear,
      },
    ],
  },
];

export default function Sidebar({
  menuOpen,
  onClose,
}) {
  return (
    <aside
      className={[
        "fixed inset-y-0 right-0 z-40 w-72 bg-[#041632]",
        "text-white shadow-2xl transition-transform duration-300",
        "lg:translate-x-0",
        menuOpen
          ? "translate-x-0"
          : "translate-x-full",
      ].join(" ")}
    >
      <div className="flex min-h-28 items-center gap-4 border-b border-white/10 px-6">
        <img
          src="/logo.png"
          alt="شعار بصمة النوابغ"
          className="h-16 w-16 rounded-full bg-white object-contain"
        />

        <div>
          <h1 className="text-xl font-black">
            بصمة النوابغ
          </h1>

          <p className="mt-1 text-xs font-bold tracking-wider text-blue-200">
            ADMIN PORTAL
          </p>
        </div>
      </div>

      <nav className="flex h-[calc(100vh-7rem)] flex-col overflow-y-auto px-4 py-6">
        {navigationGroups.map((group, groupIndex) => (
          <div
            key={group.title}
            className={groupIndex > 0 ? "mt-8" : ""}
          >
            <p className="px-3 text-xs font-black tracking-wider text-blue-300">
              {group.title}
            </p>

            <div className="mt-4 space-y-2">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded-2xl px-4 py-4",
                        "font-bold transition duration-200",
                        isActive
                          ? "bg-[#ff7417] text-white shadow-lg"
                          : "text-blue-100 hover:bg-white/10 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <Icon className="text-xl" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-auto pt-8">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-4 font-bold text-white transition hover:bg-white/20"
          >
            <FaHouse />
            العودة إلى الموقع
          </Link>
        </div>
      </nav>
    </aside>
  );
}
