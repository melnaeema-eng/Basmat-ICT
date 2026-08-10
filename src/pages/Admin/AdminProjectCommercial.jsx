import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaBuilding,
  FaFileContract,
  FaFileInvoiceDollar,
  FaMoneyBillTransfer,
  FaPlus,
  FaRotate,
  FaScrewdriverWrench,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const num = (value) => Number(value || 0);

const money = (value) =>
  num(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const makeNo = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-7)}`;

const contractStatusLabels = {
  draft: "مسودة",
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const invoiceStatusLabels = {
  draft: "مسودة",
  issued: "صادرة",
  partially_paid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغاة",
};

const paymentStatusLabels = {
  pending: "معلق",
  received: "مستلم",
  reversed: "معكوس",
};

export default function AdminProjectCommercial() {
  const [params] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(
    params.get("project") || ""
  );

  const [team, setTeam] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pos, setPos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [loading, setLoading] = useState(true);
  const [creatingContract, setCreatingContract] =
    useState(false);

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  async function loadBase() {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const [projectResult, teamResult] =
      await Promise.all([
        supabase
          .from("ict_delivery_projects")
          .select(
            `
              id,
              project_no,
              project_name,
              customer_id,
              quotation_id,
              contract_value,
              start_date,
              target_end_date,
              scope,
              status,
              progress
            `
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("ict_team_members")
          .select("id,full_name")
          .eq("is_active", true)
          .order("full_name"),
      ]);

    const error =
      projectResult.error || teamResult.error;

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      setLoading(false);
      return;
    }

    setProjects(projectResult.data || []);
    setTeam(teamResult.data || []);

    if (
      !projectId &&
      projectResult.data?.length
    ) {
      setProjectId(
        projectResult.data[0].id
      );
    }

    setLoading(false);
  }

  async function loadProjectData() {
    setMessage({ type: "", text: "" });

    const [
      contractResult,
      taskResult,
      poResult,
      invoiceResult,
      paymentResult,
    ] = await Promise.all([
      supabase
        .from("ict_contracts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_project_tasks")
        .select(
          "*,owner:ict_team_members(full_name)"
        )
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_purchase_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_payments")
        .select("*")
        .eq("project_id", projectId)
        .order("payment_date", {
          ascending: false,
        }),
    ]);

    const error =
      contractResult.error ||
      taskResult.error ||
      poResult.error ||
      invoiceResult.error ||
      paymentResult.error;

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setContracts(contractResult.data || []);
    setTasks(taskResult.data || []);
    setPos(poResult.data || []);
    setInvoices(invoiceResult.data || []);
    setPayments(paymentResult.data || []);
  }

  const project = projects.find(
    (row) => row.id === projectId
  );

  const activeContract =
    contracts.find(
      (row) => row.status === "active"
    ) ||
    contracts[0] ||
    null;

  const invoiced = useMemo(
    () =>
      invoices
        .filter(
          (row) =>
            row.status !== "cancelled"
        )
        .reduce(
          (sum, row) =>
            sum + num(row.total_amount),
          0
        ),
    [invoices]
  );

  const paid = useMemo(
    () =>
      payments
        .filter(
          (row) =>
            row.status === "received"
        )
        .reduce(
          (sum, row) =>
            sum + num(row.amount),
          0
        ),
    [payments]
  );

  const purchasing = useMemo(
    () =>
      pos
        .filter(
          (row) =>
            row.status !== "cancelled"
        )
        .reduce(
          (sum, row) =>
            sum + num(row.amount),
          0
        ),
    [pos]
  );

  const outstanding = Math.max(
    invoiced - paid,
    0
  );

  async function insert(table, payload) {
    setMessage({ type: "", text: "" });

    const { data: authData } =
      await supabase.auth.getUser();

    const { error } = await supabase
      .from(table)
      .insert({
        ...payload,
        created_by:
          authData.user?.id || null,
      });

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return false;
    }

    setMessage({
      type: "success",
      text: "تم الحفظ بنجاح.",
    });

    await loadProjectData();
    return true;
  }

  async function createContractFromProject() {
    if (!projectId) return;

    setCreatingContract(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } =
        await supabase.rpc(
          "create_contract_from_project",
          {
            p_project_id: projectId,
          }
        );

      if (error) throw error;

      setMessage({
        type: "success",
        text: data
          ? "تم إنشاء العقد وربطه بالمشروع وعرض السعر."
          : "تم إنشاء العقد.",
      });

      await loadProjectData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر إنشاء العقد.",
      });
    } finally {
      setCreatingContract(false);
    }
  }

  async function createInvoice(values) {
    const contractId =
      values.contract_id ||
      activeContract?.id;

    if (!contractId) {
      setMessage({
        type: "error",
        text:
          "يجب إنشاء عقد للمشروع أولًا قبل إصدار الفاتورة.",
      });
      return;
    }

    setMessage({ type: "", text: "" });

    const { data, error } =
      await supabase.rpc(
        "create_invoice_from_contract",
        {
          p_contract_id: contractId,
          p_subtotal: num(
            values.subtotal
          ),
          p_tax_rate: num(
            values.tax_rate || 15
          ),
          p_due_date:
            values.due_date || null,
          p_notes:
            values.notes || null,
        }
      );

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setMessage({
      type: "success",
      text: `تم إنشاء الفاتورة بنجاح${
        data ? "." : ""
      }`,
    });

    await loadProjectData();
  }

  async function registerPayment(values) {
    const invoice = invoices.find(
      (row) =>
        row.id === values.invoice_id
    );

    if (!invoice) {
      setMessage({
        type: "error",
        text: "اختر الفاتورة.",
      });
      return;
    }

    await insert("ict_payments", {
      payment_no: makeNo("PAY"),
      invoice_id: invoice.id,
      contract_id:
        invoice.contract_id || null,
      project_id: projectId,
      customer_id:
        project?.customer_id || null,
      payment_date:
        values.payment_date ||
        new Date()
          .toISOString()
          .slice(0, 10),
      amount: num(values.amount),
      currency:
        invoice.currency || "SAR",
      method:
        values.payment_method ||
        null,
      reference_no:
        values.reference_no || null,
      status: "received",
    });
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="p-10 text-slate-500"
      >
        جارٍ تحميل البيانات...
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div
        dir="rtl"
        className="p-10"
      >
        أنشئ مشروعًا أولًا من صفحة
        إدارة المشاريع.
      </div>
    );
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
              التنفيذ والتجاري
            </h1>

            <p className="mt-3 text-slate-600">
              إدارة العقد والمهام وأوامر
              الشراء والفواتير والتحصيل
              للمشروع.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadBase();
              if (projectId) {
                loadProjectData();
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        <select
          className="form-input mt-6 max-w-xl"
          value={projectId}
          onChange={(event) =>
            setProjectId(
              event.target.value
            )
          }
        >
          {projects.map((row) => (
            <option
              key={row.id}
              value={row.id}
            >
              {row.project_no} —{" "}
              {row.project_name}
            </option>
          ))}
        </select>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="قيمة المشروع"
            value={
              project?.contract_value
            }
          />

          <Metric
            label="إجمالي الفواتير"
            value={invoiced}
          />

          <Metric
            label="المحصل"
            value={paid}
          />

          <Metric
            label="المتبقي"
            value={outstanding}
          />

          <Metric
            label="أوامر الشراء"
            value={purchasing}
          />
        </div>

        <Notice message={message} />

        <Section
          title="العقود"
          icon={<FaFileContract />}
        >
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={
                createContractFromProject
              }
              disabled={
                creatingContract ||
                !projectId
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              <FaPlus />
              {creatingContract
                ? "جارٍ إنشاء العقد..."
                : contracts.length
                ? "استرجاع / فتح عقد المشروع"
                : "إنشاء عقد من المشروع"}
            </button>

            {activeContract && (
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-800">
                العقد الحالي:{" "}
                {
                  activeContract.contract_no
                }
              </span>
            )}
          </div>

          <Cards
            rows={contracts}
            empty="لا يوجد عقد لهذا المشروع حتى الآن."
            render={(row) => (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b
                      dir="ltr"
                      className="block text-blue-700"
                    >
                      {row.contract_no}
                    </b>

                    <p className="mt-2 font-black text-[#071d49]">
                      {row.title}
                    </p>
                  </div>

                  <StatusBadge
                    label={
                      contractStatusLabels[
                        row.status
                      ] || row.status
                    }
                  />
                </div>

                <strong
                  dir="ltr"
                  className="mt-4 block text-right text-xl text-[#071d49]"
                >
                  {money(
                    row.contract_value
                  )}{" "}
                  {row.currency || "SAR"}
                </strong>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-500">
                  <p>
                    البداية:{" "}
                    {row.start_date ||
                      "—"}
                  </p>

                  <p>
                    النهاية:{" "}
                    {row.end_date ||
                      "—"}
                  </p>
                </div>

                {row.scope && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-600">
                    {row.scope}
                  </p>
                )}
              </>
            )}
          />
        </Section>

        <Section
          title="مهام المشروع"
          icon={<FaScrewdriverWrench />}
        >
          <QuickForm
            fields={[
              ["title", "المهمة"],
              [
                "due_date",
                "تاريخ الاستحقاق",
                "date",
              ],
            ]}
            extra={
              <select
                id="task-owner"
                className="form-input"
              >
                <option value="">
                  غير معين
                </option>

                {team.map((row) => (
                  <option
                    key={row.id}
                    value={row.id}
                  >
                    {row.full_name}
                  </option>
                ))}
              </select>
            }
            button="إضافة مهمة"
            onSave={(values) =>
              insert(
                "ict_project_tasks",
                {
                  project_id:
                    projectId,
                  title:
                    values.title,
                  due_date:
                    values.due_date ||
                    null,
                  assigned_to:
                    document.getElementById(
                      "task-owner"
                    )?.value || null,
                }
              )
            }
          />

          <Cards
            rows={tasks}
            empty="لا توجد مهام."
            render={(row) => (
              <>
                <b>{row.title}</b>
                <p className="mt-2 text-slate-500">
                  {row.owner
                    ?.full_name ||
                    "غير معين"}{" "}
                  — {row.status}
                </p>
              </>
            )}
          />
        </Section>

        <Section
          title="أوامر الشراء"
          icon={<FaBuilding />}
        >
          <QuickForm
            fields={[
              [
                "vendor_name",
                "المورد",
              ],
              [
                "amount",
                "القيمة",
                "number",
              ],
              [
                "description",
                "الوصف",
              ],
            ]}
            button="إضافة PO"
            onSave={(values) =>
              insert(
                "ict_purchase_orders",
                {
                  project_id:
                    projectId,
                  po_no:
                    makeNo("PO"),
                  vendor_name:
                    values.vendor_name,
                  amount: num(
                    values.amount
                  ),
                  description:
                    values.description ||
                    null,
                  status: "issued",
                }
              )
            }
          />

          <Cards
            rows={pos}
            empty="لا توجد أوامر شراء."
            render={(row) => (
              <>
                <b
                  dir="ltr"
                  className="block text-blue-700"
                >
                  {row.po_no}
                </b>

                <p className="mt-2">
                  {row.vendor_name}
                </p>

                <strong
                  dir="ltr"
                  className="mt-3 block text-right"
                >
                  {money(row.amount)} SAR
                </strong>
              </>
            )}
          />
        </Section>

        <Section
          title="فواتير العميل"
          icon={
            <FaFileInvoiceDollar />
          }
        >
          <InvoiceForm
            contracts={contracts}
            activeContract={
              activeContract
            }
            onSave={createInvoice}
          />

          <Cards
            rows={invoices}
            empty="لا توجد فواتير."
            render={(row) => (
              <>
                <div className="flex items-start justify-between gap-3">
                  <b
                    dir="ltr"
                    className="text-blue-700"
                  >
                    {row.invoice_no}
                  </b>

                  <StatusBadge
                    label={
                      invoiceStatusLabels[
                        row.status
                      ] || row.status
                    }
                  />
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>
                      الإجمالي
                    </span>
                    <strong dir="ltr">
                      {money(
                        row.total_amount
                      )}{" "}
                      {row.currency ||
                        "SAR"}
                    </strong>
                  </p>

                  <p className="flex justify-between">
                    <span>
                      المدفوع
                    </span>
                    <strong dir="ltr">
                      {money(
                        row.amount_paid
                      )}{" "}
                      {row.currency ||
                        "SAR"}
                    </strong>
                  </p>

                  <p className="flex justify-between">
                    <span>
                      المتبقي
                    </span>
                    <strong dir="ltr">
                      {money(
                        row.balance_due
                      )}{" "}
                      {row.currency ||
                        "SAR"}
                    </strong>
                  </p>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  الاستحقاق:{" "}
                  {row.due_date || "—"}
                </p>
              </>
            )}
          />
        </Section>

        <Section
          title="الدفعات والتحصيل"
          icon={
            <FaMoneyBillTransfer />
          }
        >
          <PaymentForm
            invoices={invoices.filter(
              (row) =>
                ![
                  "paid",
                  "cancelled",
                ].includes(
                  row.status
                )
            )}
            onSave={registerPayment}
          />

          <Cards
            rows={payments}
            empty="لا توجد دفعات."
            render={(row) => (
              <>
                <div className="flex items-start justify-between gap-3">
                  <b
                    dir="ltr"
                    className="text-xl text-[#071d49]"
                  >
                    {money(
                      row.amount
                    )}{" "}
                    {row.currency ||
                      "SAR"}
                  </b>

                  <StatusBadge
                    label={
                      paymentStatusLabels[
                        row.status
                      ] || row.status
                    }
                  />
                </div>

                <p className="mt-3 text-slate-500">
                  {row.payment_date} —{" "}
                  {row.method || "—"}
                </p>

                {row.reference_no && (
                  <p
                    dir="ltr"
                    className="mt-2 text-right text-sm text-slate-400"
                  >
                    Ref:{" "}
                    {
                      row.reference_no
                    }
                  </p>
                )}
              </>
            )}
          />
        </Section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="font-bold text-slate-500">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-2 text-right text-xl font-black text-[#071d49]"
      >
        {money(value)} SAR
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}) {
  return (
    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-3 text-2xl font-black text-[#071d49]">
        {icon}
        {title}
      </h2>

      {children}
    </section>
  );
}

function Cards({
  rows,
  render,
  empty,
}) {
  if (!rows.length) {
    return (
      <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
        {empty}
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl bg-slate-50 p-4 leading-7"
        >
          {render(row)}
        </div>
      ))}
    </div>
  );
}

function QuickForm({
  fields,
  extra,
  button,
  onSave,
}) {
  const [values, setValues] =
    useState({});

  async function submit(event) {
    event.preventDefault();
    await onSave(values);
    setValues({});
  }

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-4"
      onSubmit={submit}
    >
      {fields.map(
        ([
          name,
          label,
          type = "text",
        ]) => (
          <input
            key={name}
            required={
              name === "title" ||
              name === "vendor_name"
            }
            type={type}
            placeholder={label}
            value={
              values[name] || ""
            }
            onChange={(event) =>
              setValues(
                (current) => ({
                  ...current,
                  [name]:
                    event.target
                      .value,
                })
              )
            }
            className="form-input"
          />
        )
      )}

      {extra}

      <button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">
        {button}
      </button>
    </form>
  );
}

function InvoiceForm({
  contracts,
  activeContract,
  onSave,
}) {
  const [values, setValues] =
    useState({
      contract_id:
        activeContract?.id || "",
      subtotal: "",
      tax_rate: "15",
      due_date: "",
      notes: "",
    });

  useEffect(() => {
    if (
      activeContract?.id &&
      !values.contract_id
    ) {
      setValues((current) => ({
        ...current,
        contract_id:
          activeContract.id,
      }));
    }
  }, [activeContract]);

  async function submit(event) {
    event.preventDefault();

    if (
      !values.contract_id ||
      !values.subtotal
    ) {
      return;
    }

    await onSave(values);

    setValues((current) => ({
      ...current,
      subtotal: "",
      due_date: "",
      notes: "",
    }));
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 grid gap-3 md:grid-cols-5"
    >
      <select
        required
        className="form-input"
        value={values.contract_id}
        onChange={(event) =>
          setValues({
            ...values,
            contract_id:
              event.target.value,
          })
        }
      >
        <option value="">
          اختر العقد
        </option>

        {contracts.map((row) => (
          <option
            key={row.id}
            value={row.id}
          >
            {row.contract_no} —{" "}
            {row.title}
          </option>
        ))}
      </select>

      <input
        required
        type="number"
        min="0"
        step="0.01"
        className="form-input"
        placeholder="المبلغ قبل الضريبة"
        value={values.subtotal}
        onChange={(event) =>
          setValues({
            ...values,
            subtotal:
              event.target.value,
          })
        }
      />

      <div className="flex items-center gap-2">
        <input
          required
          type="number"
          min="0"
          step="0.01"
          className="form-input"
          placeholder="الضريبة"
          value={values.tax_rate}
          onChange={(event) =>
            setValues({
              ...values,
              tax_rate:
                event.target.value,
            })
          }
        />

        <span className="text-sm font-bold text-slate-500">
          %
        </span>
      </div>

      <input
        type="date"
        className="form-input"
        value={values.due_date}
        onChange={(event) =>
          setValues({
            ...values,
            due_date:
              event.target.value,
          })
        }
      />

      <button className="rounded-xl bg-[#ff7417] px-4 py-3 font-black text-white">
        إنشاء فاتورة
      </button>

      <input
        className="form-input md:col-span-5"
        placeholder="ملاحظات الفاتورة"
        value={values.notes}
        onChange={(event) =>
          setValues({
            ...values,
            notes:
              event.target.value,
          })
        }
      />
    </form>
  );
}

function PaymentForm({
  invoices,
  onSave,
}) {
  const [values, setValues] =
    useState({
      invoice_id: "",
      amount: "",
      payment_method:
        "Bank Transfer",
      reference_no: "",
      payment_date: new Date()
        .toISOString()
        .slice(0, 10),
    });

  async function submit(event) {
    event.preventDefault();

    if (
      values.invoice_id &&
      values.amount
    ) {
      await onSave(values);

      setValues((current) => ({
        ...current,
        amount: "",
        reference_no: "",
      }));
    }
  }

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-6"
      onSubmit={submit}
    >
      <select
        required
        className="form-input"
        value={
          values.invoice_id
        }
        onChange={(event) =>
          setValues({
            ...values,
            invoice_id:
              event.target.value,
          })
        }
      >
        <option value="">
          اختر الفاتورة
        </option>

        {invoices.map((row) => (
          <option
            key={row.id}
            value={row.id}
          >
            {row.invoice_no} —{" "}
            {money(
              row.balance_due
            )}{" "}
            {row.currency || "SAR"}
          </option>
        ))}
      </select>

      <input
        required
        type="number"
        min="0"
        step="0.01"
        className="form-input"
        placeholder="المبلغ"
        value={values.amount}
        onChange={(event) =>
          setValues({
            ...values,
            amount:
              event.target.value,
          })
        }
      />

      <input
        type="date"
        className="form-input"
        value={
          values.payment_date
        }
        onChange={(event) =>
          setValues({
            ...values,
            payment_date:
              event.target.value,
          })
        }
      />

      <input
        className="form-input"
        placeholder="طريقة الدفع"
        value={
          values.payment_method
        }
        onChange={(event) =>
          setValues({
            ...values,
            payment_method:
              event.target.value,
          })
        }
      />

      <input
        className="form-input"
        placeholder="المرجع"
        value={
          values.reference_no
        }
        onChange={(event) =>
          setValues({
            ...values,
            reference_no:
              event.target.value,
          })
        }
      />

      <button className="rounded-xl bg-[#ff7417] px-4 py-3 font-black text-white">
        تسجيل دفعة
      </button>
    </form>
  );
}

function StatusBadge({ label }) {
  return (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
      {label}
    </span>
  );
}

function Notice({ message }) {
  if (!message.text) return null;

  return (
    <div
      className={[
        "mt-5 rounded-2xl border p-4",
        message.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700",
      ].join(" ")}
    >
      {message.text}
    </div>
  );
}