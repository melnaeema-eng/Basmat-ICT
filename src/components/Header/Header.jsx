import { useState } from "react";
import {
  FaBars,
  FaHeadset,
  FaXmark,
} from "react-icons/fa6";

const navigation = [
  { label: "الرئيسية", href: "#home" },
  { label: "عن الشركة", href: "#about" },
  { label: "خدماتنا", href: "#services" },
  { label: "المشاريع", href: "#projects" },
  { label: "منظومة التقنيات", href: "#technology" },
  { label: "اتصل بنا", href: "#contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-50 bg-[#041632] text-white">
      <div className="company-container flex min-h-[104px] items-center justify-between gap-6">
        <a href="#home" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="بصمة النوابغ"
            className="h-[88px] w-[88px] rounded-full bg-white object-contain"
          />

          <div className="hidden xl:block">
            <p className="text-2xl font-black">بصمة النوابغ</p>
            <p className="text-sm text-blue-100">
              لتقنية المعلومات والاتصالات
            </p>
            <p className="mt-1 text-xs font-bold tracking-wide text-blue-200">
              BASMAT ALNAWABIGH ICT
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className={`relative py-9 font-bold transition hover:text-cyan-300 ${
                index === 0 ? "text-white" : "text-blue-100"
              }`}
            >
              {item.label}

              {index === 0 && (
                <span className="absolute bottom-5 right-0 h-[3px] w-full rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]" />
              )}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/50 px-6 py-3 font-bold transition hover:bg-white/10"
          >
            <FaHeadset />
            تواصل معنا
          </a>

          <button
            type="button"
            className="rounded-full border border-white/25 px-6 py-3 font-black"
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 text-xl lg:hidden"
        >
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </div>

      {menuOpen && (
        <nav className="company-container flex flex-col border-t border-white/10 py-4 lg:hidden">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-white/10 py-4 font-bold text-blue-100"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}