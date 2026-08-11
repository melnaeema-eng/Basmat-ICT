import RequireAdminPermission from "./RequireAdminPermission";

export default function AdminPermissionRoute({ permission, children }) {
  return (
    <RequireAdminPermission permission={permission}>
      {children}
    </RequireAdminPermission>
  );
}
