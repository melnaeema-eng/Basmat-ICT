import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PortalInvoices() {
  const [rows, setRows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setErrorMessage("");

    const [invoiceResult, paymentResult] = await Promise.all([
      supabase
        .from("ict_invoices")
        .select(`
          id,
          invoice_no,
          project_id,
          issue_date,
          due_date,
          currency,
          total_amount,
          amount_paid,
          balance_due,
          status
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("ict_payments")
        .select(`
          id,
          invoice_id,
          project_id,
          payment_date,
          amount,
          currency,
          method,
          reference_no,
          status
        `)
        .order("payment_date", { ascending: false }),
    ]);

    const error =
      invoiceResult.error ||
      paymentResult.error;

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRows(
      (invoiceResult.data || []).filter(
        (row) =>
          !["paid", "cancelled", "canceled"].includes(
            String(row.status || "").toLowerCase()
          )
      )
    );
    setPayments(paymentResult.data || []);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          الفواتير والتحصيل
        </h1>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-5">
          {rows.map((row) => {
            const invoicePayments = payments.filter(
              (payment) =>
                payment.invoice_id === row.id &&
                payment.status === "received"
            );

            const paidFromPayments = invoicePayments.reduce(
              (sum, payment) =>
                sum + Number(payment.amount || 0),
              0
            );

            const paid =
              Number(row.amount_paid || 0) ||
              paidFromPayments;

            const total = Number(row.total_amount || 0);

            const balance =
              row.balance_due !== null &&
              row.balance_due !== undefined
                ? Number(row.balance_due)
                : Math.max(total - paid, 0);

            return (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p
                      dir="ltr"
                      className="text-right font-black text-blue-700"
                    >
                      {row.invoice_no}
                    </p>

                    <p className="mt-2 text-slate-500">
                      تاريخ الإصدار:{" "}
                      {row.issue_date
                        ? formatDate(row.issue_date)
                        : "—"}
                    </p>

                    <p className="mt-1 text-slate-500">
                      تاريخ الاستحقاق:{" "}
                      {row.due_date
                        ? formatDate(row.due_date)
                        : "—"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 font-black text-blue-800">
                    {statusLabel(row.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Metric
                    label="إجمالي الفاتورة"
                    value={total}
                    currency={row.currency}
                  />

                  <Metric
                    label="المحصل"
                    value={paid}
                    currency={row.currency}
                  />

                  <Metric
                    label="المتبقي"
                    value={balance}
                    currency={row.currency}
                  />
                </div>
              </article>
            );
          })}

          {!rows.length && !errorMessage && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              لا توجد فواتير مرتبطة بحسابك حتى الآن.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, currency = "SAR" }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-2 text-right text-xl font-black text-[#071d49]"
      >
        {Number(value || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        {currency || "SAR"}
      </p>
    </div>
  );
}

function statusLabel(status) {
  const labels = {
    draft: "مسودة",
    issued: "صادرة",
    partially_paid: "مدفوعة جزئيًا",
    paid: "مدفوعة",
    overdue: "متأخرة",
    cancelled: "ملغاة",
  };

  return labels[status] || status || "—";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}