import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const statusLabels = {
  planning: "التخطيط",
  active: "قيد التنفيذ",
  on_hold: "متوقف مؤقتًا",
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

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PortalProjects() {
  const [rows, setRows] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setErrorMessage("");

    const [
      projectResult,
      invoiceResult,
      paymentResult,
    ] = await Promise.all([
      supabase
        .from("ict_delivery_projects")
        .select(`
          id,
          project_no,
          project_name,
          status,
          progress,
          start_date,
          target_end_date,
          scope,
          contract_value,
          quotation:ict_quotations(
            id,
            quotation_no,
            subject
          )
        `)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_invoices")
        .select(`
          id,
          invoice_no,
          project_id,
          issue_date,
          due_date,
          currency,
          subtotal,
          tax_amount,
          total_amount,
          amount_paid,
          balance_due,
          status
        `)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("ict_payments")
        .select(`
          id,
          payment_no,
          project_id,
          invoice_id,
          payment_date,
          amount,
          currency,
          method,
          reference_no,
          status
        `)
        .order("payment_date", {
          ascending: false,
        }),
    ]);

    const error =
      projectResult.error ||
      invoiceResult.error ||
      paymentResult.error;

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRows(projectResult.data || []);
    setInvoices(invoiceResult.data || []);
    setPayments(paymentResult.data || []);
  }

  const invoiceTotals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        if (invoice.status === "cancelled") {
          return acc;
        }

        acc.total += Number(invoice.total_amount || 0);
        acc.paid += Number(invoice.amount_paid || 0);
        acc.balance += Number(invoice.balance_due || 0);

        return acc;
      },
      {
        total: 0,
        paid: 0,
        balance: 0,
      }
    );
  }, [invoices]);

  return (
    <div
      dir="rtl"
      className="px-4 py-10"
    >
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          المشاريع
        </h1>

        <p className="mt-3 text-slate-600">
          متابعة تقدم المشاريع والفواتير والمدفوعات المرتبطة بحسابك.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric
            label="إجمالي الفواتير"
            value={invoiceTotals.total}
          />
          <Metric
            label="إجمالي المدفوع"
            value={invoiceTotals.paid}
          />
          <Metric
            label="المتبقي"
            value={invoiceTotals.balance}
          />
        </div>

        <div className="mt-8 space-y-6">
          {rows.map((row) => {
            const projectInvoices =
              invoices.filter(
                (invoice) =>
                  invoice.project_id === row.id
              );

            const projectPayments =
              payments.filter(
                (payment) =>
                  payment.project_id === row.id &&
                  payment.status === "received"
              );

            const projectInvoiceTotal =
              projectInvoices
                .filter(
                  (invoice) =>
                    invoice.status !== "cancelled"
                )
                .reduce(
                  (sum, invoice) =>
                    sum +
                    Number(
                      invoice.total_amount || 0
                    ),
                  0
                );

            const projectPaid =
              projectPayments.reduce(
                (sum, payment) =>
                  sum +
                  Number(payment.amount || 0),
                0
              );

            const projectBalance = Math.max(
              projectInvoiceTotal - projectPaid,
              0
            );

            return (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p
                      dir="ltr"
                      className="text-right text-sm font-black text-blue-700"
                    >
                      {row.project_no}
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-[#071d49]">
                      {row.project_name}
                    </h2>

                    {row.quotation?.quotation_no && (
                      <p
                        dir="ltr"
                        className="mt-2 text-right text-sm font-bold text-slate-500"
                      >
                        {row.quotation.quotation_no}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 font-black text-blue-800">
                    {statusLabels[row.status] ||
                      row.status}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between font-bold">
                    <span>الإنجاز</span>
                    <span>{row.progress}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-[#ff7417]"
                      style={{
                        width: `${row.progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Info
                    label="تاريخ البداية"
                    value={
                      row.start_date
                        ? formatDate(row.start_date)
                        : "لم يحدد بعد"
                    }
                  />

                  <Info
                    label="النهاية المستهدفة"
                    value={
                      row.target_end_date
                        ? formatDate(row.target_end_date)
                        : "لم تحدد بعد"
                    }
                  />

                  <Info
                    label="إجمالي الفواتير"
                    value={`${money(
                      projectInvoiceTotal
                    )} SAR`}
                  />

                  <Info
                    label="المتبقي"
                    value={`${money(
                      projectBalance
                    )} SAR`}
                  />
                </div>

                {row.scope && (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">
                    {row.scope}
                  </p>
                )}

                <div className="mt-7 border-t border-slate-200 pt-6">
                  <h3 className="text-xl font-black text-[#071d49]">
                    الفواتير
                  </h3>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {projectInvoices.map(
                      (invoice) => {
                        const invoicePayments =
                          projectPayments.filter(
                            (payment) =>
                              payment.invoice_id ===
                              invoice.id
                          );

                        return (
                          <div
                            key={invoice.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p
                                  dir="ltr"
                                  className="text-right font-black text-blue-700"
                                >
                                  {invoice.invoice_no}
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                  الإصدار:{" "}
                                  {invoice.issue_date
                                    ? formatDate(
                                        invoice.issue_date
                                      )
                                    : "—"}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  الاستحقاق:{" "}
                                  {invoice.due_date
                                    ? formatDate(
                                        invoice.due_date
                                      )
                                    : "—"}
                                </p>
                              </div>

                              <InvoiceStatus
                                status={invoice.status}
                              />
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                              <Row
                                label="الإجمالي"
                                value={`${money(
                                  invoice.total_amount
                                )} ${
                                  invoice.currency ||
                                  "SAR"
                                }`}
                              />

                              <Row
                                label="المدفوع"
                                value={`${money(
                                  invoice.amount_paid
                                )} ${
                                  invoice.currency ||
                                  "SAR"
                                }`}
                              />

                              <Row
                                label="المتبقي"
                                value={`${money(
                                  invoice.balance_due
                                )} ${
                                  invoice.currency ||
                                  "SAR"
                                }`}
                                strong
                              />
                            </div>

                            {invoicePayments.length >
                              0 && (
                              <div className="mt-4 border-t border-slate-200 pt-4">
                                <p className="text-sm font-black text-[#071d49]">
                                  الدفعات المسجلة
                                </p>

                                <div className="mt-3 space-y-2">
                                  {invoicePayments.map(
                                    (payment) => (
                                      <div
                                        key={payment.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
                                      >
                                        <div>
                                          <p className="font-bold text-slate-700">
                                            {formatDate(
                                              payment.payment_date
                                            )}
                                          </p>

                                          <p className="text-xs text-slate-500">
                                            {payment.method ||
                                              "—"}
                                            {payment.reference_no
                                              ? ` — ${payment.reference_no}`
                                              : ""}
                                          </p>
                                        </div>

                                        <strong
                                          dir="ltr"
                                          className="text-green-700"
                                        >
                                          {money(
                                            payment.amount
                                          )}{" "}
                                          {payment.currency ||
                                            "SAR"}
                                        </strong>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}

                    {!projectInvoices.length && (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500 lg:col-span-2">
                        لا توجد فواتير لهذا المشروع حتى الآن.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!rows.length &&
            !errorMessage && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                لا توجد مشاريع مرتبطة بحسابك حتى الآن.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">
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

function Info({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-black text-[#071d49]">
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-slate-500">
        {label}
      </span>

      <strong
        dir="ltr"
        className={
          strong
            ? "text-lg text-[#071d49]"
            : "text-slate-800"
        }
      >
        {value}
      </strong>
    </p>
  );
}

function InvoiceStatus({
  status,
}) {
  const styles = {
    paid:
      "bg-green-100 text-green-800",
    partially_paid:
      "bg-amber-100 text-amber-800",
    overdue:
      "bg-red-100 text-red-800",
    issued:
      "bg-blue-100 text-blue-800",
    draft:
      "bg-slate-100 text-slate-700",
    cancelled:
      "bg-slate-200 text-slate-500",
  };

  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-black",
        styles[status] ||
          "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {invoiceStatusLabels[status] ||
        status}
    </span>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      dateStyle: "medium",
    }
  ).format(new Date(value));
}