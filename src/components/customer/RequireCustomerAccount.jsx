import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";

export default function RequireCustomerAccount() {
  const location = useLocation();
  const { loading, isAuthenticated } = useCustomerAuth();

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-[50vh] items-center justify-center">
        جارٍ التحقق من حساب العميل...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/portal/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
