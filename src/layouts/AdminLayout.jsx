import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100">
      <Topbar
        menuOpen={menuOpen}
        onToggleMenu={() =>
          setMenuOpen((current) => !current)
        }
      />

      <Sidebar
        menuOpen={menuOpen}
        onClose={closeMenu}
      />

      {menuOpen && (
        <button
          type="button"
          aria-label="إغلاق قائمة الإدارة"
          onClick={closeMenu}
          className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
        />
      )}

      <main className="min-h-screen min-w-0 pt-20 lg:mr-72 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
