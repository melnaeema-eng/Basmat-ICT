import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FaBars,
  FaFileInvoiceDollar,
  FaGift,
  FaHeadset,
  FaXmark,
} from "react-icons/fa6";

const navigation = [
  {
    label: "الرئيسية",
    sectionId: "home",
  },
  {
    label: "عن الشركة",
    sectionId: "about",
  },
  {
    label: "خدماتنا",
    sectionId: "services",
  },
  {
    label: "المشاريع",
    sectionId: "projects",
  },
  {
    label: "منظومة التقنيات",
    sectionId: "technology",
  },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function scrollToSection(sectionId) {
    closeMenu();

    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }

    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  useEffect(() => {
    if (location.pathname !== "/") {
      return;
    }

    const sectionId = location.hash.replace("#", "");

    if (!sectionId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, location.hash]);

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-50 border-b border-white/10 bg-[#041632]/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl"
    >
      <div className="company-container flex min-h-[104px] items-center justify-between gap-5">
        <Link
          to="/"
          onClick={closeMenu}
          aria-label="العودة إلى الصفحة الرئيسية"
          className="flex shrink-0 items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="شعار بصمة النوابغ"
            className="h-[78px] w-[78px] rounded-full bg-white object-contain shadow-lg"
          />

          <div className="hidden xl:block">
            <p className="text-2xl font-black">
              بصمة النوابغ
            </p>

            <p className="text-sm text-blue-100">
              لتقنية المعلومات والاتصالات
            </p>

            <p className="mt-1 text-xs font-bold tracking-wide text-blue-200">
              BASMAT ALNAWABIGH ICT
            </p>
          </div>
        </Link>

        <nav
          aria-label="القائمة الرئيسية"
          className="hidden items-center gap-7 lg:flex"
        >
          {navigation.map((item) => (
            <button
              key={item.sectionId}
              type="button"
              onClick={() =>
                scrollToSection(item.sectionId)
              }
              className="relative flex min-h-[104px] items-center whitespace-nowrap px-1 font-bold text-blue-100 transition duration-300 hover:text-cyan-300"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <Link
            to="/quote"
            className="inline-flex items-center gap-2 rounded-full border border-orange-400/70 px-5 py-3 font-black text-orange-100 transition duration-300 hover:bg-[#ff7417] hover:text-white"
          >
            <FaFileInvoiceDollar />
            عرض سعر
          </Link>

          <Link
            to="/consultation"
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/60 px-5 py-3 font-black text-blue-100 transition duration-300 hover:bg-blue-600 hover:text-white"
          >
            <FaGift />
            استشارة مجانية
          </Link>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 font-bold text-white transition duration-300 hover:bg-white/10"
          >
            <FaHeadset />
            تواصل معنا
          </Link>
        </div>

        <button
          type="button"
          aria-label={
            menuOpen
              ? "إغلاق القائمة"
              : "فتح القائمة"
          }
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-xl transition hover:bg-white/10 lg:hidden"
        >
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="قائمة الجوال"
          className="company-container border-t border-white/10 pb-6 pt-2 lg:hidden"
        >
          {navigation.map((item) => (
            <button
              key={item.sectionId}
              type="button"
              onClick={() =>
                scrollToSection(item.sectionId)
              }
              className="flex w-full items-center border-b border-white/10 px-2 py-4 text-right font-bold text-blue-100 transition hover:text-white"
            >
              {item.label}
            </button>
          ))}

          <div className="mt-5 grid gap-3">
            <Link
              to="/quote"
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff7417] px-5 py-4 font-black text-white"
            >
              <FaFileInvoiceDollar />
              اطلب عرض سعر
            </Link>

            <Link
              to="/consultation"
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-black text-white"
            >
              <FaGift />
              استشارة مجانية
            </Link>

            <Link
              to="/contact"
              onClick={closeMenu}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-4 font-black text-white"
            >
              <FaHeadset />
              تواصل معنا
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}