import {
  FaBars,
  FaHouse,
  FaXmark,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

export default function Topbar({
  menuOpen,
  onToggleMenu,
}) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link
          to="/admin"
          className="flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="بصمة النوابغ"
            className="h-12 w-12 rounded-full bg-white object-contain"
          />

          <div>
            <p className="font-black text-[#071d49]">
              لوحة الإدارة
            </p>

            <p className="text-xs text-slate-500">
              Basmat ICT
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={
            menuOpen
              ? "إغلاق قائمة الإدارة"
              : "فتح قائمة الإدارة"
          }
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071d49] text-xl text-white"
        >
          {menuOpen ? <FaXmark /> : <FaBars />}
        </button>
      </header>

      <header className="hidden min-h-24 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm lg:flex">
        <div>
          <p className="font-black text-[#071d49]">
            لوحة إدارة بصمة النوابغ
          </p>

          <p className="mt-1 text-sm text-slate-500">
            إدارة الرسائل والطلبات الواردة من الموقع
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#071d49] px-5 py-3 font-bold text-white transition hover:bg-[#123878]"
        >
          <FaHouse />
          عرض الموقع
        </Link>
      </header>
    </>
  );
}
