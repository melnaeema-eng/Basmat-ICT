import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FaBars,
  FaHeadset,
  FaXmark,
} from "react-icons/fa6";

const navigation = [
  { label: "الرئيسية", path: "/" },
  { label: "عن الشركة", path: "/about" },
  { label: "خدماتنا", path: "/services" },
  { label: "المشاريع", path: "/projects" },
  { label: "منظومة التقنيات", path: "/technology" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function navClass({ isActive }) {
    return `relative py-9 font-bold transition hover:text-cyan-300 ${
      isActive ? "text-white" : "text-blue-100"
    }`;
  }

  return (
    <header
      dir="rtl"
      className="relative z-50 bg-[#041632] text-white"
    >
      <div className="company-container flex min-h-[104px] items-center justify-between gap-5">
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="بصمة النوابغ"
            className="h-[82px] w-[82px] rounded-full bg-white object-contain"
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

        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={navClass}
            >
              {({ isActive }) => (
                <>
                  {item.label}

                  {isActive && (
                    <span className="absolute bottom-5 right-0 h-[3px] w-full rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/50 px-6 py-3 font-bold transition hover:bg-white/10"
          >
            <FaHeadset />
            تواصل معنا
          </Link>

          <button
            type="button"
            className="rounded-full border border-white/25 px-5 py-3 font-black"
          >
            EN
          </button>
        </div>

        <button
          type="button"
          aria-label="فتح القائمة"
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-xl lg:hidden"
        >
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <nav className="company-container flex flex-col border-t border-white/10 py-4 lg:hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={closeMenu}
              className={({ isActive }) =>
                `border-b border-white/10 py-4 font-bold ${
                  isActive
                    ? "text-cyan-300"
                    : "text-blue-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          <Link
            to="/contact"
            onClick={closeMenu}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff7417] px-6 py-4 font-black text-white"
          >
            <FaHeadset />
            تواصل معنا
          </Link>
        </nav>
      )}
    </header>
  );
}