import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

export default function AdminOperationsDashboard() {
  const [data, setData] = useState({
    projects: [],
    tasks: [],
    purchaseOrders: [],
    invoices: [],
    payments: [],
  });

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      projectResult,
      taskResult,
      poResult,
      invoiceResult,
      paymentResult,
    ] = await Promise.all([
      supabase
        .from("ict_delivery_projects")
        .select(
          "id,status,progress,contract_value"
        ),
      supabase
        .from("ict_delivery_tasks")
        .select(
          "id,status,due_date"
        ),
      supabase
        .from(
          "ict_delivery_purchase_orders"
        )
        .select("id,status,amount"),
      supabase
        .from("ict_delivery_invoices")
        .select(
          "id,status,amount,tax_amount,due_date"
        ),
      supabase
        .from("ict_delivery_payments")
        .select("id,amount"),
    ]);

    const error =
      projectResult.error ||
      taskResult.error ||
      poResult.error ||
      invoiceResult.error ||
      paymentResult.error;

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setData({
      projects: projectResult.data || [],
      tasks: taskResult.data || [],
      purchaseOrders:
        poResult.data || [],
      invoices:
        invoiceResult.data || [],
      payments:
        paymentResult.data || [],
    });
  }

  const contractValue =
    data.projects.reduce(
      (sum, item) =>
        sum +
        Number(
          item.contract_value || 0
        ),
      0
    );

  const invoiced =
    data.invoices.reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0) +
        Number(
          item.tax_amount || 0
        ),
      0
    );

  const paid =
    data.payments.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const purchases =
    data.purchaseOrders
      .filter(
        (item) =>
          item.status !== "cancelled"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(item.amount || 0),
        0
      );

  const overdueTasks =
    data.tasks.filter(
      (item) =>
        item.status !== "done" &&
        item.due_date &&
        new Date(item.due_date) <
          new Date()
    ).length;

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          Operations Dashboard
        </h1>

        <p className="mt-3 text-slate-600">
          ملخص التنفيذ والمشاريع والمشتريات
          والتحصيل.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="المشاريع النشطة"
            value={
              data.projects.filter(
                (item) =>
                  item.status === "active"
              ).length
            }
          />

          <Metric
            label="مهام متأخرة"
            value={overdueTasks}
          />

          <Metric
            label="قيمة المشاريع"
            value={`${money(
              contractValue
            )} SAR`}
          />

          <Metric
            label="إجمالي الفواتير"
            value={`${money(
              invoiced
            )} SAR`}
          />

          <Metric
            label="المحصل"
            value={`${money(paid)} SAR`}
          />

          <Metric
            label="الرصيد المستحق"
            value={`${money(
              invoiced - paid
            )} SAR`}
          />

          <Metric
            label="أوامر الشراء"
            value={`${money(
              purchases
            )} SAR`}
          />

          <Metric
            label="هامش أولي"
            value={`${money(
              contractValue -
                purchases
            )} SAR`}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="font-bold text-slate-500">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-3 text-right text-2xl font-black text-[#071d49]"
      >
        {value}
      </p>
    </article>
  );
}
