import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function ProtectedAdminRoute() {
  const {
    loading,
    isAuthenticated,
    mfaState,
  } = useAdminAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <div className="rounded-2xl bg-white px-8 py-6 font-bold text-slate-700 shadow">
          جارٍ التحقق من جلسة الإدارة...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Sprint 15: 2FA remains optional.
  // But once a user has enrolled TOTP, verification is required for that session.
  if (mfaState?.enrolled && mfaState?.needsVerification) {
    return (
      <Navigate
        to="/admin/mfa"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
