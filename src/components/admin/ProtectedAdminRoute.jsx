import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function ProtectedAdminRoute() {
  const location = useLocation();

  const {
    loading,
    isAuthenticated,
  } = useAdminAuth();

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-100 px-4"
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-xl font-black text-[#071d49]">
            جارٍ التحقق من صلاحية الدخول...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  return <Outlet />;
}
