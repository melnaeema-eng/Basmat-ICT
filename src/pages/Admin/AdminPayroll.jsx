import { useEffect, useMemo, useState } from "react";
import {
  FaCalculator,
  FaCircleCheck,
  FaCoins,
  FaFileInvoiceDollar,
  FaMoneyBillTransfer,
  FaPeopleGroup,
  FaPlus,
  FaRotate,
  FaSackDollar,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (v) =>
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const compEmpty = {
  employee_id: "",
  basic_salary: "",
  housing_allowance: "",
  transport_allowance: "",
  other_allowances: "",
  fixed_deductions: "",
  overtime_hour_rate: "",
  working_days_divisor: "30",
};

const advanceEmpty = {
  employee_id: "",
  amount: "",
  installment_amount: "",
  start_month: "",
  notes: "",
};

export default function AdminPayroll() {
  const [employees, setEmployees] = useState([]);
  const [comp, setComp] = useState([]);
  const [runs, setRuns] = useState([]);
  const [lines, setLines] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [compForm, setCompForm] = useState(compEmpty);
  const [advanceForm, setAdvanceForm] = useState(advanceEmpty);
  const [selectedRun, setSelectedRun] = useState("");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [eRes, cRes, rRes, aRes] = await Promise.all([
      supabase
        .from("ict_hr_employees")
        .select("id,employee_code,full_name,department,job_title,status")
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("ict_hr_compensation")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_payroll_runs")
        .select("*")
        .order("payroll_year", { ascending: false })
        .order("payroll_month", { ascending: false }),
      supabase
        .from("ict_hr_advances")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const error = eRes.error || cRes.error || rRes.error || aRes.error;
    if (error) {
      setMessage(error.message);
    } else {
      setEmployees(eRes.data || []);
      setComp(cRes.data || []);
      setRuns(rRes.data || []);
      setAdvances(aRes.data || []);

      const current = (rRes.data || [])[0]?.id || "";
      setSelectedRun((prev) => prev || current);
      if (current && !selectedRun) {
        await loadLines(current);
      }
    }

    setLoading(false);
  }

  async function loadLines(runId) {
    if (!runId) {
      setLines([]);
      return;
    }
    const { data, error } = await supabase
      .from("ict_payroll_lines")
      .select("*")
      .eq("payroll_run_id", runId)
      .order("created_at");
    if (error) setMessage(error.message);
    else setLines(data || []);
  }

  async function saveComp(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      employee_id: compForm.employee_id,
      basic_salary: Number(compForm.basic_salary || 0),
      housing_allowance: Number(compForm.housing_allowance || 0),
      transport_allowance: Number(compForm.transport_allowance || 0),
      other_allowances: Number(compForm.other_allowances || 0),
      fixed_deductions: Number(compForm.fixed_deductions || 0),
      overtime_hour_rate: Number(compForm.overtime_hour_rate || 0),
      working_days_divisor: Number(compForm.working_days_divisor || 30),
      effective_from: new Date().toISOString().slice(0, 10),
    };

    const { error } = await supabase
      .from("ict_hr_compensation")
      .upsert(payload, { onConflict: "employee_id" });

    if (error) setMessage(error.message);
    else {
      setMessage("تم حفظ هيكل راتب الموظف.");
      setCompForm(compEmpty);
      await load();
    }
    setBusy(false);
  }

  async function addAdvance(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const amount = Number(advanceForm.amount || 0);
    const { error } = await supabase.from("ict_hr_advances").insert({
      employee_id: advanceForm.employee_id,
      amount,
      installment_amount: Number(advanceForm.installment_amount || 0),
      balance: amount,
      start_month: advanceForm.start_month || null,
      status: "active",
      notes: advanceForm.notes.trim() || null,
    });

    if (error) setMessage(error.message);
    else {
      setMessage("تم تسجيل السلفة.");
      setAdvanceForm(advanceEmpty);
      await load();
    }
    setBusy(false);
  }

  async function generatePayroll() {
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "ict_generate_payroll_run",
      {
        p_year: Number(year),
        p_month: Number(month),
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("تم توليد مسير الرواتب.");
      await load();
      if (data?.payroll_run_id) {
        setSelectedRun(data.payroll_run_id);
        await loadLines(data.payroll_run_id);
      }
      setTab("payroll");
    }
    setBusy(false);
  }

  async function approveRun(run) {
    setBusy(true);
    const { error } = await supabase.rpc("ict_approve_payroll_run", {
      p_run_id: run.id,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تم اعتماد مسير الرواتب.");
      await load();
    }
    setBusy(false);
  }

  async function markPaid(run) {
    if (!window.confirm("تأكيد دفع مسير الرواتب؟")) return;
    setBusy(true);
    const { error } = await supabase.rpc("ict_mark_payroll_paid", {
      p_run_id: run.id,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تم إقفال المسير كمدفوع.");
      await load();
    }
    setBusy(false);
  }

  async function adjustment(line) {
    const value = window.prompt(
      "التعديل اليدوي: قيمة موجبة إضافة، سالبة خصم",
      String(line.manual_adjustment || 0)
    );
    if (value === null) return;
    const note = window.prompt("ملاحظة التعديل (اختياري)") || null;

    setBusy(true);
    const { error } = await supabase.rpc(
      "ict_update_payroll_line_adjustment",
      {
        p_line_id: line.id,
        p_manual_adjustment: Number(value || 0),
        p_notes: note,
      }
    );
    if (error) setMessage(error.message);
    else {
      setMessage("تم تحديث التعديل.");
      await loadLines(selectedRun);
      await load();
    }
    setBusy(false);
  }

  const employeeMap = useMemo(
    () =>
      Object.fromEntries(
        employees.map((e) => [
          e.id,
          `${e.employee_code || ""} — ${e.full_name}`,
        ])
      ),
    [employees]
  );

  const stats = useMemo(() => {
    const activeRun = runs.find((r) => r.id === selectedRun) || runs[0];
    return {
      employees: employees.length,
      compensated: comp.length,
      gross: Number(activeRun?.total_gross || 0),
      deductions: Number(activeRun?.total_deductions || 0),
      net: Number(activeRun?.total_net || 0),
      advances: advances
        .filter((a) => a.status === "active")
        .reduce((sum, a) => sum + Number(a.balance || 0), 0),
    };
  }, [employees, comp, runs, selectedRun, advances]);

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">HR & PAYROLL</span>
            <h1 className="erp-page-title">الموارد البشرية والرواتب</h1>
            <p className="erp-page-subtitle">
              هيكل الرواتب والسلف ومسير الرواتب وربطه بالحضور والإجازات.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="erp-btn-secondary">
            <FaRotate />
            تحديث
          </button>
        </section>

        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric title="الموظفون" value={stats.employees} icon={<FaPeopleGroup />} />
          <Metric title="لديهم هيكل راتب" value={stats.compensated} icon={<FaSackDollar />} />
          <Metric title="إجمالي Gross" value={money(stats.gross)} suffix="SAR" icon={<FaCoins />} />
          <Metric title="الخصومات" value={money(stats.deductions)} suffix="SAR" icon={<FaCalculator />} />
          <Metric title="صافي المسير" value={money(stats.net)} suffix="SAR" icon={<FaMoneyBillTransfer />} />
          <Metric title="رصيد السلف" value={money(stats.advances)} suffix="SAR" icon={<FaFileInvoiceDollar />} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["overview", "نظرة عامة"],
            ["compensation", "هياكل الرواتب"],
            ["advances", "السلف"],
            ["payroll", "مسير الرواتب"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "rounded-xl px-4 py-2 text-sm font-black",
                tab === key
                  ? "bg-[#0f2747] text-white"
                  : "border border-slate-200 bg-white text-slate-500",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="erp-card p-6">
              <Title title="تشغيل مسير الرواتب" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input label="السنة" type="number" value={year} onChange={setYear} />
                <Select label="الشهر" value={month} onChange={setMonth}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={generatePayroll}
                className="erp-btn-primary mt-5 w-full"
              >
                توليد مسير الرواتب
              </button>
              <p className="mt-4 text-xs leading-6 text-slate-400">
                يعتمد على الراتب الأساسي والبدلات والخصومات الثابتة، الغياب،
                الإجازة بدون راتب، والسلف النشطة.
              </p>
            </section>

            <section className="erp-card p-6">
              <Title title="آخر المسيرات" />
              <div className="mt-5 space-y-2">
                {runs.slice(0, 8).map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={async () => {
                      setSelectedRun(r.id);
                      await loadLines(r.id);
                      setTab("payroll");
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-[#fbfcfd] p-3 text-right"
                  >
                    <div>
                      <p className="font-black text-[#0f2747]">{r.run_no}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.payroll_month}/{r.payroll_year}
                      </p>
                    </div>
                    <div className="text-left">
                      <p dir="ltr" className="font-black text-[#0f2747]">{money(r.total_net)}</p>
                      <p className="mt-1 text-xs text-slate-400">{r.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "compensation" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={saveComp} className="erp-card p-6">
              <Title title="هيكل راتب الموظف" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Select label="الموظف" value={compForm.employee_id} onChange={(v) => {
                  const existing = comp.find((c) => c.employee_id === v);
                  setCompForm(existing ? {
                    employee_id: v,
                    basic_salary: existing.basic_salary,
                    housing_allowance: existing.housing_allowance,
                    transport_allowance: existing.transport_allowance,
                    other_allowances: existing.other_allowances,
                    fixed_deductions: existing.fixed_deductions,
                    overtime_hour_rate: existing.overtime_hour_rate,
                    working_days_divisor: existing.working_days_divisor,
                  } : { ...compEmpty, employee_id: v });
                }}>
                  <option value="">اختر الموظف</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>
                  ))}
                </Select>
                <Input label="الراتب الأساسي" type="number" value={compForm.basic_salary} onChange={(v) => setCompForm((f) => ({ ...f, basic_salary: v }))} />
                <Input label="بدل السكن" type="number" value={compForm.housing_allowance} onChange={(v) => setCompForm((f) => ({ ...f, housing_allowance: v }))} />
                <Input label="بدل النقل" type="number" value={compForm.transport_allowance} onChange={(v) => setCompForm((f) => ({ ...f, transport_allowance: v }))} />
                <Input label="بدلات أخرى" type="number" value={compForm.other_allowances} onChange={(v) => setCompForm((f) => ({ ...f, other_allowances: v }))} />
                <Input label="خصومات ثابتة" type="number" value={compForm.fixed_deductions} onChange={(v) => setCompForm((f) => ({ ...f, fixed_deductions: v }))} />
                <Input label="سعر ساعة الإضافي" type="number" value={compForm.overtime_hour_rate} onChange={(v) => setCompForm((f) => ({ ...f, overtime_hour_rate: v }))} />
                <Input label="مقسوم أيام الراتب" type="number" value={compForm.working_days_divisor} onChange={(v) => setCompForm((f) => ({ ...f, working_days_divisor: v }))} />
              </div>
              <button disabled={busy} className="erp-btn-primary mt-5"><FaPlus /> حفظ الهيكل</button>
            </form>

            <div className="erp-card overflow-x-auto p-6">
              <Title title="هياكل الرواتب الحالية" />
              <table className="mt-5 w-full min-w-[900px] text-right">
                <thead><tr><th className="p-3">الموظف</th><th className="p-3">الأساسي</th><th className="p-3">السكن</th><th className="p-3">النقل</th><th className="p-3">أخرى</th><th className="p-3">خصومات ثابتة</th></tr></thead>
                <tbody>
                  {comp.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="p-3 font-black text-slate-700">{employeeMap[c.employee_id] || c.employee_id}</td>
                      <td dir="ltr" className="p-3 text-right">{money(c.basic_salary)}</td>
                      <td dir="ltr" className="p-3 text-right">{money(c.housing_allowance)}</td>
                      <td dir="ltr" className="p-3 text-right">{money(c.transport_allowance)}</td>
                      <td dir="ltr" className="p-3 text-right">{money(c.other_allowances)}</td>
                      <td dir="ltr" className="p-3 text-right">{money(c.fixed_deductions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "advances" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <form onSubmit={addAdvance} className="erp-card p-6">
              <Title title="سلفة موظف" />
              <div className="mt-5 grid gap-4">
                <Select label="الموظف" value={advanceForm.employee_id} onChange={(v) => setAdvanceForm((f) => ({ ...f, employee_id: v }))}>
                  <option value="">اختر الموظف</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </Select>
                <Input label="مبلغ السلفة" type="number" value={advanceForm.amount} onChange={(v) => setAdvanceForm((f) => ({ ...f, amount: v }))} />
                <Input label="القسط الشهري" type="number" value={advanceForm.installment_amount} onChange={(v) => setAdvanceForm((f) => ({ ...f, installment_amount: v }))} />
                <Input label="شهر البداية" type="date" value={advanceForm.start_month} onChange={(v) => setAdvanceForm((f) => ({ ...f, start_month: v }))} />
                <Input label="ملاحظات" value={advanceForm.notes} onChange={(v) => setAdvanceForm((f) => ({ ...f, notes: v }))} />
              </div>
              <button disabled={busy} className="erp-btn-primary mt-5"><FaPlus /> تسجيل السلفة</button>
            </form>

            <div className="erp-card overflow-x-auto p-6">
              <Title title="السلف" />
              <table className="mt-5 w-full min-w-[850px] text-right">
                <thead><tr><th className="p-3">الرقم</th><th className="p-3">الموظف</th><th className="p-3">المبلغ</th><th className="p-3">القسط</th><th className="p-3">الرصيد</th><th className="p-3">الحالة</th></tr></thead>
                <tbody>
                  {advances.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3 font-black text-[#345a82]">{a.advance_no}</td>
                      <td className="p-3">{employeeMap[a.employee_id] || a.employee_id}</td>
                      <td dir="ltr" className="p-3 text-right">{money(a.amount)}</td>
                      <td dir="ltr" className="p-3 text-right">{money(a.installment_amount)}</td>
                      <td dir="ltr" className="p-3 text-right font-black">{money(a.balance)}</td>
                      <td className="p-3">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "payroll" && (
          <section className="erp-card mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Title title="تفاصيل مسير الرواتب" />
              <Select value={selectedRun} onChange={async (v) => {
                setSelectedRun(v);
                await loadLines(v);
              }}>
                <option value="">اختر المسير</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.run_no} — {r.payroll_month}/{r.payroll_year} — {r.status}
                  </option>
                ))}
              </Select>
            </div>

            {(() => {
              const run = runs.find((r) => r.id === selectedRun);
              if (!run) return <p className="py-8 text-center text-slate-400">اختر مسيرًا.</p>;
              return (
                <>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {run.status === "draft" && (
                      <button type="button" disabled={busy} onClick={() => approveRun(run)} className="erp-btn-primary">
                        <FaCircleCheck /> اعتماد المسير
                      </button>
                    )}
                    {run.status === "approved" && (
                      <button type="button" disabled={busy} onClick={() => markPaid(run)} className="erp-btn-primary">
                        <FaMoneyBillTransfer /> تأكيد الدفع
                      </button>
                    )}
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
                      الحالة: {run.status}
                    </span>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[1250px] text-right">
                      <thead><tr><th className="p-3">الموظف</th><th className="p-3">Gross</th><th className="p-3">غياب</th><th className="p-3">إجازة بدون راتب</th><th className="p-3">خصم الغياب</th><th className="p-3">خصم الإجازة</th><th className="p-3">خصومات أخرى</th><th className="p-3">تعديل</th><th className="p-3">Net</th><th className="p-3">إجراء</th></tr></thead>
                      <tbody>
                        {lines.map((l) => (
                          <tr key={l.id} className="border-t border-slate-100">
                            <td className="p-3 font-black text-slate-700">{employeeMap[l.employee_id] || l.employee_id}</td>
                            <td dir="ltr" className="p-3 text-right">{money(l.gross_salary)}</td>
                            <td className="p-3">{l.absent_days}</td>
                            <td className="p-3">{l.unpaid_leave_days}</td>
                            <td dir="ltr" className="p-3 text-right">{money(l.absence_deduction)}</td>
                            <td dir="ltr" className="p-3 text-right">{money(l.unpaid_leave_deduction)}</td>
                            <td dir="ltr" className="p-3 text-right">{money(l.fixed_deductions)}</td>
                            <td dir="ltr" className="p-3 text-right">{money(l.manual_adjustment)}</td>
                            <td dir="ltr" className="p-3 text-right font-black text-[#0f2747]">{money(l.net_salary)}</td>
                            <td className="p-3">
                              {run.status === "draft" ? (
                                <button type="button" onClick={() => adjustment(l)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">تعديل</button>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value, suffix, icon }) {
  return (
    <article className="erp-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{title}</p>
          <p dir="ltr" className="mt-2 text-right text-2xl font-black text-[#0f2747]">{value}</p>
          {suffix && <p className="mt-1 text-[10px] font-black text-slate-300">{suffix}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{icon}</div>
      </div>
    </article>
  );
}

function Title({ title }) {
  return <h2 className="text-lg font-black text-[#0f2747]">{title}</h2>;
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label>
      {label && <span className="mb-2 block text-sm font-black text-slate-600">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none">
        {children}
      </select>
    </label>
  );
}
