import { useEffect, useMemo, useState } from "react";
import {
  FaArrowTrendUp,
  FaCircleCheck,
  FaGaugeHigh,
  FaHeartPulse,
  FaMoneyBillTrendUp,
  FaPeopleGroup,
  FaPlus,
  FaRotate,
  FaScaleBalanced,
  FaShieldHalved,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (v) =>
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyApproval = {
  approval_type: "commercial",
  entity_type: "",
  entity_id: "",
  title: "",
  description: "",
  amount: "",
  priority: "normal",
};

const emptyRisk = {
  project_id: "",
  category: "project",
  title: "",
  description: "",
  probability: "3",
  impact: "3",
  owner_employee_id: "",
  mitigation_plan: "",
  due_date: "",
};

const emptyKpi = {
  kpi_key: "",
  kpi_name: "",
  period_year: new Date().getFullYear(),
  period_month: "",
  target_value: "",
  unit: "number",
  owner_role: "",
};

export default function AdminExecutiveControl() {
  const [snapshot, setSnapshot] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [risks, setRisks] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [healthRuns, setHealthRuns] = useState([]);
  const [approvalForm, setApprovalForm] = useState(emptyApproval);
  const [riskForm, setRiskForm] = useState(emptyRisk);
  const [kpiForm, setKpiForm] = useState(emptyKpi);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [snap, ap, r, k, p, e, h] = await Promise.all([
      supabase.rpc("ict_erp_executive_snapshot"),
      supabase
        .from("ict_erp_approval_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(200),
      supabase
        .from("ict_erp_risks")
        .select("*")
        .order("risk_score", { ascending: false })
        .limit(200),
      supabase
        .from("ict_erp_kpi_targets")
        .select("*")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false }),
      supabase
        .from("ict_delivery_projects")
        .select("id,project_no,project_name")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_hr_employees")
        .select("id,employee_code,full_name,status")
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("ict_erp_health_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const error =
      snap.error || ap.error || r.error || k.error || p.error || e.error || h.error;

    if (error) {
      setMessage(error.message);
    } else {
      setSnapshot(snap.data || null);
      setApprovals(ap.data || []);
      setRisks(r.data || []);
      setKpis(k.data || []);
      setProjects(p.data || []);
      setEmployees(e.data || []);
      setHealthRuns(h.data || []);
    }

    setLoading(false);
  }

  async function addApproval(event) {
    event.preventDefault();
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("ict_erp_approval_requests").insert({
      approval_type: approvalForm.approval_type,
      entity_type: approvalForm.entity_type.trim() || null,
      entity_id: approvalForm.entity_id || null,
      title: approvalForm.title.trim(),
      description: approvalForm.description.trim() || null,
      amount: approvalForm.amount ? Number(approvalForm.amount) : null,
      priority: approvalForm.priority,
      requested_by: user?.id || null,
    });

    if (error) setMessage(error.message);
    else {
      setMessage("تم إنشاء طلب الاعتماد.");
      setApprovalForm(emptyApproval);
      await load();
    }
    setBusy(false);
  }

  async function decide(row, decision) {
    const note = window.prompt(
      decision === "approved" ? "ملاحظة الاعتماد (اختياري)" : "سبب الرفض"
    );

    setBusy(true);
    const { error } = await supabase.rpc("ict_erp_decide_approval", {
      p_approval_id: row.id,
      p_decision: decision,
      p_note: note || null,
    });

    if (error) setMessage(error.message);
    else {
      setMessage(decision === "approved" ? "تم الاعتماد." : "تم الرفض.");
      await load();
    }
    setBusy(false);
  }

  async function addRisk(event) {
    event.preventDefault();
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("ict_erp_risks").insert({
      project_id: riskForm.project_id || null,
      category: riskForm.category,
      title: riskForm.title.trim(),
      description: riskForm.description.trim() || null,
      probability: Number(riskForm.probability || 1),
      impact: Number(riskForm.impact || 1),
      owner_employee_id: riskForm.owner_employee_id || null,
      mitigation_plan: riskForm.mitigation_plan.trim() || null,
      due_date: riskForm.due_date || null,
      status: "open",
      created_by: user?.id || null,
    });

    if (error) setMessage(error.message);
    else {
      setMessage("تم تسجيل الخطر.");
      setRiskForm(emptyRisk);
      await load();
    }
    setBusy(false);
  }

  async function closeRisk(row) {
    setBusy(true);
    const { error } = await supabase
      .from("ict_erp_risks")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) setMessage(error.message);
    else {
      setMessage("تم إغلاق الخطر.");
      await load();
    }
    setBusy(false);
  }

  async function addKpi(event) {
    event.preventDefault();
    setBusy(true);

    const { error } = await supabase.from("ict_erp_kpi_targets").upsert(
      {
        kpi_key: kpiForm.kpi_key.trim(),
        kpi_name: kpiForm.kpi_name.trim(),
        period_year: Number(kpiForm.period_year),
        period_month: kpiForm.period_month
          ? Number(kpiForm.period_month)
          : null,
        target_value: Number(kpiForm.target_value || 0),
        unit: kpiForm.unit || "number",
        owner_role: kpiForm.owner_role.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kpi_key,period_year,period_month" }
    );

    if (error) setMessage(error.message);
    else {
      setMessage("تم حفظ KPI Target.");
      setKpiForm(emptyKpi);
      await load();
    }
    setBusy(false);
  }

  async function runHealth() {
    setBusy(true);
    const { data, error } = await supabase.rpc("ict_erp_run_health");
    if (error) setMessage(error.message);
    else {
      setMessage(
        data?.status === "pass"
          ? "ERP Health: PASS ✅"
          : "ERP Health: توجد مشكلة تحتاج مراجعة."
      );
      await load();
    }
    setBusy(false);
  }

  const projectMap = useMemo(
    () =>
      Object.fromEntries(
        projects.map((p) => [
          p.id,
          `${p.project_no || ""} — ${p.project_name || ""}`.trim(),
        ])
      ),
    [projects]
  );

  const employeeMap = useMemo(
    () =>
      Object.fromEntries(
        employees.map((e) => [
          e.id,
          `${e.employee_code || ""} — ${e.full_name}`.trim(),
        ])
      ),
    [employees]
  );

  const riskStats = useMemo(
    () => ({
      open: risks.filter((r) => ["open", "mitigating"].includes(r.status)).length,
      critical: risks.filter(
        (r) =>
          ["open", "mitigating"].includes(r.status) &&
          Number(r.risk_score || 0) >= 15
      ).length,
    }),
    [risks]
  );

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">EXECUTIVE ERP CONTROL</span>
            <h1 className="erp-page-title">مركز القيادة والحوكمة</h1>
            <p className="erp-page-subtitle">
              مؤشرات الإدارة العليا، الاعتمادات، المخاطر، KPI Targets، وصحة النظام.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={runHealth}
              disabled={busy}
              className="erp-btn-primary"
            >
              <FaHeartPulse />
              فحص ERP
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="erp-btn-secondary"
            >
              <FaRotate />
              تحديث
            </button>
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <Metric title="العملاء" value={snapshot?.customers} icon={<FaPeopleGroup />} />
          <Metric title="المشاريع النشطة" value={snapshot?.active_projects} icon={<FaGaugeHigh />} />
          <Metric title="قيمة العقود" value={snapshot?.contract_value} moneyValue icon={<FaMoneyBillTrendUp />} />
          <Metric title="المحصل" value={snapshot?.collected} moneyValue icon={<FaArrowTrendUp />} />
          <Metric title="الذمم المدينة" value={snapshot?.receivables} moneyValue icon={<FaScaleBalanced />} />
          <Metric title="طلبات اعتماد" value={snapshot?.pending_approvals} icon={<FaCircleCheck />} />
          <Metric title="مخاطر مفتوحة" value={riskStats.open} icon={<FaShieldHalved />} />
          <Metric title="مخاطر حرجة" value={riskStats.critical} icon={<FaTriangleExclamation />} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["overview", "Executive Overview"],
            ["approvals", "الاعتمادات"],
            ["risks", "المخاطر"],
            ["kpis", "KPI Targets"],
            ["health", "ERP Health"],
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
              <Title title="المؤشرات المالية" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Small title="إجمالي الفوترة" value={snapshot?.invoiced} />
                <Small title="المصروفات التشغيلية" value={snapshot?.expenses} />
                <Small title="PO Commitments" value={snapshot?.po_commitment} />
                <Small title="Payroll" value={snapshot?.payroll} />
                <Small title="قيمة المخزون" value={snapshot?.stock_value} />
                <Small title="قيمة الأصول" value={snapshot?.asset_value} />
                <Small title="Collection Ratio" value={snapshot?.collection_ratio} percent />
                <Small title="Cash After Outflow" value={snapshot?.cash_after_operational_outflow} />
              </div>
            </section>

            <section className="erp-card p-6">
              <Title title="تنبيهات الإدارة" />
              <div className="mt-5 space-y-3">
                <Alert
                  title="طلبات شراء تنتظر الموافقة"
                  value={snapshot?.pending_purchase_requests || 0}
                  danger={Number(snapshot?.pending_purchase_requests || 0) > 0}
                />
                <Alert
                  title="طلبات اعتماد تنفيذية"
                  value={snapshot?.pending_approvals || 0}
                  danger={Number(snapshot?.pending_approvals || 0) > 0}
                />
                <Alert
                  title="مخاطر حرجة"
                  value={snapshot?.critical_risks || 0}
                  danger={Number(snapshot?.critical_risks || 0) > 0}
                />
                <Alert
                  title="إجمالي الموظفين النشطين"
                  value={snapshot?.employees || 0}
                />
              </div>
            </section>
          </div>
        )}

        {tab === "approvals" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <form onSubmit={addApproval} className="erp-card p-6">
              <Title title="طلب اعتماد جديد" />
              <div className="mt-5 grid gap-4">
                <Select
                  label="نوع الاعتماد"
                  value={approvalForm.approval_type}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, approval_type: v }))
                  }
                >
                  <option value="commercial">تجاري</option>
                  <option value="procurement">مشتريات</option>
                  <option value="finance">مالي</option>
                  <option value="hr">موارد بشرية</option>
                  <option value="project">مشروع</option>
                  <option value="other">أخرى</option>
                </Select>

                <Input
                  label="العنوان"
                  value={approvalForm.title}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, title: v }))
                  }
                />

                <Input
                  label="القيمة"
                  type="number"
                  value={approvalForm.amount}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, amount: v }))
                  }
                />

                <Select
                  label="الأولوية"
                  value={approvalForm.priority}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </Select>

                <Input
                  label="Entity Type"
                  value={approvalForm.entity_type}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, entity_type: v }))
                  }
                />

                <Input
                  label="الوصف"
                  value={approvalForm.description}
                  onChange={(v) =>
                    setApprovalForm((f) => ({ ...f, description: v }))
                  }
                />
              </div>

              <button disabled={busy} className="erp-btn-primary mt-5">
                <FaPlus />
                إرسال للاعتماد
              </button>
            </form>

            <section className="erp-card overflow-x-auto p-6">
              <Title title="مركز الاعتمادات" />
              <table className="mt-5 w-full min-w-[950px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">الرقم</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">العنوان</th>
                    <th className="p-3">القيمة</th>
                    <th className="p-3">الأولوية</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3 font-black text-[#345a82]">
                        {a.approval_no}
                      </td>
                      <td className="p-3">{a.approval_type}</td>
                      <td className="p-3 font-bold">{a.title}</td>
                      <td dir="ltr" className="p-3 text-right">
                        {a.amount == null ? "—" : money(a.amount)}
                      </td>
                      <td className="p-3">{a.priority}</td>
                      <td className="p-3">{a.status}</td>
                      <td className="p-3">
                        {a.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => decide(a, "approved")}
                              className="rounded-lg bg-green-50 p-2 text-green-700"
                              title="اعتماد"
                            >
                              <FaCircleCheck />
                            </button>
                            <button
                              type="button"
                              onClick={() => decide(a, "rejected")}
                              className="rounded-lg bg-red-50 p-2 text-red-600"
                              title="رفض"
                            >
                              <FaXmark />
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {tab === "risks" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <form onSubmit={addRisk} className="erp-card p-6">
              <Title title="تسجيل خطر" />
              <div className="mt-5 grid gap-4">
                <Input
                  label="العنوان"
                  value={riskForm.title}
                  onChange={(v) => setRiskForm((f) => ({ ...f, title: v }))}
                />

                <Select
                  label="المشروع"
                  value={riskForm.project_id}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, project_id: v }))
                  }
                >
                  <option value="">عام / بدون مشروع</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {projectMap[p.id]}
                    </option>
                  ))}
                </Select>

                <Input
                  label="التصنيف"
                  value={riskForm.category}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, category: v }))
                  }
                />

                <Select
                  label="الاحتمالية 1-5"
                  value={riskForm.probability}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, probability: v }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>

                <Select
                  label="الأثر 1-5"
                  value={riskForm.impact}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, impact: v }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>

                <Select
                  label="مالك الخطر"
                  value={riskForm.owner_employee_id}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, owner_employee_id: v }))
                  }
                >
                  <option value="">غير محدد</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {employeeMap[e.id]}
                    </option>
                  ))}
                </Select>

                <Input
                  label="تاريخ الاستحقاق"
                  type="date"
                  value={riskForm.due_date}
                  onChange={(v) => setRiskForm((f) => ({ ...f, due_date: v }))}
                />

                <Input
                  label="خطة المعالجة"
                  value={riskForm.mitigation_plan}
                  onChange={(v) =>
                    setRiskForm((f) => ({ ...f, mitigation_plan: v }))
                  }
                />
              </div>

              <button disabled={busy} className="erp-btn-primary mt-5">
                تسجيل الخطر
              </button>
            </form>

            <section className="erp-card overflow-x-auto p-6">
              <Title title="Risk Register" />
              <table className="mt-5 w-full min-w-[1000px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">الرقم</th>
                    <th className="p-3">الخطر</th>
                    <th className="p-3">المشروع</th>
                    <th className="p-3">P</th>
                    <th className="p-3">I</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">المالك</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="p-3 font-black text-[#345a82]">{r.risk_no}</td>
                      <td className="p-3 font-bold">{r.title}</td>
                      <td className="p-3">{projectMap[r.project_id] || "عام"}</td>
                      <td className="p-3">{r.probability}</td>
                      <td className="p-3">{r.impact}</td>
                      <td className="p-3">
                        <RiskScore value={r.risk_score} />
                      </td>
                      <td className="p-3">
                        {employeeMap[r.owner_employee_id] || "—"}
                      </td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3">
                        {r.status !== "closed" ? (
                          <button
                            type="button"
                            onClick={() => closeRisk(r)}
                            className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700"
                          >
                            إغلاق
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {tab === "kpis" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <form onSubmit={addKpi} className="erp-card p-6">
              <Title title="KPI Target" />
              <div className="mt-5 grid gap-4">
                <Input
                  label="KPI Key"
                  value={kpiForm.kpi_key}
                  onChange={(v) => setKpiForm((f) => ({ ...f, kpi_key: v }))}
                />
                <Input
                  label="اسم المؤشر"
                  value={kpiForm.kpi_name}
                  onChange={(v) => setKpiForm((f) => ({ ...f, kpi_name: v }))}
                />
                <Input
                  label="السنة"
                  type="number"
                  value={kpiForm.period_year}
                  onChange={(v) =>
                    setKpiForm((f) => ({ ...f, period_year: v }))
                  }
                />
                <Input
                  label="الشهر (اختياري)"
                  type="number"
                  value={kpiForm.period_month}
                  onChange={(v) =>
                    setKpiForm((f) => ({ ...f, period_month: v }))
                  }
                />
                <Input
                  label="Target"
                  type="number"
                  value={kpiForm.target_value}
                  onChange={(v) =>
                    setKpiForm((f) => ({ ...f, target_value: v }))
                  }
                />
                <Input
                  label="الوحدة"
                  value={kpiForm.unit}
                  onChange={(v) => setKpiForm((f) => ({ ...f, unit: v }))}
                />
                <Input
                  label="Owner Role"
                  value={kpiForm.owner_role}
                  onChange={(v) =>
                    setKpiForm((f) => ({ ...f, owner_role: v }))
                  }
                />
              </div>

              <button disabled={busy} className="erp-btn-primary mt-5">
                حفظ KPI
              </button>
            </form>

            <section className="erp-card overflow-x-auto p-6">
              <Title title="KPI Targets" />
              <table className="mt-5 w-full min-w-[800px] text-right">
                <thead>
                  <tr>
                    <th className="p-3">KPI</th>
                    <th className="p-3">الفترة</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">الوحدة</th>
                    <th className="p-3">المالك</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k) => (
                    <tr key={k.id} className="border-t border-slate-100">
                      <td className="p-3">
                        <p className="font-black text-[#0f2747]">{k.kpi_name}</p>
                        <p className="mt-1 text-xs text-slate-400">{k.kpi_key}</p>
                      </td>
                      <td className="p-3">
                        {k.period_month ? `${k.period_month}/` : ""}
                        {k.period_year}
                      </td>
                      <td dir="ltr" className="p-3 text-right font-black">
                        {money(k.target_value)}
                      </td>
                      <td className="p-3">{k.unit}</td>
                      <td className="p-3">{k.owner_role || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {tab === "health" && (
          <section className="erp-card mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Title title="ERP Health History" />
              <button
                type="button"
                onClick={runHealth}
                disabled={busy}
                className="erp-btn-primary"
              >
                <FaHeartPulse />
                تشغيل Health
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {healthRuns.length === 0 ? (
                <p className="py-8 text-center text-slate-400">
                  لم يتم تشغيل Health من الواجهة بعد.
                </p>
              ) : (
                healthRuns.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#fbfcfd] p-4"
                  >
                    <div>
                      <p className="font-black text-[#0f2747]">
                        {h.summary || "ERP Health"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(h.created_at).toLocaleString("ar-SA")}
                      </p>
                    </div>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        h.status === "pass"
                          ? "bg-green-50 text-green-700"
                          : h.status === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-600",
                      ].join(" ")}
                    >
                      {h.status.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value, icon, moneyValue = false }) {
  return (
    <article className="erp-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{title}</p>
          <p
            dir="ltr"
            className="mt-2 text-right text-xl font-black text-[#0f2747]"
          >
            {moneyValue ? money(value) : Number(value || 0).toLocaleString("en-US")}
          </p>
          {moneyValue && (
            <p className="mt-1 text-[10px] font-black text-slate-300">SAR</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function Small({ title, value, percent = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-[#fbfcfd] p-4">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p dir="ltr" className="mt-2 text-right text-lg font-black text-[#0f2747]">
        {percent ? `${Number(value || 0).toFixed(2)}%` : money(value)}
      </p>
      {!percent && <p className="mt-1 text-[10px] text-slate-300">SAR</p>}
    </div>
  );
}

function Alert({ title, value, danger = false }) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-xl border p-4",
        danger
          ? "border-red-100 bg-red-50/50"
          : "border-slate-100 bg-[#fbfcfd]",
      ].join(" ")}
    >
      <span className="font-bold text-slate-700">{title}</span>
      <span
        className={[
          "text-xl font-black",
          danger ? "text-red-600" : "text-[#0f2747]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function RiskScore({ value }) {
  const n = Number(value || 0);
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-black",
        n >= 15
          ? "bg-red-50 text-red-600"
          : n >= 8
          ? "bg-amber-50 text-amber-700"
          : "bg-green-50 text-green-700",
      ].join(" ")}
    >
      {n}
    </span>
  );
}

function Title({ title }) {
  return <h2 className="text-lg font-black text-[#0f2747]">{title}</h2>;
}

function Input({ label, value, onChange, type = "text" }) {
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

function Select({ label, value, onChange, children }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"
      >
        {children}
      </select>
    </label>
  );
}
