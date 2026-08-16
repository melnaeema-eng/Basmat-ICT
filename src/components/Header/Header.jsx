import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRightFromBracket,
  FaBars,
  FaChevronDown,
  FaFileInvoiceDollar,
  FaHeadset,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

const navigation = [
  { label: "الرئيسية", sectionId: "home" },
  { label: "عن الشركة", sectionId: "about" },
  { label: "الخدمات", sectionId: "services" },
  { label: "المشاريع", sectionId: "projects" },
  { label: "التقنيات", sectionId: "technology" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useCustomerAuth();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      closeMenu();
      navigate("/", { replace: true });
    }
  }

  function scrollToSection(sectionId) {
    closeMenu();

    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    if (location.pathname !== "/") return;
    const sectionId = location.hash.replace("#", "");
    if (!sectionId) return;

    const id = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(id);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-800 shadow-[0_1px_14px_rgba(15,39,71,0.05)] backdrop-blur-xl">
      <div className="company-container flex min-h-[82px] items-center justify-between gap-5">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="بصمة النوابغ"
            className="h-12 w-12 rounded-2xl border border-slate-100 bg-white object-contain p-1 shadow-sm"
          />
          <div>
            <p className="text-[17px] font-black text-[#0f2747]">بصمة النوابغ</p>
            <p className="mt-0.5 hidden text-[11px] font-bold tracking-wide text-slate-400 sm:block">
              BASMAT ALNAWABIGH ICT
            </p>
          </div>
        </Link>

        <nav aria-label="القائمة الرئيسية" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <button
              key={item.sectionId}
              type="button"
              onClick={() => scrollToSection(item.sectionId)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[#0f2747]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Link
            to={isAuthenticated ? "/portal" : "/portal/login"}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-[#0f2747] transition hover:bg-slate-50"
          >
            <FaUser className="text-slate-400" />
            بوابة العملاء
          </Link>

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
            >
              <FaArrowRightFromBracket />
              خروج
            </button>
          )}

          <Link
            to="/consultation"
            className="group inline-flex items-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-l from-[#fff7ed] to-white px-4 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e96f20] text-white shadow-sm">
              <FaHeadset />
            </span>
            <span className="text-right leading-tight">
              <span className="block text-[13px] font-black text-[#0f2747]">استشارة مجانية 30 دقيقة</span>
              <span className="mt-1 block text-[10px] font-bold text-[#e96f20]">ابدأ مشروعك بدون التزام</span>
            </span>
          </Link>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-[#0f2747]"
          >
            <FaHeadset />
            تواصل
          </Link>

          <Link
            to="/quote"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f2747] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#17375f]"
          >
            <FaFileInvoiceDollar />
            اطلب عرض سعر
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-[#0f2747] lg:hidden"
        >
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <nav aria-label="قائمة الجوال" className="border-t border-slate-100 bg-white px-4 pb-5 pt-2 lg:hidden">
          <div className="company-container">
            {navigation.map((item) => (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => scrollToSection(item.sectionId)}
                className="flex w-full items-center justify-between border-b border-slate-100 px-1 py-4 text-right font-bold text-slate-700"
              >
                {item.label}
                <FaChevronDown className="text-[10px] text-slate-300" />
              </button>
            ))}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                to={isAuthenticated ? "/portal" : "/portal/login"}
                onClick={closeMenu}
                className="rounded-xl border border-slate-200 px-4 py-3 text-center font-black text-[#0f2747]"
              >
                بوابة العملاء
              </Link>
              <Link
                to="/consultation"
                onClick={closeMenu}
                className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-center font-black text-[#0f2747]"
              >
                <span className="block">استشارة مجانية 30 دقيقة</span>
                <span className="mt-1 block text-[10px] text-[#e96f20]">بدون التزام</span>
              </Link>
              <Link
                to="/quote"
                onClick={closeMenu}
                className="rounded-xl bg-[#0f2747] px-4 py-3 text-center font-black text-white"
              >
                اطلب عرض سعر
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
