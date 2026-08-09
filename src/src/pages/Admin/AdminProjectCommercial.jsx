import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

function makeNo(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-7)}`;
}

export default function AdminProjectCommercial() {
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(
    searchParams.get("project") || ""
  );
  const [team, setTeam] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [purchaseOrders, setPurchaseOrders] =
    useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  async function loadBase() {
    const [projectResult, teamResult] =
      await Promise.all([
        supabase
          .from("ict_delivery_projects")
          .select(
            "id,project_no,project_name,customer_id,contract_value"
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
      projectResult.error ||
      teamResult.error;

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
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
  }

  async function loadProjectData() {
    const [
      contractResult,
      taskResult,
      poResult,
      invoiceResult,
      paymentResult,
    ] = await Promise.all([
      supabase
        .from("ict_delivery_contracts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("ict_delivery_tasks")
        .select(
          "*,owner:ict_team_members(id,full_name)"
        )
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from(
          "ict_delivery_purchase_orders"
        )
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("ict_delivery_invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("ict_delivery_payments")
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
    setPurchaseOrders(poResult.data || []);
    setInvoices(invoiceResult.data || []);
    setPayments(paymentResult.data || []);
  }

  const project = projects.find(
    (item) => item.id === projectId
  );

  const invoiced = useMemo(
    () =>
      invoices.reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0) +
          Number(item.tax_amount || 0),
        0
      ),
    [invoices]
  );

  const paid = useMemo(
    () =>
      payments.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      ),
    [payments]
  );

  const purchasing = useMemo(
    () =>
      purchaseOrders
        .filter(
          (item) =>
            item.status !== "cancelled"
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        ),
    [purchaseOrders]
  );

  async function insertRow(
    table,
    payload
  ) {
    setMessage({ type: "", text: "" });

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const { error } = await supabase
        .from(table)
        .insert({
          ...payload,
          created_by:
            authData.user?.id || null,
        });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "تم الحفظ بنجاح.",
      });
      await loadProjectData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر حفظ البيانات.",
      });
    }
  }

  async function updateTask(id, patch) {
    const { error } = await supabase
      .from("ict_delivery_tasks")
      .update({
        ...patch,
        completed_at:
          patch.status === "done"
            ? new Date().toISOString()
            : null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    await loadProjectData();
  }

  if (!projects.length) {
    return (
      <div
        dir="rtl"
        className="p-10 text-slate-600"
      >
        أنشئ مشروعًا تشغيليًا أولًا من صفحة
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
        <h1 className="text-4xl font-black text-[#071d49]">
          التنفيذ والتجاري
        </h1>
        <p className="mt-3 text-slate-600">
          العقد والمهام والمشتريات والفواتير
          والتحصيل لكل مشروع.
        </p>

        <select
          value={projectId}
          onChange={(event) =>
            setProjectId(event.target.value)
          }
          className="form-input mt-6 max-w-2xl"
        >
          {projects.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.project_no} —{" "}
              {item.project_name}
            </option>
          ))}
        </select>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            label="أوامر الشراء"
            value={purchasing}
          />
        </div>

        <Notice message={message} />

        <Section title="العقود">
          <ContractForm
            project={project}
            onSave={(values) =>
              insertRow(
                "ict_delivery_contracts",
                {
                  project_id: projectId,
                  customer_id:
                    project?.customer_id ||
                    null,
                  contract_no:
                    makeNo("CTR"),
                  title: values.title,
                  contract_value:
                    Number(
                      values.contract_value ||
                        0
                    ),
                  signed_date:
                    values.signed_date ||
                    null,
                  start_date:
                    values.start_date ||
                    null,
                  end_date:
                    values.end_date || null,
                  status: "active",
                }
              )
            }
          />

          <Cards>
            {contracts.map((item) => (
              <Card key={item.id}>
                <p
                  dir="ltr"
                  className="text-right text-sm font-black text-blue-700"
                >
                  {item.contract_no}
                </p>
                <h3 className="mt-2 text-lg font-black">
                  {item.title}
                </h3>
                <p
                  dir="ltr"
                  className="mt-3 text-right font-black"
                >
                  {money(
                    item.contract_value
                  )}{" "}
                  SAR
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {item.status}
                </p>
              </Card>
            ))}
          </Cards>
        </Section>

        <Section title="مهام المشروع">
          <TaskForm
            team={team}
            onSave={(values) =>
              insertRow(
                "ict_delivery_tasks",
                {
                  project_id: projectId,
                  title: values.title,
                  assigned_to:
                    values.assigned_to ||
                    null,
                  priority:
                    values.priority,
                  due_date:
                    values.due_date ||
                    null,
                }
              )
            }
          />

          <Cards>
            {tasks.map((item) => (
              <Card key={item.id}>
                <h3 className="font-black">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {item.owner?.full_name ||
                    "غير معين"}
                </p>

                <select
                  value={item.status}
                  onChange={(event) =>
                    updateTask(item.id, {
                      status:
                        event.target.value,
                    })
                  }
                  className="form-input mt-3"
                >
                  <option value="todo">
                    To Do
                  </option>
                  <option value="in_progress">
                    In Progress
                  </option>
                  <option value="blocked">
                    Blocked
                  </option>
                  <option value="done">
                    Done
                  </option>
                </select>
              </Card>
            ))}
          </Cards>
        </Section>

        <Section title="أوامر الشراء">
          <POForm
            onSave={(values) =>
              insertRow(
                "ict_delivery_purchase_orders",
                {
                  project_id: projectId,
                  po_no: makeNo("PO"),
                  vendor_name:
                    values.vendor_name,
                  description:
                    values.description ||
                    null,
                  amount: Number(
                    values.amount || 0
                  ),
                  expected_delivery_date:
                    values.expected_delivery_date ||
                    null,
                  status: "issued",
                }
              )
            }
          />

          <Cards>
            {purchaseOrders.map(
              (item) => (
                <Card key={item.id}>
                  <p
                    dir="ltr"
                    className="text-right text-sm font-black text-blue-700"
                  >
                    {item.po_no}
                  </p>
                  <h3 className="mt-2 font-black">
                    {item.vendor_name}
                  </h3>
                  <p
                    dir="ltr"
                    className="mt-3 text-right font-black"
                  >
                    {money(item.amount)} SAR
                  </p>
                </Card>
              )
            )}
          </Cards>
        </Section>

        <Section title="فواتير العميل">
          <InvoiceForm
            onSave={(values) =>
              insertRow(
                "ict_delivery_invoices",
                {
                  project_id: projectId,
                  customer_id:
                    project?.customer_id ||
                    null,
                  invoice_no:
                    makeNo("INV"),
                  amount: Number(
                    values.amount || 0
                  ),
                  tax_amount: Number(
                    values.tax_amount || 0
                  ),
                  due_date:
                    values.due_date ||
                    null,
                  status: "issued",
                }
              )
            }
          />

          <Cards>
            {invoices.map((item) => (
              <Card key={item.id}>
                <p
                  dir="ltr"
                  className="text-right text-sm font-black text-blue-700"
                >
                  {item.invoice_no}
                </p>
                <p
                  dir="ltr"
                  className="mt-3 text-right font-black"
                >
                  {money(
                    Number(
                      item.amount || 0
                    ) +
                      Number(
                        item.tax_amount || 0
                      )
                  )}{" "}
                  SAR
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {item.status}
                </p>
              </Card>
            ))}
          </Cards>
        </Section>

        <Section title="الدفعات والتحصيل">
          <PaymentForm
            invoices={invoices}
            onSave={(values) =>
              insertRow(
                "ict_delivery_payments",
                {
                  project_id: projectId,
                  invoice_id:
                    values.invoice_id,
                  amount: Number(
                    values.amount
                  ),
                  payment_method:
                    values.payment_method ||
                    null,
                  reference_no:
                    values.reference_no ||
                    null,
                }
              )
            }
          />

          <Cards>
            {payments.map((item) => (
              <Card key={item.id}>
                <h3
                  dir="ltr"
                  className="text-right text-xl font-black text-green-800"
                >
                  {money(item.amount)} SAR
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {item.payment_date}
                </p>
                <p className="mt-1 text-sm">
                  {item.payment_method ||
                    "—"}
                </p>
              </Card>
            ))}
          </Cards>
        </Section>
      </div>
    </div>
  );
}

function ContractForm({ onSave }) {
  const [values, setValues] = useState({
    title: "",
    contract_value: "",
    signed_date: "",
    start_date: "",
    end_date: "",
  });

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();

        if (!values.title.trim()) {
          return;
        }

        onSave(values);

        setValues({
          title: "",
          contract_value: "",
          signed_date: "",
          start_date: "",
          end_date: "",
        });
      }}
    >
      <InputField
        placeholder="عنوان العقد"
        value={values.title}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            title: value,
          }))
        }
        required
      />

      <InputField
        placeholder="قيمة العقد"
        type="number"
        value={values.contract_value}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            contract_value: value,
          }))
        }
      />

      <InputField
        type="date"
        value={values.signed_date}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            signed_date: value,
          }))
        }
      />

      <InputField
        type="date"
        value={values.start_date}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            start_date: value,
          }))
        }
      />

      <button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">
        إضافة العقد
      </button>
    </form>
  );
}

function TaskForm({ team, onSave }) {
  const [values, setValues] = useState({
    title: "",
    assigned_to: "",
    priority: "medium",
    due_date: "",
  });

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!values.title.trim()) {
          return;
        }

        onSave(values);
        setValues({
          title: "",
          assigned_to: "",
          priority: "medium",
          due_date: "",
        });
      }}
    >
      <InputField
        placeholder="المهمة"
        value={values.title}
        required
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            title: value,
          }))
        }
      />

      <select
        value={values.assigned_to}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            assigned_to:
              event.target.value,
          }))
        }
        className="form-input"
      >
        <option value="">
          غير معين
        </option>
        {team.map((member) => (
          <option
            key={member.id}
            value={member.id}
          >
            {member.full_name}
          </option>
        ))}
      </select>

      <InputField
        type="date"
        value={values.due_date}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            due_date: value,
          }))
        }
      />

      <button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">
        إضافة المهمة
      </button>
    </form>
  );
}

function POForm({ onSave }) {
  const [values, setValues] = useState({
    vendor_name: "",
    amount: "",
    description: "",
    expected_delivery_date: "",
  });

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!values.vendor_name.trim()) {
          return;
        }

        onSave(values);

        setValues({
          vendor_name: "",
          amount: "",
          description: "",
          expected_delivery_date: "",
        });
      }}
    >
      <InputField
        placeholder="المورد"
        value={values.vendor_name}
        required
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            vendor_name: value,
          }))
        }
      />

      <InputField
        placeholder="القيمة"
        type="number"
        value={values.amount}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            amount: value,
          }))
        }
      />

      <InputField
        placeholder="الوصف"
        value={values.description}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            description: value,
          }))
        }
      />

      <button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">
        إضافة PO
      </button>
    </form>
  );
}

function InvoiceForm({ onSave }) {
  const [values, setValues] = useState({
    amount: "",
    tax_amount: "",
    due_date: "",
  });

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!values.amount) {
          return;
        }

        onSave(values);
        setValues({
          amount: "",
          tax_amount: "",
          due_date: "",
        });
      }}
    >
      <InputField
        placeholder="المبلغ قبل الضريبة"
        type="number"
        value={values.amount}
        required
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            amount: value,
          }))
        }
      />

      <InputField
        placeholder="الضريبة"
        type="number"
        value={values.tax_amount}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            tax_amount: value,
          }))
        }
      />

      <InputField
        type="date"
        value={values.due_date}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            due_date: value,
          }))
        }
      />

      <button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">
        إضافة الفاتورة
      </button>
    </form>
  );
}

function PaymentForm({
  invoices,
  onSave,
}) {
  const [values, setValues] = useState({
    invoice_id: "",
    amount: "",
    payment_method: "Bank Transfer",
    reference_no: "",
  });

  return (
    <form
      className="mt-5 grid gap-3 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();

        if (
          !values.invoice_id ||
          !values.amount
        ) {
          return;
        }

        onSave(values);

        setValues({
          invoice_id: "",
          amount: "",
          payment_method:
            "Bank Transfer",
          reference_no: "",
        });
      }}
    >
      <select
        required
        value={values.invoice_id}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            invoice_id:
              event.target.value,
          }))
        }
        className="form-input"
      >
        <option value="">
          اختر الفاتورة
        </option>

        {invoices.map((item) => (
          <option
            key={item.id}
            value={item.id}
          >
            {item.invoice_no}
          </option>
        ))}
      </select>

      <InputField
        placeholder="المبلغ"
        type="number"
        value={values.amount}
        required
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            amount: value,
          }))
        }
      />

      <InputField
        placeholder="طريقة الدفع"
        value={values.payment_method}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            payment_method: value,
          }))
        }
      />

      <InputField
        placeholder="رقم المرجع"
        value={values.reference_no}
        onChange={(value) =>
          setValues((current) => ({
            ...current,
            reference_no: value,
          }))
        }
      />

      <button className="rounded-xl bg-[#ff7417] px-4 py-3 font-black text-white">
        تسجيل دفعة
      </button>
    </form>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="form-input"
    />
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#071d49]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-bold text-slate-500">
        {label}
      </p>
      <p
        dir="ltr"
        className="mt-2 text-right text-2xl font-black text-[#071d49]"
      >
        {money(value)} SAR
      </p>
    </div>
  );
}

function Cards({ children }) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-7">
      {children}
    </article>
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
