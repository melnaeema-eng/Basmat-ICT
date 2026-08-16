import {
  FaBars,
  FaHouse,
  FaRightFromBracket,
  FaXmark,
  FaChevronLeft,
} from "react-icons/fa6";
import { Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const titles = {
  "/admin": "لوحة ERP",
  "/admin/crm": "إدارة علاقات العملاء",
  "/admin/customers": "العملاء",
  "/admin/pipeline": "مسار المبيعات",
  "/admin/quotations": "عروض الأسعار",
  "/admin/operations": "العمليات",
  "/admin/project-management": "إدارة المشاريع",
  "/admin/project-commercial": "التنفيذ والتجاري",
  "/admin/hr": "الموارد البشرية",
  "/admin/attendance-leave": "الحضور والإجازات",
  "/admin/support": "الدعم والتذاكر",
  "/admin/access-control": "الصلاحيات والأدوار",
};

export default function Topbar({ menuOpen, onToggleMenu }) {
  const { adminProfile, user, signOut } = useAdminAuth();
  const location = useLocation();
  const displayName = adminProfile?.full_name || user?.email || "Administrator";
  const pageTitle =
    titles[location.pathname] ||
    (location.pathname.startsWith("/admin/quotations") ? "عروض الأسعار" : "BASMAT ERP");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link to="/admin" className="flex items-center gap-3">
          <img src="/logo.png" alt="بصمة النوابغ" className="h-10 w-10 rounded-xl border border-slate-100 object-contain p-1" />
          <div>
            <p className="text-sm font-black text-[#0f2747]">BASMAT ERP</p>
            <p className="max-w-44 truncate text-[11px] text-slate-400">{pageTitle}</p>
          </div>
        </Link>
        <button type="button" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={menuOpen}
          onClick={onToggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-[#0f2747] shadow-sm">
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </header>

      <header className="hidden min-h-20 items-center justify-between border-b border-slate-200/80 bg-white px-7 lg:flex">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>BASMAT ERP</span><FaChevronLeft className="text-[9px]" /><span>{pageTitle}</span>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f2747]">{pageTitle}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="ml-2 hidden text-left xl:block">
            <p className="max-w-56 truncate text-sm font-black text-slate-700">{displayName}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{adminProfile?.role || "USER"}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f2747] text-sm font-black text-white">
            {(displayName || "B").trim().charAt(0).toUpperCase()}
          </div>
          <Link to="/" className="erp-btn-secondary inline-flex items-center gap-2"><FaHouse /> الموقع</Link>
          <button type="button" onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600">
            <FaRightFromBracket /> خروج
          </button>
        </div>
      </header>
    </>
  );
}
