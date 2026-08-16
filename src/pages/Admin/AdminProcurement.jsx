import { useEffect, useMemo, useState } from "react";
import {
  FaBoxesPacking,
  FaBuilding,
  FaCircleCheck,
  FaFileCirclePlus,
  FaPlus,
  FaRotate,
  FaXmark,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const supplierEmpty = {
  name: "",
  vat_number: "",
  contact_name: "",
  email: "",
  phone: "",
  city: "",
  payment_terms: "",
};

const prEmpty = {
  project_id: "",
  supplier_id: "",
  title: "",
  description: "",
  department: "",
  required_date: "",
  estimated_amount: "",
};

export default function AdminProcurement() {
  const [suppliers, setSuppliers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pos, setPos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [supplierForm, setSupplierForm] = useState(supplierEmpty);
  const [prForm, setPrForm] = useState(prEmpty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [supplierRes, prRes, poRes, projectRes] = await Promise.all([
      supabase
        .from("ict_suppliers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_purchase_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("ict_purchase_orders")
        .select("id,po_no,project_id,vendor_name,description,amount,po_date,status")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("ict_delivery_projects")
        .select("id,project_no,project_name")
        .order("created_at", { ascending: false }),
    ]);

    const error =
      supplierRes.error ||
      prRes.error ||
      poRes.error ||
      projectRes.error;

    if (error) {
      setMessage(error.message);
    } else {
      setSuppliers(supplierRes.data || []);
      setRequests(prRes.data || []);
      setPos(poRes.data || []);
      setProjects(projectRes.data || []);
    }

    setLoading(false);
  }

  async function addSupplier(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("ict_suppliers").insert({
      name: supplierForm.name.trim(),
      vat_number: supplierForm.vat_number.trim() || null,
      contact_name: supplierForm.contact_name.trim() || null,
      email: supplierForm.email.trim().toLowerCase() || null,
      phone: supplierForm.phone.trim() || null,
      city: supplierForm.city.trim() || null,
      payment_terms: supplierForm.payment_terms.trim() || null,
      status: "active",
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تمت إضافة المورد.");
      setSupplierForm(supplierEmpty);
      await load();
    }

    setSaving(false);
  }

  async function addRequest(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("ict_purchase_requests").insert({
      project_id: prForm.project_id || null,
      supplier_id: prForm.supplier_id || null,
      title: prForm.title.trim(),
      description: prForm.description.trim() || null,
      department: prForm.department.trim() || null,
      required_date: prForm.required_date || null,
      estimated_amount: Number(prForm.estimated_amount || 0),
      status: "pending",
      requested_by: user?.id || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم إرسال طلب الشراء.");
      setPrForm(prEmpty);
      await load();
    }

    setSaving(false);
  }

  async function reviewRequest(id, status) {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const note =
      window.prompt(
        status === "approved"
          ? "ملاحظة الاعتماد (اختياري)"
          : "سبب الرفض (اختياري)"
      ) || null;

    const { error } = await supabase
      .from("ict_purchase_requests")
      .update({
        status,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        approval_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        status === "approved"
          ? "تم اعتماد طلب الشراء."
          : "تم رفض طلب الشراء."
      );
      await load();
    }

    setSaving(false);
  }

  const projectMap = useMemo(
    () =>
      Object.fromEntries(
        projects.map((p) => [
          p.id,
          p.project_name || p.project_no || p.id,
        ])
      ),
    [projects]
  );

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  );

  const stats = useMemo(
    () => ({
      suppliers: suppliers.filter((s) => s.status === "active").length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      poValue: pos
        .filter((p) => p.status !== "cancelled")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    }),
    [suppliers, requests, pos]
  );

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">PROCUREMENT CONTROL</span>
            <h1 className="erp-page-title">المشتريات والموردون</h1>
            <p className="erp-page-subtitle">
              الموردون وطلبات الشراء وأوامر الشراء في دورة موحدة.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="erp-btn-secondary"
          >
            <FaRotate />
            تحديث
          </button>
        </section>

        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Mini title="الموردون النشطون" value={stats.suppliers} />
          <Mini title="طلبات معلقة" value={stats.pending} />
          <Mini title="طلبات معتمدة" value={stats.approved} />
          <Mini title="قيمة أوامر الشراء" value={money(stats.poValue)} suffix="SAR" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <form onSubmit={addSupplier} className="erp-card p-6">
            <Title
              icon={<FaBuilding />}
              title="إضافة مورد"
              text="سجل المورد الأساسي لاستخدامه في المشتريات والمصروفات."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input
                label="اسم المورد"
                value={supplierForm.name}
                onChange={(v) =>
                  setSupplierForm((f) => ({ ...f, name: v }))
                }
                required
              />
              <Input
                label="الرقم الضريبي"
                value={supplierForm.vat_number}
                onChange={(v) =>
                  setSupplierForm((f) => ({ ...f, vat_number: v }))
                }
              />
              <Input
                label="جهة الاتصال"
                value={supplierForm.contact_name}
                onChange={(v) =>
                  setSupplierForm((f) => ({
                    ...f,
                    contact_name: v,
                  }))
                }
              />
              <Input
                label="الجوال"
                value={supplierForm.phone}
                onChange={(v) =>
                  setSupplierForm((f) => ({ ...f, phone: v }))
                }
              />
              <Input
                label="البريد"
                type="email"
                value={supplierForm.email}
                onChange={(v) =>
                  setSupplierForm((f) => ({ ...f, email: v }))
                }
              />
              <Input
                label="المدينة"
                value={supplierForm.city}
                onChange={(v) =>
                  setSupplierForm((f) => ({ ...f, city: v }))
                }
              />
              <Input
                label="شروط الدفع"
                value={supplierForm.payment_terms}
                onChange={(v) =>
                  setSupplierForm((f) => ({
                    ...f,
                    payment_terms: v,
                  }))
                }
                placeholder="30 يوم / مقدم..."
              />
            </div>

            <button
              disabled={saving}
              className="erp-btn-primary mt-5"
            >
              <FaPlus />
              إضافة المورد
            </button>
          </form>

          <form onSubmit={addRequest} className="erp-card p-6">
            <Title
              icon={<FaFileCirclePlus />}
              title="طلب شراء جديد"
              text="PR قبل إصدار أمر الشراء."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input
                label="العنوان"
                value={prForm.title}
                onChange={(v) =>
                  setPrForm((f) => ({ ...f, title: v }))
                }
                required
              />

              <Input
                label="القسم"
                value={prForm.department}
                onChange={(v) =>
                  setPrForm((f) => ({ ...f, department: v }))
                }
              />

              <Select
                label="المشروع"
                value={prForm.project_id}
                onChange={(v) =>
                  setPrForm((f) => ({ ...f, project_id: v }))
                }
              >
                <option value="">بدون مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_no
                      ? `${p.project_no} — ${p.project_name || ""}`
                      : p.project_name}
                  </option>
                ))}
              </Select>

              <Select
                label="المورد المقترح"
                value={prForm.supplier_id}
                onChange={(v) =>
                  setPrForm((f) => ({ ...f, supplier_id: v }))
                }
              >
                <option value="">غير محدد</option>
                {suppliers
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_no} — {s.name}
                    </option>
                  ))}
              </Select>

              <Input
                label="القيمة التقديرية"
                type="number"
                value={prForm.estimated_amount}
                onChange={(v) =>
                  setPrForm((f) => ({
                    ...f,
                    estimated_amount: v,
                  }))
                }
              />

              <Input
                label="تاريخ الاحتياج"
                type="date"
                value={prForm.required_date}
                onChange={(v) =>
                  setPrForm((f) => ({
                    ...f,
                    required_date: v,
                  }))
                }
              />

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-black text-slate-600">
                  التفاصيل
                </span>
                <textarea
                  rows="3"
                  value={prForm.description}
                  onChange={(e) =>
                    setPrForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <button
              disabled={saving}
              className="erp-btn-primary mt-5"
            >
              إرسال طلب الشراء
            </button>
          </form>
        </div>

        <section className="erp-card mt-6 p-6">
          <Title
            icon={<FaBoxesPacking />}
            title="طلبات الشراء"
            text="المراجعة والاعتماد قبل أمر الشراء."
          />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1000px] text-right">
              <thead>
                <tr>
                  <th className="p-3">PR</th>
                  <th className="p-3">الطلب</th>
                  <th className="p-3">المشروع</th>
                  <th className="p-3">المورد</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-slate-400"
                    >
                      لا توجد طلبات شراء.
                    </td>
                  </tr>
                ) : (
                  requests.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black text-[#345a82]"
                      >
                        {row.pr_no}
                      </td>
                      <td className="p-3">
                        <p className="font-black text-slate-700">
                          {row.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.department || "—"}
                        </p>
                      </td>
                      <td className="p-3">
                        {projectMap[row.project_id] || "—"}
                      </td>
                      <td className="p-3">
                        {supplierMap[row.supplier_id] || "—"}
                      </td>
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black"
                      >
                        {money(row.estimated_amount)}
                      </td>
                      <td className="p-3">
                        <Status value={row.status} />
                      </td>
                      <td className="p-3">
                        {row.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                reviewRequest(row.id, "approved")
                              }
                              className="rounded-lg bg-green-50 p-2 text-green-700"
                              title="اعتماد"
                            >
                              <FaCircleCheck />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                reviewRequest(row.id, "rejected")
                              }
                              className="rounded-lg bg-red-50 p-2 text-red-600"
                              title="رفض"
                            >
                              <FaXmark />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="erp-card mt-6 p-6">
          <Title
            icon={<FaBoxesPacking />}
            title="أوامر الشراء الحالية"
            text="قراءة من جدول PO المعتمد الموجود في النظام."
          />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-right">
              <thead>
                <tr>
                  <th className="p-3">PO</th>
                  <th className="p-3">المورد</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-slate-400"
                    >
                      لا توجد أوامر شراء.
                    </td>
                  </tr>
                ) : (
                  pos.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black text-[#345a82]"
                      >
                        {row.po_no}
                      </td>
                      <td className="p-3">{row.vendor_name}</td>
                      <td className="p-3">{row.po_date}</td>
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black"
                      >
                        {money(row.amount)}
                      </td>
                      <td className="p-3">
                        <Status value={row.status} />
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

function Title({ icon, title, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-[#0f2747]">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function Mini({ title, value, suffix }) {
  return (
    <article className="erp-card p-5">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p dir="ltr" className="mt-2 text-right text-2xl font-black text-[#0f2747]">
        {value}
      </p>
      {suffix && (
        <p className="mt-1 text-[10px] font-black text-slate-300">
          {suffix}
        </p>
      )}
    </article>
  );
}

function Status({ value }) {
  const map = {
    pending: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
    draft: "مسودة",
    issued: "صادر",
    partially_received: "استلام جزئي",
    received: "مستلم",
    cancelled: "ملغي",
  };
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
      {map[value] || value}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
      >
        {children}
      </select>
    </label>
  );
}
