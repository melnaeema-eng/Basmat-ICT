import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCheck,
  FaPlus,
  FaRotate,
  FaTrash,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const typeLabels = {
  call: "اتصال",
  email: "بريد",
  meeting: "اجتماع",
  visit: "زيارة",
  task: "مهمة",
};

export default function AdminFollowUps() {
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [team, setTeam] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    customer_id: "",
    opportunity_id: "",
    assigned_to: "",
    followup_type: "call",
    subject: "",
    notes: "",
    due_at: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      followupResult,
      customerResult,
      opportunityResult,
      teamResult,
    ] = await Promise.all([
      supabase
        .from("ict_sales_followups")
        .select(
          `
            *,
            customer:ict_customers(id,name,company_name),
            opportunity:ict_sales_opportunities(id,title,opportunity_no),
            owner:ict_team_members(id,full_name)
          `
        )
        .order("due_at", { ascending: true }),
      supabase
        .from("ict_customers")
        .select("id,name,company_name")
        .order("name"),
      supabase
        .from("ict_sales_opportunities")
        .select("id,title,opportunity_no")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_team_members")
        .select("id,full_name")
        .eq("is_active", true)
        .order("full_name"),
    ]);

    const error =
      followupResult.error ||
      customerResult.error ||
      opportunityResult.error ||
      teamResult.error;

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setFollowups(followupResult.data || []);
    setCustomers(customerResult.data || []);
    setOpportunities(opportunityResult.data || []);
    setTeam(teamResult.data || []);
  }

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function addFollowup(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      if (!form.subject.trim()) {
        throw new Error("موضوع المتابعة مطلوب.");
      }

      if (!form.due_at) {
        throw new Error("موعد المتابعة مطلوب.");
      }

      const { data: authData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("ict_sales_followups")
        .insert({
          customer_id: form.customer_id || null,
          opportunity_id: form.opportunity_id || null,
          assigned_to: form.assigned_to || null,
          followup_type: form.followup_type,
          subject: form.subject.trim(),
          notes: form.notes.trim() || null,
          due_at: new Date(form.due_at).toISOString(),
          created_by: authData.user?.id || null,
        });

      if (error) throw error;

      setForm({
        customer_id: "",
        opportunity_id: "",
        assigned_to: "",
        followup_type: "call",
        subject: "",
        notes: "",
        due_at: "",
      });

      setMessage({
        type: "success",
        text: "تمت إضافة المتابعة.",
      });

      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "تعذر إضافة المتابعة.",
      });
    }
  }

  async function completeFollowup(id) {
    const { error } = await supabase
      .from("ict_sales_followups")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      await loadData();
    }
  }

  async function deleteFollowup(id) {
    if (!window.confirm("هل تريد حذف هذه المتابعة؟")) {
      return;
    }

    const { error } = await supabase
      .from("ict_sales_followups")
      .delete()
      .eq("id", id);

    if (!error) {
      await loadData();
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return followups;

    if (filter === "overdue") {
      return followups.filter(
        (row) =>
          row.status === "pending" &&
          new Date(row.due_at) < new Date()
      );
    }

    return followups.filter((row) => row.status === filter);
  }, [followups, filter]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
            <FaCalendarCheck />
          </div>

          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              المتابعات والمواعيد
            </h1>
            <p className="mt-3 text-slate-600">
              اتصالات واجتماعات وزيارات ومهام فريق المبيعات.
            </p>
          </div>
        </div>

        <form
          onSubmit={addFollowup}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            إضافة متابعة
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="العميل"
              value={form.customer_id}
              onChange={(v) => setField("customer_id", v)}
              options={[
                ["", "بدون عميل"],
                ...customers.map((c) => [
                  c.id,
                  c.company_name || c.name,
                ]),
              ]}
            />

            <Select
              label="الفرصة"
              value={form.opportunity_id}
              onChange={(v) => setField("opportunity_id", v)}
              options={[
                ["", "بدون فرصة"],
                ...opportunities.map((opp) => [
                  opp.id,
                  `${opp.opportunity_no} — ${opp.title}`,
                ]),
              ]}
            />

            <Select
              label="نوع المتابعة"
              value={form.followup_type}
              onChange={(v) => setField("followup_type", v)}
              options={Object.entries(typeLabels)}
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

            <Input
              label="الموضوع"
              value={form.subject}
              onChange={(v) => setField("subject", v)}
            />

            <Input
              label="التاريخ والوقت"
              type="datetime-local"
              value={form.due_at}
              onChange={(v) => setField("due_at", v)}
            />

            <label className="md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                الملاحظات
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
            إضافة المتابعة
          </button>
        </form>

        <Notice message={message} />

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            ["pending", "القادمة"],
            ["overdue", "المتأخرة"],
            ["completed", "المكتملة"],
            ["all", "الكل"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                "rounded-xl px-5 py-3 font-bold",
                filter === value
                  ? "bg-[#123878] text-white"
                  : "bg-white text-slate-700 shadow-sm",
              ].join(" ")}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={loadData}
            className="mr-auto inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-700 shadow-sm"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {filtered.map((row) => {
            const overdue =
              row.status === "pending" &&
              new Date(row.due_at) < new Date();

            return (
              <article
                key={row.id}
                className={[
                  "rounded-3xl border bg-white p-6 shadow-sm",
                  overdue
                    ? "border-red-200"
                    : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
                        {typeLabels[row.followup_type] ||
                          row.followup_type}
                      </span>

                      {overdue && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">
                          متأخرة
                        </span>
                      )}

                      <h2 className="text-xl font-black text-[#071d49]">
                        {row.subject}
                      </h2>
                    </div>

                    <p className="mt-3 text-slate-600">
                      {row.customer?.company_name ||
                        row.customer?.name ||
                        "بدون عميل"}
                    </p>

                    {row.opportunity && (
                      <p className="mt-1 text-sm text-blue-700">
                        {row.opportunity.opportunity_no} —{" "}
                        {row.opportunity.title}
                      </p>
                    )}

                    <p className="mt-2 text-sm font-bold text-slate-500">
                      {formatDate(row.due_at)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      المسؤول: {row.owner?.full_name || "غير معين"}
                    </p>

                    {row.notes && (
                      <p className="mt-4 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">
                        {row.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {row.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => completeFollowup(row.id)}
                        className="rounded-xl bg-green-100 p-3 text-green-700"
                        title="إكمال"
                      >
                        <FaCheck />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteFollowup(row.id)}
                      className="rounded-xl bg-red-100 p-3 text-red-700"
                      title="حذف"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              لا توجد متابعات في هذا التصنيف.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
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

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
