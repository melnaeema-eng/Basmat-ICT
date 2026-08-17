import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBoxArchive,
  FaCircleCheck,
  FaCopy,
  FaFloppyDisk,
  FaMagnifyingGlass,
  FaPen,
  FaRotate,
  FaShieldHalved,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const roles = [
  ["admin", "Administrator"],
  ["manager", "Manager"],
  ["sales", "Sales"],
  ["engineer", "Engineer"],
  ["support", "Support"],
  ["hr", "HR"],
  ["finance", "Finance"],
];

const staffRoles = roles.filter(
  ([role]) => role !== "admin"
);

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
  ["hr", "الموارد البشرية"],
  ["payroll", "الرواتب"],
  ["finance", "المالية"],
  ["procurement", "المشتريات"],
  ["accounting", "المحاسبة"],
  ["inventory", "المخزون"],
  ["assets", "الأصول والعُهد"],
  ["project_cost_control", "تكلفة وربحية المشاريع"],
  ["executive_control", "القيادة والحوكمة"],
  ["financial_planning", "التخطيط المالي والميزانيات"],
  ["treasury", "الخزينة والذمم"],
  ["financial_control", "الرقابة المالية والإقفال"],
  ["order_to_cash", "أوامر البيع والفوترة والتحصيل"],
  ["contract_lifecycle", "العقود وSLA والفوترة المتكررة"],
  ["procure_to_pay", "الشراء والاستلام ومطابقة الموردين"],
  ["service_management", "إدارة الخدمات وSLA"],
];

