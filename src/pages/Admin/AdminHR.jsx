import { useEffect, useMemo, useState } from "react";
import {
  FaCircleCheck,
  FaMagnifyingGlass,
  FaPen,
  FaRotate,
  FaUserGroup,
  FaUserSlash,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const emptyForm = {
  email: "",
  full_name: "",
  phone: "",
  department: "",
  job_title: "",
  employment_type: "full_time",
  hire_date: "",
  status: "active",
  notes: "",
};

export default function AdminHR() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [lookup, setLookup] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminAccess, setAdminAccess] = useState({
    enabled: false,
    role: "engineer",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("ict_hr_employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  function populateFromEmployee(data) {
    setEditingId(data.employee_id);

    setForm({
      email: data.email || "",
      full_name: data.full_name || "",
      phone:
        String(data.phone || "").replace(/\s+/g, "").length >= 7
          ? data.phone
          : "",
      department: data.department || "",
      job_title: data.job_title || "",
      employment_type: data.employment_type || "full_time",
      hire_date: data.hire_date || "",
      status: data.status || "active",
      notes: data.notes || "",
    });
  }

  async function findByEmail() {
    const email = form.email.trim().toLowerCase();

    if (!email) {
      setMessage("أدخل البريد الإلكتروني أولاً.");
      return;
    }

    setLooking(true);
    setMessage("");
    setLookup(null);

    const { data, error } = await supabase.rpc(
      "ict_find_person_for_hiring",
      { p_email: email }
    );

    if (error) {
      setMessage(error.message);
      setLooking(false);
      return;
    }

    setLookup(data);

    if (data?.employee_exists) {
      populateFromEmployee(data);
      setMessage(
        `الموظف موجود بالفعل — ${data.employee_code}. تم فتح ملفه للتعديل.`
      );
      setLooking(false);
      return;
    }

    if (!data?.found || !data?.auth_user_id) {
      setMessage(
        "لم يتم العثور على حساب مستخدم صالح بهذا البريد."
      );
      setLooking(false);
      return;
    }

    setForm((current) => ({
      ...current,
      email: data.email || email,
      full_name: data.full_name || "",
      phone:
        String(data.phone || "").replace(/\s+/g, "").length >= 7
          ? data.phone
          : "",
    }));

    setMessage(
      "تم العثور على المستخدم. أكمل بيانات التوظيف."
    );

    setLooking(false);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (editingId) {
      const { error } = await supabase
        .from("ict_hr_employees")
        .update({
          full_name: form.full_name.trim(),
          phone:
            form.phone.trim().length >= 7
              ? form.phone.trim()
              : null,
          department: form.department.trim() || null,
          job_title: form.job_title.trim() || null,
          employment_type: form.employment_type,
          hire_date: form.hire_date || null,
          status: form.status,
          notes: form.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        setMessage(error.message);
      } else {
        try {
          await saveAdminAccess(editingId);
          setMessage("تم تحديث ملف الموظف وصلاحية دخول الإدارة.");
        } catch (accessError) {
          setMessage(
            "تم تحديث الموظف، لكن تعذر تحديث دخول الإدارة: " +
              accessError.message
          );
        }
        resetForm();
        await load();
      }

      setSaving(false);
      return;
    }

    if (!lookup?.auth_user_id) {
      setMessage("ابحث بالبريد أولاً.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "ict_hire_existing_person",
      {
        p_email: form.email.trim().toLowerCase(),
        p_full_name: form.full_name.trim(),
        p_phone:
          form.phone.trim().length >= 7
            ? form.phone.trim()
            : null,
        p_department: form.department || null,
        p_job_title: form.job_title || null,
        p_employment_type: form.employment_type,
        p_hire_date: form.hire_date || null,
        p_notes: form.notes || null,
      }
    );

    if (error) {
      setMessage(error.message);
    } else if (data?.employee_exists) {
      setMessage(
        `الموظف موجود بالفعل — ${data.employee_code}. لم يتم إنشاء رقم موظف جديد.`
      );

      const { data: existing } = await supabase.rpc(
        "ict_find_person_for_hiring",
        { p_email: form.email.trim().toLowerCase() }
      );

      if (existing?.employee_exists) {
        setLookup(existing);
        populateFromEmployee(existing);
      }
    } else {
      try {
        await saveAdminAccess(data.employee_id);
        setMessage(
          `تم التوظيف بنجاح — رقم الموظف ${data.employee_code}`
        );
      } catch (accessError) {
        setMessage(
          `تم التوظيف — ${data.employee_code}، لكن تعذر إعداد دخول الإدارة: ${accessError.message}`
        );
      }
      resetForm();
      await load();
    }

    setSaving(false);
  }

  async function loadAdminAccess(employeeId) {
    const { data, error } = await supabase.rpc(
      "ict_get_employee_admin_access",
      { p_employee_id: employeeId }
    );

    if (!error && data) {
      setAdminAccess({
        enabled: Boolean(data.has_admin_access && data.is_active),
        role: data.role || "engineer",
      });
    } else {
      setAdminAccess({
        enabled: false,
        role: "engineer",
      });
    }
  }

  async function saveAdminAccess(employeeId) {
    const { error } = await supabase.rpc(
      "ict_set_employee_admin_access",
      {
        p_employee_id: employeeId,
        p_role: adminAccess.role,
        p_enabled: adminAccess.enabled,
      }
    );

    if (error) {
      throw error;
    }
  }

  function edit(row) {
    setEditingId(row.id);
    setLookup({
      found: true,
      employee_exists: true,
      employee_id: row.id,
      employee_code: row.employee_code,
      auth_user_id: row.auth_user_id,
    });

    setForm({
      email: row.email || "",
      full_name: row.full_name || "",
      phone:
        String(row.phone || "").replace(/\s+/g, "").length >= 7
          ? row.phone
          : "",
      department: row.department || "",
      job_title: row.job_title || "",
      employment_type: row.employment_type || "full_time",
      hire_date: row.hire_date || "",
      status: row.status || "active",
      notes: row.notes || "",
    });

    loadAdminAccess(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(row, status) {
    const { error } = await supabase
      .from("ict_hr_employees")
      .update({
        status,
        archived_at:
          status === "archived"
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم تحديث حالة الموظف.");
      await load();
    }
  }

  function resetForm() {
    setEditingId(null);
    setLookup(null);
    setForm(emptyForm);
    setAdminAccess({
      enabled: false,
      role: "engineer",
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.employee_code,
        row.full_name,
        row.email,
        row.phone,
        row.department,
        row.job_title,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q)
        )
    );
  }, [rows, search]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]">
              <FaUserGroup />
              الموارد البشرية
            </h1>

            <p className="mt-3 text-slate-600">
              الموظف يحتفظ بنفس رقم الموظف عند التعطيل أو العودة للعمل.
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
          >
            <FaRotate className="inline ml-2" />
            تحديث
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        <form
          onSubmit={save}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            {editingId
              ? `تعديل الموظف ${
                  lookup?.employee_code
                    ? `— ${lookup.employee_code}`
                    : ""
                }`
              : "توظيف مستخدم"}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="mb-2 block font-bold">
                البريد الإلكتروني
              </span>

              <div className="flex gap-2">
                <input
                  type="email"
                  dir="ltr"
                  value={form.email}
                  disabled={Boolean(editingId)}
                  onChange={(e) => {
                    setForm((current) => ({
                      ...current,
                      email: e.target.value,
                    }));
                    setLookup(null);
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3"
                  required
                />

                {!editingId && (
                  <button
                    type="button"
                    onClick={findByEmail}
                    disabled={looking}
                    className="rounded-xl bg-[#071d49] px-5 text-white"
                  >
                    <FaMagnifyingGlass />
                  </button>
                )}
              </div>
            </label>

            <Field
              label="الاسم الكامل"
              value={form.full_name}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  full_name: value,
                }))
              }
              required
            />

            <Field
              label="الجوال"
              value={form.phone}
              dir="ltr"
              placeholder="05xxxxxxxx"
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  phone: value,
                }))
              }
            />

            <Field
              label="القسم"
              value={form.department}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  department: value,
                }))
              }
            />

            <Field
              label="المسمى الوظيفي"
              value={form.job_title}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  job_title: value,
                }))
              }
            />

            <Field
              label="تاريخ التعيين"
              type="date"
              value={form.hire_date}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  hire_date: value,
                }))
              }
            />

            <label>
              <span className="mb-2 block font-bold">
                نوع التوظيف
              </span>

              <select
                value={form.employment_type}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    employment_type: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              >
                <option value="full_time">دوام كامل</option>
                <option value="part_time">دوام جزئي</option>
                <option value="contract">عقد</option>
                <option value="intern">متدرب</option>
              </select>
            </label>

            {editingId && (
              <label>
                <span className="mb-2 block font-bold">
                  الحالة
                </span>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </label>
            )}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <label className="flex items-center gap-3 font-black text-[#071d49]">
                <input
                  type="checkbox"
                  checked={adminAccess.enabled}
                  onChange={(e) =>
                    setAdminAccess((current) => ({
                      ...current,
                      enabled: e.target.checked,
                    }))
                  }
                />
                السماح بدخول صفحة الإدارة
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block font-bold">
                  دور الموظف
                </span>

                <select
                  value={adminAccess.role}
                  onChange={(e) =>
                    setAdminAccess((current) => ({
                      ...current,
                      role: e.target.value,
                    }))
                  }
                  disabled={!adminAccess.enabled}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3"
                >
                  <option value="manager">Manager</option>
                  <option value="sales">Sales</option>
                  <option value="engineer">Engineer</option>
                  <option value="support">Support</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                </select>
              </label>
            </div>

            <label className="md:col-span-2 xl:col-span-3">
              <span className="mb-2 block font-bold">
                ملاحظات
              </span>

              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    notes: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={saving}
              className="rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"
            >
              {saving
                ? "جارٍ الحفظ..."
                : editingId
                ? "حفظ التعديل"
                : "توظيف"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-6 py-3 font-black"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[#071d49]">
              دليل الموظفين
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الرقم أو البريد..."
              className="w-full max-w-md rounded-xl border border-slate-300 p-3"
            />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-3">رقم الموظف</th>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">الجوال</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">المسمى</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center">
                      جارٍ التحميل...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-500"
                    >
                      لا توجد بيانات.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100"
                    >
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black"
                      >
                        {row.employee_code}
                      </td>

                      <td className="p-3">
                        <b>{row.full_name}</b>
                        <div
                          dir="ltr"
                          className="text-right text-xs text-slate-500"
                        >
                          {row.email}
                        </div>
                      </td>

                      <td
                        dir="ltr"
                        className="p-3 text-right"
                      >
                        {row.phone || "—"}
                      </td>

                      <td className="p-3">
                        {row.department || "—"}
                      </td>

                      <td className="p-3">
                        {row.job_title || "—"}
                      </td>

                      <td className="p-3">
                        {row.status}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => edit(row)}
                            title="تعديل"
                            className="rounded-lg bg-blue-100 p-3 text-blue-800"
                          >
                            <FaPen />
                          </button>

                          {row.status !== "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(row, "active")
                              }
                              title="إعادة تفعيل"
                              className="rounded-lg bg-green-100 p-3 text-green-800"
                            >
                              <FaCircleCheck />
                            </button>
                          )}

                          {row.status === "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                changeStatus(row, "inactive")
                              }
                              title="تعطيل مؤقت"
                              className="rounded-lg bg-amber-100 p-3 text-amber-800"
                            >
                              <FaUserSlash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  dir,
  placeholder,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        dir={dir}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 p-3"
      />
    </label>
  );
}
