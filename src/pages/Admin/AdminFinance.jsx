import { useEffect, useMemo, useState } from "react";
import {
  FaArrowTrendUp,
  FaFileInvoiceDollar,
  FaMoneyBillTransfer,
  FaPlus,
  FaReceipt,
  FaRotate,
  FaWallet,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyExpense = {
  project_id: "",
  supplier_id: "",
  category: "operations",
  description: "",
  amount: "",
  tax_amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  payment_method: "",
  reference_no: "",
};

export default function AdminFinance() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [invoiceRes, paymentRes, expenseRes, projectRes, supplierRes] =
      await Promise.all([
        supabase
          .from("ict_invoices")
          .select("id,invoice_no,total_amount,amount_paid,balance_due,status,issue_date,due_date,customer_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("ict_payments")
          .select("id,payment_no,amount,status,payment_date,method,reference_no,invoice_id")
          .order("payment_date", { ascending: false }),
        supabase
          .from("ict_expenses")
          .select("*")
          .order("expense_date", { ascending: false })
          .limit(150),
        supabase
          .from("ict_delivery_projects")
          .select("id,project_no,project_name")
          .order("created_at", { ascending: false }),
        supabase
          .from("ict_suppliers")
          .select("id,supplier_no,name,status")
          .eq("status", "active")
          .order("name"),
      ]);

    const error =
      invoiceRes.error ||
      paymentRes.error ||
      expenseRes.error ||
      projectRes.error ||
      supplierRes.error;

    if (error) {
      setMessage(error.message);
    } else {
      setInvoices(invoiceRes.data || []);
      setPayments(paymentRes.data || []);
      setExpenses(expenseRes.data || []);
      setProjects(projectRes.data || []);
      setSuppliers(supplierRes.data || []);
    }

    setLoading(false);
  }

  async function addExpense(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("ict_expenses").insert({
      project_id: form.project_id || null,
      supplier_id: form.supplier_id || null,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount || 0),
      tax_amount: Number(form.tax_amount || 0),
      expense_date: form.expense_date,
      payment_method: form.payment_method || null,
      reference_no: form.reference_no.trim() || null,
      status: "approved",
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم تسجيل المصروف.");
      setForm(emptyExpense);
      await load();
    }

    setSaving(false);
  }

  const kpi = useMemo(() => {
    const invoiced = invoices.reduce(
      (sum, row) => sum + Number(row.total_amount || 0),
      0
    );
    const outstanding = invoices.reduce(
      (sum, row) => sum + Number(row.balance_due || 0),
      0
    );
    const collected = payments
      .filter((row) => row.status !== "reversed")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const expenseTotal = expenses
      .filter((row) => row.status !== "cancelled")
      .reduce(
        (sum, row) =>
          sum +
          Number(row.amount || 0) +
          Number(row.tax_amount || 0),
        0
      );

    return {
      invoiced,
      outstanding,
      collected,
      expenseTotal,
      netCash: collected - expenseTotal,
    };
  }, [invoices, payments, expenses]);

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

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">FINANCE CONTROL</span>
            <h1 className="erp-page-title">المالية والتحصيل</h1>
            <p className="erp-page-subtitle">
              الفواتير والتحصيل والمصروفات في رؤية مالية واحدة.
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            title="إجمالي الفوترة"
            value={money(kpi.invoiced)}
            icon={<FaFileInvoiceDollar />}
          />
          <Metric
            title="المحصل"
            value={money(kpi.collected)}
            icon={<FaMoneyBillTransfer />}
          />
          <Metric
            title="المتبقي"
            value={money(kpi.outstanding)}
            icon={<FaWallet />}
          />
          <Metric
            title="المصروفات"
            value={money(kpi.expenseTotal)}
            icon={<FaReceipt />}
          />
          <Metric
            title="صافي الحركة"
            value={money(kpi.netCash)}
            icon={<FaArrowTrendUp />}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <form onSubmit={addExpense} className="erp-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#e96f20]">
                <FaPlus />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0f2747]">
                  تسجيل مصروف
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  مصروف عام أو مرتبط بمشروع / مورد.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Select
                label="المشروع"
                value={form.project_id}
                onChange={(v) => setForm((f) => ({ ...f, project_id: v }))}
              >
                <option value="">عام / بدون مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_no
                      ? `${p.project_no} — ${p.project_name || ""}`
                      : p.project_name}
                  </option>
                ))}
              </Select>

              <Select
                label="المورد"
                value={form.supplier_id}
                onChange={(v) =>
                  setForm((f) => ({ ...f, supplier_id: v }))
                }
              >
                <option value="">بدون مورد</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_no} — {s.name}
                  </option>
                ))}
              </Select>

              <Select
                label="التصنيف"
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <option value="operations">تشغيل</option>
                <option value="project">مشروع</option>
                <option value="travel">سفر وانتقالات</option>
                <option value="office">مكتب وإدارة</option>
                <option value="maintenance">صيانة</option>
                <option value="other">أخرى</option>
              </Select>

              <Input
                label="تاريخ المصروف"
                type="date"
                value={form.expense_date}
                onChange={(v) =>
                  setForm((f) => ({ ...f, expense_date: v }))
                }
              />

              <Input
                label="المبلغ"
                type="number"
                value={form.amount}
                onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                required
              />

              <Input
                label="الضريبة"
                type="number"
                value={form.tax_amount}
                onChange={(v) =>
                  setForm((f) => ({ ...f, tax_amount: v }))
                }
              />

              <Input
                label="طريقة الدفع"
                value={form.payment_method}
                onChange={(v) =>
                  setForm((f) => ({ ...f, payment_method: v }))
                }
                placeholder="تحويل / نقدي / بطاقة"
              />

              <Input
                label="المرجع"
                value={form.reference_no}
                onChange={(v) =>
                  setForm((f) => ({ ...f, reference_no: v }))
                }
              />

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-black text-slate-600">
                  الوصف
                </span>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <button
              disabled={saving}
              className="erp-btn-primary mt-5 w-full"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ المصروف"}
            </button>
          </form>

          <section className="erp-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#0f2747]">
                  أحدث المصروفات
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  آخر 150 حركة مصروفات.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">رقم</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الوصف</th>
                    <th className="p-3">المشروع</th>
                    <th className="p-3">المورد</th>
                    <th className="p-3">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-8 text-center text-slate-400"
                      >
                        لا توجد مصروفات مسجلة.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td
                          dir="ltr"
                          className="p-3 text-right font-black text-[#345a82]"
                        >
                          {row.expense_no}
                        </td>
                        <td className="p-3">{row.expense_date}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-700">
                            {row.description}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {row.category}
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
                          className="p-3 text-right font-black text-[#0f2747]"
                        >
                          {money(
                            Number(row.amount || 0) +
                              Number(row.tax_amount || 0)
                          )}
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
    </div>
  );
}

function Metric({ title, value, icon }) {
  return (
    <article className="erp-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{title}</p>
          <p dir="ltr" className="mt-2 text-right text-2xl font-black text-[#0f2747]">
            {value}
          </p>
          <p className="mt-1 text-[10px] font-black text-slate-300">SAR</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">
          {icon}
        </div>
      </div>
    </article>
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
