import { useEffect, useMemo, useState } from "react";
import {
  FaCircleDollarToSlot,
  FaPlus,
  FaRotate,
} from "react-icons/fa6";
import { useSearchParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const stages = [
  ["new", "جديدة"],
  ["qualified", "مؤهلة"],
  ["proposal", "عرض مقدم"],
  ["negotiation", "تفاوض"],
  ["won", "فوز"],
  ["lost", "خسارة"],
];

const stageProbabilities = {
  new: 10,
  qualified: 30,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

function makeOpportunityNo() {
  return `OPP-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-7)}`;
}

export default function AdminPipeline() {
  const [searchParams] = useSearchParams();

  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [team, setTeam] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    customer_id: searchParams.get("customer") || "",
    rfq_id: "",
    title: "",
    description: "",
    stage: "new",
    probability: 10,
    estimated_value: 0,
    expected_close_date: "",
    assigned_to: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [
      oppResult,
      customerResult,
      teamResult,
      rfqResult,
    ] = await Promise.all([
      supabase
        .from("ict_sales_opportunities")
        .select(
          `
            *,
            customer:ict_customers(id,name,company_name),
            owner:ict_team_members(id,full_name,job_title)
          `
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_customers")
        .select("id,name,company_name")
        .order("name"),
      supabase
        .from("ict_team_members")
        .select("id,full_name,job_title")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("ict_rfq_requests")
        .select("id,request_no,full_name,company,project_type")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const error =
      oppResult.error ||
      customerResult.error ||
      teamResult.error ||
      rfqResult.error;

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setOpportunities(oppResult.data || []);
      setCustomers(customerResult.data || []);
      setTeam(teamResult.data || []);
      setRfqs(rfqResult.data || []);
    }

    setLoading(false);
  }

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createOpportunity(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      if (!form.title.trim()) {
        throw new Error("اسم الفرصة مطلوب.");
      }

      const { data: authData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("ict_sales_opportunities")
        .insert({
          opportunity_no: makeOpportunityNo(),
          customer_id: form.customer_id || null,
          rfq_id: form.rfq_id || null,
          title: form.title.trim(),
          description: form.description.trim() || null,
          stage: form.stage,
          probability: Number(form.probability || 0),
          estimated_value: Number(form.estimated_value || 0),
          expected_close_date:
            form.expected_close_date || null,
          assigned_to: form.assigned_to || null,
          notes: form.notes.trim() || null,
          created_by: authData.user?.id || null,
        });

      if (error) throw error;

      setForm({
        customer_id: "",
        rfq_id: "",
        title: "",
        description: "",
        stage: "new",
        probability: 10,
        estimated_value: 0,
        expected_close_date: "",
        assigned_to: "",
        notes: "",
      });

      setMessage({
        type: "success",
        text: "تمت إضافة الفرصة البيعية.",
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "تعذر إنشاء الفرصة.",
      });
    }
  }

  async function moveOpportunity(opportunity, stage) {
    const probability = stageProbabilities[stage] ?? opportunity.probability;

    const { error } = await supabase
      .from("ict_sales_opportunities")
      .update({
        stage,
        probability,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setOpportunities((current) =>
      current.map((item) =>
        item.id === opportunity.id
          ? { ...item, stage, probability }
          : item
      )
    );
  }

  const pipelineValue = useMemo(
    () =>
      opportunities
        .filter((opp) => !["lost"].includes(opp.stage))
        .reduce(
          (sum, opp) => sum + Number(opp.estimated_value || 0),
          0
        ),
    [opportunities]
  );

  const weightedValue = useMemo(
    () =>
      opportunities.reduce(
        (sum, opp) =>
          sum +
          Number(opp.estimated_value || 0) *
            (Number(opp.probability || 0) / 100),
        0
      ),
    [opportunities]
  );

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              Sales Pipeline
            </h1>
            <p className="mt-3 text-slate-600">
              متابعة الفرص البيعية من Lead حتى الفوز أو الخسارة.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Metric
            label="قيمة Pipeline"
            value={`${formatMoney(pipelineValue)} SAR`}
          />
          <Metric
            label="القيمة المرجحة"
            value={`${formatMoney(weightedValue)} SAR`}
          />
        </div>

        <form
          onSubmit={createOpportunity}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            إضافة فرصة بيعية
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="العميل"
              value={form.customer_id}
              onChange={(v) => setField("customer_id", v)}
              options={[
                ["", "بدون عميل محدد"],
                ...customers.map((c) => [
                  c.id,
                  c.company_name || c.name,
                ]),
              ]}
            />

            <Select
              label="ربط RFQ"
              value={form.rfq_id}
              onChange={(v) => setField("rfq_id", v)}
              options={[
                ["", "بدون RFQ"],
                ...rfqs.map((r) => [
                  r.id,
                  `${r.request_no} — ${r.company || r.full_name}`,
                ]),
              ]}
            />

            <Input
              label="اسم الفرصة"
              value={form.title}
              onChange={(v) => setField("title", v)}
            />

            <Input
              label="القيمة المتوقعة"
              type="number"
              value={form.estimated_value}
              onChange={(v) => setField("estimated_value", v)}
            />

            <Select
              label="المرحلة"
              value={form.stage}
              onChange={(v) => {
                setField("stage", v);
                setField(
                  "probability",
                  stageProbabilities[v] ?? 10
                );
              }}
              options={stages}
            />

            <Input
              label="نسبة النجاح %"
              type="number"
              value={form.probability}
              onChange={(v) => setField("probability", v)}
            />

            <Input
              label="الإغلاق المتوقع"
              type="date"
              value={form.expected_close_date}
              onChange={(v) => setField("expected_close_date", v)}
            />

            <Select
              label="المسؤول"
              value={form.assigned_to}
              onChange={(v) => setField("assigned_to", v)}
              options={[
                ["", "غير معين"],
                ...team.map((member) => [
                  member.id,
                  member.full_name,
                ]),
              ]}
            />

            <label className="md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                الوصف
              </span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                className="form-input resize-none"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                ملاحظات
              </span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setField("notes", event.target.value)
                }
                className="form-input resize-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"
          >
            <FaPlus />
            إضافة الفرصة
          </button>
        </form>

        <Notice message={message} />

        <div className="mt-10 overflow-x-auto pb-4">
          <div className="grid min-w-[1450px] grid-cols-6 gap-4">
            {stages.map(([stageValue, stageLabel]) => {
              const rows = opportunities.filter(
                (opp) => opp.stage === stageValue
              );

              const value = rows.reduce(
                (sum, opp) =>
                  sum + Number(opp.estimated_value || 0),
                0
              );

              return (
                <section
                  key={stageValue}
                  className="rounded-3xl bg-slate-100 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black text-[#071d49]">
                        {stageLabel}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {rows.length} فرصة
                      </p>
                    </div>

                    <span
                      dir="ltr"
                      className="text-xs font-black text-blue-700"
                    >
                      {formatMoney(value)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    {rows.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        onMove={moveOpportunity}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity, onMove }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <FaCircleDollarToSlot className="mt-1 shrink-0 text-xl text-blue-700" />
        <div>
          <h3 className="font-black text-[#071d49]">
            {opportunity.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {opportunity.customer?.company_name ||
              opportunity.customer?.name ||
              "بدون عميل"}
          </p>
        </div>
      </div>

      <p
        dir="ltr"
        className="mt-4 text-right text-xl font-black text-[#071d49]"
      >
        {formatMoney(opportunity.estimated_value)} SAR
      </p>

      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{opportunity.probability}%</span>
        <span>
          {opportunity.owner?.full_name || "غير معين"}
        </span>
      </div>

      <select
        value={opportunity.stage}
        onChange={(event) =>
          onMove(opportunity, event.target.value)
        }
        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold"
      >
        {stages.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-bold text-slate-500">{label}</p>
      <p
        dir="ltr"
        className="mt-2 text-right text-3xl font-black text-[#071d49]"
      >
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Notice({ message }) {
  if (!message.text) return null;

  return (
    <div
      className={[
        "mt-6 rounded-2xl border p-5",
        message.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700",
      ].join(" ")}
    >
      {message.text}
    </div>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