export default function AdminAccessControl() {
  const [rows, setRows] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lookupLoading, setLookupLoading] =
    useState(false);
  const [message, setMessage] = useState("");
  const [createdAccount, setCreatedAccount] =
    useState(null);
  const [existingInfo, setExistingInfo] =
    useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "manager",
  });
  const [staffForm, setStaffForm] = useState({
    full_name: "",
    email: "",
    role: "manager",
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const email = staffForm.email
      .trim()
      .toLowerCase();

    setExistingInfo(null);

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      lookupExistingUser(email);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [staffForm.email]);

  async function load() {
    setLoading(true);
    setMessage("");

    const [p, a] = await Promise.all([
      supabase
        .from("ict_admin_role_permissions")
        .select(
          "role,permission_key,is_allowed"
        ),
      supabase
        .from("ict_admin_users")
        .select(
          "user_id,full_name,email,role,is_active,is_archived,created_at"
        )
        .order("created_at"),
    ]);

    const error = p.error || a.error;

    if (error) {
      setMessage(error.message);
    } else {
      setRows(p.data || []);
      setAdmins(a.data || []);
    }

    setLoading(false);
  }

  async function lookupExistingUser(email) {
    setLookupLoading(true);

    const { data, error } =
      await supabase.functions.invoke(
        "create-staff-user",
        {
          body: {
            action: "lookup",
            email,
          },
        }
      );

    if (!error && data?.success) {
      setExistingInfo(data);

      if (data.existing_user && data.full_name) {
        setStaffForm((current) => ({
          ...current,
          full_name: data.full_name,
        }));
      }
    }

    setLookupLoading(false);
  }

  const matrix = useMemo(() => {
    const out = {};

    rows.forEach((r) => {
      out[
        `${r.role}:${r.permission_key}`
      ] = r.is_allowed;
    });

    return out;
  }, [rows]);

  function toggle(role, key) {
    setRows((current) => {
      const idx = current.findIndex(
        (r) =>
          r.role === role &&
          r.permission_key === key
      );

      if (idx >= 0) {
        return current.map((r, i) =>
          i === idx
            ? {
                ...r,
                is_allowed: !r.is_allowed,
              }
            : r
        );
      }

      return [
        ...current,
        {
          role,
          permission_key: key,
          is_allowed: true,
        },
      ];
    });
  }

  async function savePermissions() {
    setSaving(true);
    setMessage("");

    const payload = roles.flatMap(
      ([role]) =>
        permissions.map(
          ([permission_key]) => ({
            role,
            permission_key,
            is_allowed: Boolean(
              matrix[
                `${role}:${permission_key}`
              ]
            ),
            updated_at:
              new Date().toISOString(),
          })
        )
    );

    const { error } = await supabase
      .from("ict_admin_role_permissions")
      .upsert(payload, {
        onConflict:
          "role,permission_key",
      });

    setMessage(
      error
        ? error.message
        : "تم حفظ الصلاحيات بنجاح."
    );

    setSaving(false);
  }

  async function createStaff(event) {
    event.preventDefault();

    setCreating(true);
    setMessage("");
    setCreatedAccount(null);

    const { data, error } =
      await supabase.functions.invoke(
        "create-staff-user",
        {
          body: {
            action: "upsert_staff",
            ...staffForm,
          },
        }
      );

    if (error || data?.error) {
      setMessage(
        data?.error ||
          error?.message ||
          "تعذر إضافة الموظف."
      );
      setCreating(false);
      return;
    }

    setCreatedAccount({
      email: data.email,
      role: data.role,
      password:
        data.temporary_password || null,
      existing:
        Boolean(data.existing_user),
    });

    setStaffForm({
      full_name: "",
      email: "",
      role: "manager",
    });
    setExistingInfo(null);

    setMessage(
      data.existing_user
        ? "تم منح المستخدم الموجود صلاحيات الموظف مع الاحتفاظ بحساب العميل وكلمة مروره الحالية."
        : "تم إنشاء حساب الموظف الجديد بنجاح."
    );

    await load();
    setCreating(false);
  }

  async function copyPassword() {
    if (!createdAccount?.password) return;

    await navigator.clipboard.writeText(
      createdAccount.password
    );

    setMessage(
      "تم نسخ كلمة المرور المؤقتة."
    );
  }

  async function updateAdmin(
    userId,
    patch
  ) {
    const { error } = await supabase
      .from("ict_admin_users")
      .update({
        ...patch,
        updated_at:
          new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return false;
    }

    setAdmins((current) =>
      current.map((a) =>
        a.user_id === userId
          ? { ...a, ...patch }
          : a
      )
    );

    return true;
  }

  function startEdit(admin) {
    setEditingId(admin.user_id);
    setEditForm({
      full_name:
        admin.full_name || "",
      role: admin.role || "manager",
    });
  }

  async function saveStaffEdit(admin) {
    if (
      admin.role === "admin" &&
      editForm.role !== "admin"
    ) {
      const ok = window.confirm(
        "أنت على وشك تغيير صلاحية Administrator. هل تريد المتابعة؟"
      );
      if (!ok) return;
    }

    const ok = await updateAdmin(
      admin.user_id,
      {
        full_name:
          editForm.full_name.trim(),
        role: editForm.role,
      }
    );

    if (ok) {
      setEditingId(null);
      setMessage(
        "تم تعديل بيانات الموظف."
      );
    }
  }

  async function setLifecycle(
    admin,
    action
  ) {
    if (admin.role === "admin") {
      setMessage(
        "لا يتم تعطيل أو أرشفة Administrator من هذه الشاشة."
      );
      return;
    }

    const patch =
      action === "archive"
        ? {
            is_archived: true,
            is_active: false,
            archived_at:
              new Date().toISOString(),
          }
        : action === "restore"
        ? {
            is_archived: false,
            is_active: true,
            archived_at: null,
          }
        : action === "disable"
        ? { is_active: false }
        : { is_active: true };

    const ok = await updateAdmin(
      admin.user_id,
      patch
    );

    if (ok) {
      setMessage(
        action === "archive"
          ? "تمت أرشفة الموظف."
          : action === "restore"
          ? "تمت إعادة الموظف من الأرشيف وتفعيله."
          : action === "disable"
          ? "تم تعطيل الموظف مؤقتًا."
          : "تمت إعادة تفعيل الموظف."
      );
    }
  }

  async function removeStaff(admin) {
    if (admin.role === "admin") {
      setMessage(
        "لا يمكن حذف Administrator من هذه الشاشة."
      );
      return;
    }

    const ok = window.confirm(
      `حذف صلاحية الموظف من "${admin.full_name || admin.email}"؟\n\nإذا كان المستخدم عميلًا، سيبقى حساب العميل وبياناته وكلمة مروره كما هي.`
    );

    if (!ok) return;

    const { data, error } =
      await supabase.functions.invoke(
        "create-staff-user",
        {
          body: {
            action: "remove_staff",
            user_id: admin.user_id,
          },
        }
      );

    if (error || data?.error) {
      setMessage(
        data?.error ||
          error?.message ||
          "تعذر حذف صلاحية الموظف."
      );
      return;
    }

    setMessage(
      data.customer_user
        ? "تم حذف صلاحية الموظف فقط. حساب العميل ما زال موجودًا."
        : "تم حذف صلاحية الموظف. حساب Auth لم يتم حذفه حفاظًا على الأمان والسجل."
    );

    await load();
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]">
              <FaShieldHalved />
              الصلاحيات والأدوار
            </h1>

            <p className="mt-3 text-slate-600">
              إضافة وتعديل وتعطيل وأرشفة
              موظفي الإدارة.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
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
              <h2 className="text-2xl font-black text-[#071d49]">
                إضافة موظف
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                اكتب البريد أولًا. إذا كان
                المستخدم موجودًا سيتم جلب
                الاسم تلقائيًا واستخدام نفس
                الحساب.
              </p>
            </div>
          </div>

          <form
            onSubmit={createStaff}
            className="mt-6 grid gap-4 lg:grid-cols-4"
          >
            <div>
              <div className="relative">
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) =>
                    setStaffForm((v) => ({
                      ...v,
                      email: e.target.value,
                    }))
                  }
                  required
                  placeholder="staff@company.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-left"
                />

                {lookupLoading && (
                  <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 animate-pulse text-blue-600" />
                )}
              </div>

              {existingInfo?.existing_user && (
                <p className="mt-2 text-xs font-black text-green-700">
                  مستخدم موجود
                  {existingInfo.customer_user
                    ? " • عميل حالي"
                    : ""}
                  {existingInfo.staff_user
                    ? " • لديه صلاحية موظف"
                    : ""}
                </p>
              )}
            </div>

            <input
              value={staffForm.full_name}
              onChange={(e) =>
                setStaffForm((v) => ({
                  ...v,
                  full_name:
                    e.target.value,
                }))
              }
              required
              placeholder="اسم الموظف"
              className={[
                "rounded-xl border px-4 py-3",
                existingInfo?.full_name
                  ? "border-green-300 bg-green-50"
                  : "border-slate-300",
              ].join(" ")}
            />

            <select
              value={staffForm.role}
              onChange={(e) =>
                setStaffForm((v) => ({
                  ...v,
                  role: e.target.value,
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              {staffRoles.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <button
              disabled={creating}
              className="rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              {creating
                ? "جارٍ الحفظ..."
                : existingInfo?.existing_user
                ? "منح صلاحية الموظف"
                : "إنشاء حساب الموظف"}
            </button>
          </form>

          {createdAccount && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-[#071d49]">
                {createdAccount.existing
                  ? "تم استخدام الحساب الموجود"
                  : "بيانات الدخول المؤقتة"}
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <span className="text-sm text-slate-500">
                    البريد
                  </span>
                  <p
                    dir="ltr"
                    className="mt-1 text-right font-bold"
                  >
                    {createdAccount.email}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-500">
                    الدور
                  </span>
                  <p className="mt-1 font-bold">
                    {createdAccount.role}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-500">
                    كلمة المرور
                  </span>

                  {createdAccount.password ? (
                    <div
                      className="mt-1 flex items-center gap-2"
                      dir="ltr"
                    >
                      <code className="rounded-lg bg-white px-3 py-2 font-black">
                        {
                          createdAccount.password
                        }
                      </code>

                      <button
                        type="button"
                        onClick={copyPassword}
                        className="rounded-lg bg-[#123878] p-3 text-white"
                      >
                        <FaCopy />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 font-bold text-green-700">
                      نفس كلمة المرور الحالية
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-[220px_repeat(5,1fr)] gap-2 border-b pb-3 font-black text-[#071d49]">
              <div>الوحدة</div>

              {roles.map(
                ([role, label]) => (
                  <div
                    key={role}
                    className="text-center"
                  >
                    {label}
                  </div>
                )
              )}
            </div>

            {permissions.map(
              ([key, label]) => (
                <div
                  key={key}
                  className="grid grid-cols-[220px_repeat(5,1fr)] items-center gap-2 border-b border-slate-100 py-3"
                >
                  <div className="font-bold">
                    {label}
                  </div>

                  {roles.map(([role]) => (
                    <div
                      key={role}
                      className="text-center"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={Boolean(
                          matrix[
                            `${role}:${key}`
                          ]
                        )}
                        disabled={
                          role === "admin" &&
                          key ===
                            "access_control"
                        }
                        onChange={() =>
                          toggle(role, key)
                        }
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <button
            onClick={savePermissions}
            disabled={
              saving || loading
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"
          >
            <FaFloppyDisk />
            {saving
              ? "جارٍ الحفظ..."
              : "حفظ الصلاحيات"}
          </button>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">
            حسابات الإدارة
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-3">
                    الاسم
                  </th>
                  <th className="p-3">
                    البريد
                  </th>
                  <th className="p-3">
                    الدور
                  </th>
                  <th className="p-3">
                    الحالة
                  </th>
                  <th className="p-3">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {admins.map((a) => {
                  const editing =
                    editingId === a.user_id;

                  return (
                    <tr
                      key={a.user_id}
                      className="border-b border-slate-100"
                    >
                      <td className="p-3 font-bold">
                        {editing ? (
                          <input
                            value={
                              editForm.full_name
                            }
                            onChange={(e) =>
                              setEditForm(
                                (v) => ({
                                  ...v,
                                  full_name:
                                    e.target
                                      .value,
                                })
                              )
                            }
                            className="rounded-lg border px-3 py-2"
                          />
                        ) : (
                          a.full_name ||
                          a.user_id
                        )}
                      </td>

                      <td
                        className="p-3"
                        dir="ltr"
                      >
                        {a.email || "—"}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <select
                            value={
                              editForm.role
                            }
                            onChange={(e) =>
                              setEditForm(
                                (v) => ({
                                  ...v,
                                  role: e.target
                                    .value,
                                })
                              )
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2"
                          >
                            {roles.map(
                              ([v, l]) => (
                                <option
                                  key={v}
                                  value={v}
                                >
                                  {l}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          roles.find(
                            ([v]) =>
                              v === a.role
                          )?.[1] || a.role
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-sm font-black",
                            a.is_archived
                              ? "bg-slate-200 text-slate-700"
                              : a.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800",
                          ].join(" ")}
                        >
                          {a.is_archived
                            ? "مؤرشف"
                            : a.is_active
                            ? "نشط"
                            : "معطل"}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  saveStaffEdit(a)
                                }
                                className="rounded-lg bg-green-100 p-3 text-green-800"
                                title="حفظ"
                              >
                                <FaFloppyDisk />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingId(
                                    null
                                  )
                                }
                                className="rounded-lg bg-slate-100 px-3 py-2 font-bold"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(a)
                              }
                              className="rounded-lg bg-blue-100 p-3 text-blue-800"
                              title="تعديل"
                            >
                              <FaPen />
                            </button>
                          )}

                          {a.role !== "admin" &&
                            !a.is_archived &&
                            a.is_active && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLifecycle(
                                    a,
                                    "disable"
                                  )
                                }
                                className="rounded-lg bg-amber-100 px-3 py-2 font-black text-amber-800"
                              >
                                تعطيل
                              </button>
                            )}

                          {a.role !== "admin" &&
                            !a.is_archived &&
                            !a.is_active && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLifecycle(
                                    a,
                                    "activate"
                                  )
                                }
                                className="rounded-lg bg-green-100 p-3 text-green-800"
                                title="إعادة تفعيل"
                              >
                                <FaCircleCheck />
                              </button>
                            )}

                          {a.role !== "admin" &&
                            (!a.is_archived ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setLifecycle(
                                    a,
                                    "archive"
                                  )
                                }
                                className="rounded-lg bg-slate-200 p-3 text-slate-700"
                                title="أرشفة"
                              >
                                <FaBoxArchive />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setLifecycle(
                                    a,
                                    "restore"
                                  )
                                }
                                className="rounded-lg bg-green-100 p-3 text-green-800"
                                title="إعادة من الأرشيف"
                              >
                                <FaCircleCheck />
                              </button>
                            ))}

                          {a.role !== "admin" && (
                            <button
                              type="button"
                              onClick={() =>
                                removeStaff(a)
                              }
                              className="rounded-lg bg-red-100 p-3 text-red-700"
                              title="حذف صلاحية الموظف"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
