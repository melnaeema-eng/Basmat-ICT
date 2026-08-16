import { useEffect, useMemo, useState } from "react";
import {
  FaArrowTrendUp,
  FaBook,
  FaBuildingColumns,
  FaCalculator,
  FaCircleCheck,
  FaFileInvoiceDollar,
  FaMoneyBillTransfer,
  FaPlus,
  FaReceipt,
  FaRotate,
  FaScaleBalanced,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyManual = {
  entry_date: new Date().toISOString().slice(0, 10),
  description: "",
  reference_no: "",
  debit_account_id: "",
  credit_account_id: "",
  amount: "",
  project_id: "",
};

export default function AdminAccounting() {
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [trial, setTrial] = useState([]);
  const [pl, setPl] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [manual, setManual] = useState(emptyManual);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [
      accountsRes,
      entriesRes,
      trialRes,
      plRes,
      invoiceRes,
      paymentRes,
      expenseRes,
      projectRes,
    ] = await Promise.all([
      supabase
        .from("ict_chart_accounts")
        .select("*")
        .order("account_code"),
      supabase
        .from("ict_journal_entries")
        .select("id,entry_no,entry_date,description,reference_type,reference_no,status,posted_at")
        .order("entry_date", { ascending: false })
        .limit(150),
      supabase.rpc("ict_accounting_trial_balance", {
        p_from: null,
        p_to: null,
      }),
      supabase.rpc("ict_accounting_profit_loss", {
        p_from: null,
        p_to: null,
      }),
      supabase
        .from("ict_invoices")
        .select("id,invoice_no,total_amount,status,issue_date")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ict_payments")
        .select("id,payment_no,amount,status,payment_date")
        .order("payment_date", { ascending: false })
        .limit(50),
      supabase
        .from("ict_expenses")
        .select("id,expense_no,description,amount,tax_amount,status,expense_date")
        .order("expense_date", { ascending: false })
        .limit(50),
      supabase
        .from("ict_delivery_projects")
        .select("id,project_no,project_name")
        .order("created_at", { ascending: false }),
    ]);

    const error =
      accountsRes.error ||
      entriesRes.error ||
      trialRes.error ||
      plRes.error ||
      invoiceRes.error ||
      paymentRes.error ||
      expenseRes.error ||
      projectRes.error;

    if (error) {
      setMessage(error.message);
    } else {
      setAccounts(accountsRes.data || []);
      setEntries(entriesRes.data || []);
      setTrial(trialRes.data || []);
      setPl(plRes.data || []);
      setInvoices(invoiceRes.data || []);
      setPayments(paymentRes.data || []);
      setExpenses(expenseRes.data || []);
      setProjects(projectRes.data || []);
    }

    setLoading(false);
  }

  async function postSource(type, id) {
    setBusy(true);
    setMessage("");

    const fn =
      type === "invoice"
        ? "ict_accounting_post_invoice"
        : type === "payment"
        ? "ict_accounting_post_payment"
        : "ict_accounting_post_expense";

    const params =
      type === "invoice"
        ? { p_invoice_id: id }
        : type === "payment"
        ? { p_payment_id: id }
        : { p_expense_id: id };

    const { data, error } = await supabase.rpc(fn, params);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        data?.created === false
          ? data?.message || "الحركة مرحّلة بالفعل."
          : "تم الترحيل المحاسبي بنجاح."
      );
      await load();
    }

    setBusy(false);
  }

  async function createManual(event) {
    event.preventDefault();

    const amount = Number(manual.amount || 0);
    if (
      !manual.debit_account_id ||
      !manual.credit_account_id ||
      amount <= 0
    ) {
      setMessage("حدد حساب المدين والدائن والمبلغ.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "ict_create_manual_journal",
      {
        p_entry_date: manual.entry_date,
        p_description: manual.description.trim(),
        p_reference_no: manual.reference_no || null,
        p_lines: [
          {
            account_id: manual.debit_account_id,
            debit: amount,
            credit: 0,
            project_id: manual.project_id || null,
          },
          {
            account_id: manual.credit_account_id,
            debit: 0,
            credit: amount,
            project_id: manual.project_id || null,
          },
        ],
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم إنشاء وترحيل القيد.");
      setManual(emptyManual);
      await load();
    }

    setBusy(false);
  }

  const plSummary = useMemo(() => {
    const revenue = Number(
      pl.find((r) => r.account_type === "revenue")?.amount || 0
    );
    const expense = Number(
      pl.find((r) => r.account_type === "expense")?.amount || 0
    );
    return {
      revenue,
      expense,
      net: revenue - expense,
    };
  }, [pl]);

  const totals = useMemo(() => {
    return trial.reduce(
      (acc, row) => {
        acc.debit += Number(row.debit || 0);
        acc.credit += Number(row.credit || 0);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [trial]);

  const postedRefs = useMemo(
    () =>
      new Set(
        entries
          .filter((e) => e.reference_type && e.reference_no)
          .map((e) => `${e.reference_type}:${e.reference_no}`)
      ),
    [entries]
  );

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">ACCOUNTING CONTROL</span>
            <h1 className="erp-page-title">
              المحاسبة والرقابة المالية
            </h1>
            <p className="erp-page-subtitle">
              شجرة الحسابات والقيود والترحيل والتقارير المالية في مركز واحد.
            </p>
          </div>

          <button
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
            title="الإيرادات"
            value={plSummary.revenue}
            icon={<FaArrowTrendUp />}
          />
          <Metric
            title="المصروفات"
            value={plSummary.expense}
            icon={<FaReceipt />}
          />
          <Metric
            title="صافي الربح"
            value={plSummary.net}
            icon={<FaCalculator />}
          />
          <Metric
            title="إجمالي المدين"
            value={totals.debit}
            icon={<FaScaleBalanced />}
          />
          <Metric
            title="إجمالي الدائن"
            value={totals.credit}
            icon={<FaScaleBalanced />}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["overview", "نظرة عامة"],
            ["posting", "الترحيل التشغيلي"],
            ["journal", "القيود"],
            ["coa", "شجرة الحسابات"],
            ["trial", "ميزان المراجعة"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "rounded-xl px-4 py-2 text-sm font-black transition",
                tab === key
                  ? "bg-[#0f2747] text-white"
                  : "border border-slate-200 bg-white text-slate-500 hover:text-[#0f2747]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="erp-card p-6">
              <SectionTitle
                icon={<FaBook />}
                title="آخر القيود"
                text="آخر 150 قيد محاسبي."
              />
              <EntryTable rows={entries.slice(0, 12)} />
            </section>

            <form onSubmit={createManual} className="erp-card p-6">
              <SectionTitle
                icon={<FaPlus />}
                title="قيد يدوي سريع"
                text="قيد متوازن وترحيل مباشر."
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="التاريخ"
                  type="date"
                  value={manual.entry_date}
                  onChange={(v) =>
                    setManual((f) => ({ ...f, entry_date: v }))
                  }
                />

                <Field
                  label="المرجع"
                  value={manual.reference_no}
                  onChange={(v) =>
                    setManual((f) => ({ ...f, reference_no: v }))
                  }
                />

                <AccountSelect
                  label="الحساب المدين"
                  value={manual.debit_account_id}
                  onChange={(v) =>
                    setManual((f) => ({
                      ...f,
                      debit_account_id: v,
                    }))
                  }
                  accounts={accounts}
                />

                <AccountSelect
                  label="الحساب الدائن"
                  value={manual.credit_account_id}
                  onChange={(v) =>
                    setManual((f) => ({
                      ...f,
                      credit_account_id: v,
                    }))
                  }
                  accounts={accounts}
                />

                <Field
                  label="المبلغ"
                  type="number"
                  value={manual.amount}
                  onChange={(v) =>
                    setManual((f) => ({ ...f, amount: v }))
                  }
                />

                <label>
                  <span className="mb-2 block text-sm font-black text-slate-600">
                    المشروع
                  </span>
                  <select
                    value={manual.project_id}
                    onChange={(e) =>
                      setManual((f) => ({
                        ...f,
                        project_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                  >
                    <option value="">بدون مشروع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_no
                          ? `${p.project_no} — ${p.project_name || ""}`
                          : p.project_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-600">
                    البيان
                  </span>
                  <textarea
                    rows="3"
                    value={manual.description}
                    onChange={(e) =>
                      setManual((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
                  />
                </label>
              </div>

              <button
                disabled={busy}
                className="erp-btn-primary mt-5 w-full"
              >
                إنشاء وترحيل القيد
              </button>
            </form>
          </div>
        )}

        {tab === "posting" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <SourceCard
              title="الفواتير"
              icon={<FaFileInvoiceDollar />}
              rows={invoices}
              keyFor={(r) => `invoice:${r.invoice_no}`}
              postedRefs={postedRefs}
              primary={(r) => r.invoice_no}
              secondary={(r) => `${money(r.total_amount)} SAR`}
              onPost={(r) => postSource("invoice", r.id)}
              busy={busy}
            />

            <SourceCard
              title="التحصيلات"
              icon={<FaMoneyBillTransfer />}
              rows={payments}
              keyFor={(r) => `payment:${r.payment_no}`}
              postedRefs={postedRefs}
              primary={(r) => r.payment_no}
              secondary={(r) => `${money(r.amount)} SAR`}
              onPost={(r) => postSource("payment", r.id)}
              busy={busy}
            />

            <SourceCard
              title="المصروفات"
              icon={<FaReceipt />}
              rows={expenses}
              keyFor={(r) => `expense:${r.expense_no}`}
              postedRefs={postedRefs}
              primary={(r) => r.expense_no}
              secondary={(r) =>
                `${money(
                  Number(r.amount || 0) +
                    Number(r.tax_amount || 0)
                )} SAR`
              }
              onPost={(r) => postSource("expense", r.id)}
              busy={busy}
            />
          </div>
        )}

        {tab === "journal" && (
          <section className="erp-card mt-6 p-6">
            <SectionTitle
              icon={<FaBook />}
              title="دفتر القيود"
              text="القيود اليدوية والتشغيلية."
            />
            <EntryTable rows={entries} />
          </section>
        )}

        {tab === "coa" && (
          <section className="erp-card mt-6 p-6">
            <SectionTitle
              icon={<FaBuildingColumns />}
              title="شجرة الحسابات"
              text="الحسابات النظامية والقابلة للتوسع."
            />

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[750px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">الكود</th>
                    <th className="p-3">الحساب</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">الطبيعة</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-slate-100"
                    >
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black text-[#345a82]"
                      >
                        {a.account_code}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {a.account_name}
                      </td>
                      <td className="p-3">{a.account_type}</td>
                      <td className="p-3">{a.normal_balance}</td>
                      <td className="p-3">
                        {a.is_active ? "نشط" : "معطل"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "trial" && (
          <section className="erp-card mt-6 p-6">
            <SectionTitle
              icon={<FaScaleBalanced />}
              title="ميزان المراجعة"
              text="من القيود المرحلة فقط."
            />

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">الكود</th>
                    <th className="p-3">الحساب</th>
                    <th className="p-3">المدين</th>
                    <th className="p-3">الدائن</th>
                    <th className="p-3">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {trial.map((r) => (
                    <tr
                      key={r.account_code}
                      className="border-t border-slate-100"
                    >
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black text-[#345a82]"
                      >
                        {r.account_code}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {r.account_name}
                      </td>
                      <td
                        dir="ltr"
                        className="p-3 text-right"
                      >
                        {money(r.debit)}
                      </td>
                      <td
                        dir="ltr"
                        className="p-3 text-right"
                      >
                        {money(r.credit)}
                      </td>
                      <td
                        dir="ltr"
                        className="p-3 text-right font-black"
                      >
                        {money(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
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
          <p
            dir="ltr"
            className="mt-2 text-right text-2xl font-black text-[#0f2747]"
          >
            {money(value)}
          </p>
          <p className="mt-1 text-[10px] font-black text-slate-300">
            SAR
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function SectionTitle({ icon, title, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-[#0f2747]">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function EntryTable({ rows }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[850px] text-right">
        <thead>
          <tr>
            <th className="p-3">القيد</th>
            <th className="p-3">التاريخ</th>
            <th className="p-3">البيان</th>
            <th className="p-3">المرجع</th>
            <th className="p-3">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="p-8 text-center text-slate-400"
              >
                لا توجد قيود.
              </td>
            </tr>
          ) : (
            rows.map((e) => (
              <tr
                key={e.id}
                className="border-t border-slate-100"
              >
                <td
                  dir="ltr"
                  className="p-3 text-right font-black text-[#345a82]"
                >
                  {e.entry_no}
                </td>
                <td className="p-3">{e.entry_date}</td>
                <td className="p-3 font-bold text-slate-700">
                  {e.description}
                </td>
                <td className="p-3">
                  {e.reference_no || e.reference_type || "—"}
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SourceCard({
  title,
  icon,
  rows,
  keyFor,
  postedRefs,
  primary,
  secondary,
  onPost,
  busy,
}) {
  return (
    <section className="erp-card p-6">
      <SectionTitle
        icon={icon}
        title={title}
        text="آخر 50 حركة."
      />

      <div className="mt-5 max-h-[620px] space-y-2 overflow-y-auto pl-1">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            لا توجد بيانات.
          </p>
        ) : (
          rows.map((row) => {
            const posted = postedRefs.has(keyFor(row));

            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fbfcfd] p-3"
              >
                <div className="min-w-0">
                  <p
                    dir="ltr"
                    className="truncate text-right text-sm font-black text-[#0f2747]"
                  >
                    {primary(row)}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-1 text-right text-xs text-slate-400"
                  >
                    {secondary(row)}
                  </p>
                </div>

                {posted ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700">
                    <FaCircleCheck />
                    مرحّل
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPost(row)}
                    disabled={busy}
                    className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    ترحيل
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
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
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
      />
    </label>
  );
}

function AccountSelect({
  label,
  value,
  onChange,
  accounts,
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
      >
        <option value="">اختر الحساب</option>
        {accounts
          .filter((a) => a.is_active)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_code} — {a.account_name}
            </option>
          ))}
      </select>
    </label>
  );
}
