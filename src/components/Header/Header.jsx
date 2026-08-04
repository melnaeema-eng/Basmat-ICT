import { useState } from "react";
import {
  FaBars,
  FaEnvelope,
  FaLocationDot,
  FaPhone,
  FaXmark,
} from "react-icons/fa6";

const navigation = [
  { label: "الرئيسية", href: "#home" },
  { label: "من نحن", href: "#about" },
  { label: "خدماتنا", href: "#services" },
  { label: "مشاريعنا", href: "#projects" },
  { label: "تواصل معنا", href: "#contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="relative z-50">
      <div className="bg-[#071d49] text-white">
        <div className="company-container flex min-h-10 flex-wrap items-center justify-between gap-3 py-2 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="tel:+966000000000"
              className="flex items-center gap-2 hover:text-blue-200"
            >
              <FaPhone />
              <span dir="ltr">+966 00 000 0000</span>
            </a>

            <a
              href="mailto:info@basmat-alnawabig.com.sa"
              className="flex items-center gap-2 hover:text-blue-200"
            >
              <FaEnvelope />
              <span>info@basmat-alnawabig.com.sa</span>
            </a>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <FaLocationDot />
            <span>الرياض، المملكة العربية السعودية</span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="company-container flex min-h-24 items-center justify-between gap-5">
          <a href="#home" className="flex items-center">
           <img
  src="/logo.png"
  alt="Basmat Alnawabigh ICT"
  className="h-20 md:h-24 w-auto object-contain"
/>
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="font-semibold text-slate-700 hover:text-[#123878]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="#contact"
              className="rounded-lg bg-[#123878] px-6 py-3 font-bold text-white hover:bg-[#0b285d]"
            >
              طلب عرض سعر
            </a>

            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-3 font-bold text-[#123878] hover:bg-slate-50"
            >
              EN
            </button>
          </div>

          <button
            type="button"
            aria-label="فتح القائمة"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#123878] text-xl text-white lg:hidden"
          >
            {menuOpen ? <FaXmark /> : <FaBars />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <nav className="company-container flex flex-col py-4">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="border-b border-slate-100 px-2 py-4 font-semibold text-slate-700 hover:text-[#123878]"
                >
                  {item.label}
                </a>
              ))}

              <a
                href="#contact"
                onClick={closeMenu}
                className="mt-4 rounded-lg bg-[#123878] px-6 py-3 text-center font-bold text-white"
              >
                طلب عرض سعر
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}