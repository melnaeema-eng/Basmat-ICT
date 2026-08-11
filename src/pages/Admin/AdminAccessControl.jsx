import { useEffect, useMemo, useState } from "react";
import {
  FaCopy,
  FaFloppyDisk,
  FaRotate,
  FaShieldHalved,
  FaUserPlus,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const roles = [
  ["admin", "Administrator"],
  ["manager", "Manager"],
  ["sales", "Sales"],
  ["engineer", "Engineer"],
  ["support", "Support"],
];

const staffRoles = roles.filter(([role]) => role !== "admin");

const permissions = [
  ["dashboard", "لوحة التحكم"],
  ["requests", "الطلبات والاستشارات"],
  ["crm", "CRM والمبيعات"],
  ["quotations", "عروض الأسعار"],
  ["operations", "المشاريع والتجاري"],
  ["documents", "مستندات المشاريع"],
  ["support", "الدعم والتذاكر"],
  ["notifications", "الإشعارات"],
  ["reports", "التحليلات والتقارير"],
  ["team", "فريق العمل"],
  ["content", "محتوى الموقع"],
  ["access_control", "الصلاحيات"],
];

export default function AdminAccessControl() {
  const [rows, setRows] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null);
  const [staffForm, setStaffForm] = useState({
    full_name: "",
    email: "",
    role: "manager",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [p, a] = await Promise.all([
      supabase
        .from("ict_admin_role_permissions")
        .select("role,permission_key,is_allowed"),
      supabase
        .from("ict_admin_users")
        .select("user_id,full_name,email,role,is_active,created_at")
        .order("created_at"),
    ]);

    const error = p.error || a.error;
    if (error) setMessage(error.message);
    else {
      setRows(p.data || []);
      setAdmins(a.data || []);
    }
    setLoading(false);
  }

  const matrix = useMemo(() => {
    const out = {};
    rows.forEach((r) => {
      out[`${r.role}:${r.permission_key}`] = r.is_allowed;
    });
    return out;
  }, [rows]);

  function toggle(role, key) {
    setRows((current) => {
      const idx = current.findIndex(
        (r) => r.role === role && r.permission_key === key
      );
      if (idx >= 0) {
        return current.map((r, i) =>
          i === idx ? { ...r, is_allowed: !r.is_allowed } : r
        );
      }
      return [...current, { role, permission_key: key, is_allowed: true }];
    });
  }

  async function savePermissions() {
    setSaving(true);
    setMessage("");

    const payload = roles.flatMap(([role]) =>
      permissions.map(([permission_key]) => ({
        role,
        permission_key,
        is_allowed: Boolean(matrix[`${role}:${permission_key}`]),
        updated_at: new Date().toISOString(),
      }))
    );

    const { error } = await supabase
      .from("ict_admin_role_permissions")
      .upsert(payload, { onConflict: "role,permission_key" });

    setMessage(error ? error.message : "تم حفظ الصلاحيات بنجاح.");
    setSaving(false);
  }

  async function createStaff(event) {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    setCreatedAccount(null);

    const { data, error } = await supabase.functions.invoke(
      "create-staff-user",
      { body: staffForm }
    );

    if (error || data?.error) {
      setMessage(data?.error || error?.message || "تعذر إنشاء الموظف.");
      setCreating(false);
      return;
    }

    setCreatedAccount({
      email: data.email,
      role: data.role,
      password: data.temporary_password,
    });
    setStaffForm({ full_name: "", email: "", role: "manager" });
    setMessage("تم إنشاء حساب الموظف. انسخ كلمة المرور المؤقتة وسلمها له بشكل آمن.");
    await load();
    setCreating(false);
  }

  async function copyPassword() {
    if (!createdAccount?.password) return;
    await navigator.clipboard.writeText(createdAccount.password);
    setMessage("تم نسخ كلمة المرور المؤقتة.");
  }

  async function updateAdmin(userId, patch) {
    const { error } = await supabase
      .from("ict_admin_users")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAdmins((current) =>
      current.map((a) => (a.user_id === userId ? { ...a, ...patch } : a))
    );
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]">
              <FaShieldHalved /> الصلاحيات والأدوار
            </h1>
            <p className="mt-3 text-slate-600">
              إنشاء موظفي الإدارة وتحديد صلاحيات Manager / Sales / Engineer / Support.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
          >
            <FaRotate /> تحديث
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FaUserPlus className="text-2xl text-[#ff7417]" />
            <div>
              <h2 className="text-2xl font-black text-[#071d49]">إضافة موظف</h2>
              <p className="mt-1 text-sm text-slate-500">
                التسجيل العام يبقى للعملاء فقط. موظفو الشركة ينشئهم Administrator من هنا.
              </p>
            </div>
          </div>

          <form onSubmit={createStaff} className="mt-6 grid gap-4 lg:grid-cols-4">
            <input
              value={staffForm.full_name}
              onChange={(e) =>
                setStaffForm((v) => ({ ...v, full_name: e.target.value }))
              }
              required
              placeholder="اسم الموظف"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />
            <input
              type="email"
              value={staffForm.email}
              onChange={(e) =>
                setStaffForm((v) => ({ ...v, email: e.target.value }))
              }
              required
              placeholder="staff@company.com"
              dir="ltr"
              className="rounded-xl border border-slate-300 px-4 py-3 text-left"
            />
            <select
              value={staffForm.role}
              onChange={(e) =>
                setStaffForm((v) => ({ ...v, role: e.target.value }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              {staffRoles.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              disabled={creating}
              className="rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              {creating ? "جارٍ الإنشاء..." : "إنشاء حساب الموظف"}
            </button>
          </form>

          {createdAccount && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-[#071d49]">بيانات الدخول المؤقتة</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div><span className="text-sm text-slate-500">البريد</span><p dir="ltr" className="mt-1 text-right font-bold">{createdAccount.email}</p></div>
                <div><span className="text-sm text-slate-500">الدور</span><p className="mt-1 font-bold">{createdAccount.role}</p></div>
                <div>
                  <span className="text-sm text-slate-500">كلمة المرور المؤقتة</span>
                  <div className="mt-1 flex items-center gap-2" dir="ltr">
                    <code className="rounded-lg bg-white px-3 py-2 font-black">{createdAccount.password}</code>
                    <button type="button" onClick={copyPassword} className="rounded-lg bg-[#123878] p-3 text-white" title="نسخ"><FaCopy /></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-[220px_repeat(5,1fr)] gap-2 border-b pb-3 font-black text-[#071d49]">
              <div>الوحدة</div>
              {roles.map(([role, label]) => (
                <div key={role} className="text-center">{label}</div>
              ))}
            </div>
            {permissions.map(([key, label]) => (
              <div key={key} className="grid grid-cols-[220px_repeat(5,1fr)] items-center gap-2 border-b border-slate-100 py-3">
                <div className="font-bold">{label}</div>
                {roles.map(([role]) => (
                  <div key={role} className="text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={Boolean(matrix[`${role}:${key}`])}
                      disabled={role === "admin" && key === "access_control"}
                      onChange={() => toggle(role, key)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={savePermissions}
            disabled={saving || loading}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"
          >
            <FaFloppyDisk /> {saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
          </button>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">حسابات الإدارة</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-right">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-3">الاسم</th>
                  <th className="p-3">البريد</th>
                  <th className="p-3">الدور</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.user_id} className="border-b border-slate-100">
                    <td className="p-3 font-bold">{a.full_name || a.user_id}</td>
                    <td className="p-3" dir="ltr">{a.email || "—"}</td>
                    <td className="p-3">
                      <select
                        value={a.role}
                        onChange={(e) => updateAdmin(a.user_id, { role: e.target.value })}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      >
                        {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={a.is_active}
                          onChange={(e) => updateAdmin(a.user_id, { is_active: e.target.checked })}
                        />
                        <span>{a.is_active ? "نشط" : "موقوف"}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
