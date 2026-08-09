import { useEffect, useState } from "react";
import {
  FaPlus,
  FaRotate,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const emptyForm = {
  project_name: "",
  customer_id: "",
  opportunity_id: "",
  quotation_id: "",
  project_manager_id: "",
  contract_value: "",
  start_date: "",
  target_end_date: "",
  scope: "",
};

function createProjectNo() {
  return `PRJ-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-7)}`;
}

export default function AdminProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      projectResult,
      customerResult,
      opportunityResult,
      quotationResult,
      teamResult,
    ] = await Promise.all([
      supabase
        .from("ict_delivery_projects")
        .select(
          `
            *,
            customer:ict_customers(id,name,company_name),
            manager:ict_team_members(id,full_name)
          `
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_customers")
        .select("id,name,company_name")
        .order("name"),
      supabase
        .from("ict_sales_opportunities")
        .select("id,title,opportunity_no,stage")
        .eq("stage", "won")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_quotations")
        .select("id,quotation_no,customer_name,company_name,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_team_members")
        .select("id,full_name")
        .eq("is_active", true)
        .order("full_name"),
    ]);

    const error =
      projectResult.error ||
      customerResult.error ||
      opportunityResult.error ||
      quotationResult.error ||
      teamResult.error;

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setProjects(projectResult.data || []);
    setCustomers(customerResult.data || []);
    setOpportunities(opportunityResult.data || []);
    setQuotations(quotationResult.data || []);
    setTeam(teamResult.data || []);
  }

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createProject(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (!form.project_name.trim()) {
        throw new Error("اسم المشروع مطلوب.");
      }

      const { data: authData } =
        await supabase.auth.getUser();

      const { error } = await supabase
        .from("ict_delivery_projects")
        .insert({
          project_no: createProjectNo(),
          project_name: form.project_name.trim(),
          customer_id: form.customer_id || null,
          opportunity_id:
            form.opportunity_id || null,
          quotation_id:
            form.quotation_id || null,
          project_manager_id:
            form.project_manager_id || null,
          contract_value:
            Number(form.contract_value || 0),
          start_date:
            form.start_date || null,
          target_end_date:
            form.target_end_date || null,
          scope: form.scope.trim() || null,
          created_by:
            authData.user?.id || null,
        });

      if (error) throw error;

      setForm(emptyForm);
      setMessage({
        type: "success",
        text: "تم إنشاء المشروع بنجاح.",
      });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر إنشاء المشروع.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateProject(projectId, patch) {
    const { error } = await supabase
      .from("ict_delivery_projects")
      .update({
        ...patch,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", projectId);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    await loadData();
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              إدارة المشاريع التشغيلية
            </h1>
            <p className="mt-3 text-slate-600">
              المشاريع الفعلية بعد الفوز بالفرصة، منفصلة عن مشاريع الموقع التسويقية.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <form
          onSubmit={createProject}
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-black text-[#071d49]">
            مشروع تشغيلي جديد
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="اسم المشروع"
              value={form.project_name}
              onChange={(v) =>
                setField("project_name", v)
              }
            />

            <Select
              label="العميل"
              value={form.customer_id}
              onChange={(v) =>
                setField("customer_id", v)
              }
              options={[
                ["", "بدون عميل"],
                ...customers.map((c) => [
                  c.id,
                  c.company_name || c.name,
                ]),
              ]}
            />

            <Select
              label="الفرصة الرابحة"
              value={form.opportunity_id}
              onChange={(v) =>
                setField("opportunity_id", v)
              }
              options={[
                ["", "بدون فرصة"],
                ...opportunities.map((o) => [
                  o.id,
                  `${o.opportunity_no} — ${o.title}`,
                ]),
              ]}
            />

            <Select
              label="عرض السعر"
              value={form.quotation_id}
              onChange={(v) =>
                setField("quotation_id", v)
              }
              options={[
                ["", "بدون عرض سعر"],
                ...quotations.map((q) => [
                  q.id,
                  `${q.quotation_no} — ${
                    q.company_name ||
                    q.customer_name
                  }`,
                ]),
              ]}
            />

            <Select
              label="مدير المشروع"
              value={form.project_manager_id}
              onChange={(v) =>
                setField(
                  "project_manager_id",
                  v
                )
              }
              options={[
                ["", "غير معين"],
                ...team.map((m) => [
                  m.id,
                  m.full_name,
                ]),
              ]}
            />

            <Input
              label="قيمة المشروع"
              type="number"
              value={form.contract_value}
              onChange={(v) =>
                setField("contract_value", v)
              }
            />

            <Input
              label="تاريخ البداية"
              type="date"
              value={form.start_date}
              onChange={(v) =>
                setField("start_date", v)
              }
            />

            <Input
              label="النهاية المستهدفة"
              type="date"
              value={form.target_end_date}
              onChange={(v) =>
                setField(
                  "target_end_date",
                  v
                )
              }
            />

            <label className="md:col-span-2 xl:col-span-4">
              <span className="mb-2 block font-bold text-slate-700">
                نطاق العمل
              </span>

              <textarea
                rows={4}
                value={form.scope}
                onChange={(event) =>
                  setField(
                    "scope",
                    event.target.value
                  )
                }
                className="form-input resize-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white disabled:opacity-60"
          >
            <FaPlus />
            {saving
              ? "جارٍ الحفظ..."
              : "إنشاء المشروع"}
          </button>
        </form>

        <Notice message={message} />

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    dir="ltr"
                    className="text-right text-sm font-black text-blue-700"
                  >
                    {project.project_no}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#071d49]">
                    {project.project_name}
                  </h2>
                  <p className="mt-2 text-slate-500">
                    {project.customer
                      ?.company_name ||
                      project.customer?.name ||
                      "بدون عميل"}
                  </p>
                </div>

                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">
                  {project.status}
                </span>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm font-bold">
                  <span>التقدم</span>
                  <span>
                    {project.progress}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-[#ff7417]"
                    style={{
                      width: `${project.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <select
                  value={project.status}
                  onChange={(event) =>
                    updateProject(project.id, {
                      status:
                        event.target.value,
                    })
                  }
                  className="form-input"
                >
                  <option value="planning">
                    Planning
                  </option>
                  <option value="active">
                    Active
                  </option>
                  <option value="on_hold">
                    On Hold
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={project.progress}
                  onChange={(event) =>
                    updateProject(project.id, {
                      progress: Number(
                        event.target.value
                      ),
                    })
                  }
                  className="form-input"
                />
              </div>

              <p
                dir="ltr"
                className="mt-5 text-right text-xl font-black text-[#071d49]"
              >
                {Number(
                  project.contract_value || 0
                ).toLocaleString()}{" "}
                SAR
              </p>

              <p className="mt-2 text-sm text-slate-500">
                مدير المشروع:{" "}
                {project.manager?.full_name ||
                  "غير معين"}
              </p>

              <Link
                to={`/admin/project-commercial?project=${project.id}`}
                className="mt-5 inline-block rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
              >
                العقد والمهام والمالية
              </Link>
            </article>
          ))}
        </div>
      </div>
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          )
        )}
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
