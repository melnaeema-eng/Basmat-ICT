import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

export default function RequireAdminPermission({ permission, children }) {
  const { loading, hasPermission } = useAdminAuth();

  if (loading) {
    return <div className="p-8 text-center">جارٍ التحقق من الصلاحيات...</div>;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return children;
}
