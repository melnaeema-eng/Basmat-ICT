import {
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaHouse,
  FaListCheck,
  FaRightFromBracket,
} from "react-icons/fa6";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { useCustomerAuth } from "../contexts/CustomerAuthContext";

export default function CustomerPortalLayout() {
  const {
    profile,
    signOut,
  } = useCustomerAuth();

  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/portal/login", {
      replace: true,
    });
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100"
    >
      <header className="border-b border-slate-200 bg-[#071d49] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="بصمة النوابغ"
              className="h-14 w-14 rounded-full bg-white object-contain"
            />

            <div>
              <h1 className="text-xl font-black">
                بوابة عملاء بصمة النوابغ
              </h1>

              <p className="mt-1 text-sm text-blue-200">
                {profile?.customer
                  ?.company_name ||
                  profile?.customer?.name ||
                  profile?.full_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/20"
          >
            <FaRightFromBracket />
            تسجيل الخروج
          </button>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3">
          <PortalLink
            to="/portal"
            icon={<FaHouse />}
            label="الرئيسية"
            end
          />

          <PortalLink
            to="/portal/requests"
            icon={<FaListCheck />}
            label="طلباتي"
          />

          <PortalLink
            to="/portal/quotations"
            icon={<FaFileInvoiceDollar />}
            label="عروض الأسعار"
          />

          <PortalLink
            to="/portal/projects"
            icon={<FaFolderOpen />}
            label="المشاريع"
          />

          <PortalLink
            to="/portal/invoices"
            icon={<FaFileInvoiceDollar />}
            label="الفواتير"
          />
        </div>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

function PortalLink({
  to,
  icon,
  label,
  end,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold transition",
          isActive
            ? "bg-[#ff7417] text-white"
            : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
