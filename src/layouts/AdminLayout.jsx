import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div dir="rtl" className="erp-shell min-h-screen">
      <Topbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <Sidebar menuOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && (
        <button type="button" aria-label="إغلاق قائمة الإدارة"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden" />
      )}
      <main className="min-h-screen min-w-0 pt-16 lg:mr-72 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
