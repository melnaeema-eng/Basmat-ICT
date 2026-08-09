import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PortalInvoices() {
  const [rows, setRows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [i, p] = await Promise.all([
      supabase.from("ict_delivery_invoices")
        .select("id,invoice_no,amount,tax_amount,issue_date,due_date,status")
        .order("issue_date", { ascending: false }),
      supabase.from("ict_delivery_payments")
        .select("id,invoice_id,amount,payment_date,payment_method,reference_no")
        .order("payment_date", { ascending: false }),
    ]);

    const error = i.error || p.error;
    if (error) return setErrorMessage(error.message);

    setRows(i.data || []);
    setPayments(p.data || []);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">الفواتير والتحصيل</h1>
        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 space-y-5">
          {rows.map((row) => {
            const invoicePayments = payments.filter((x) => x.invoice_id === row.id);
            const paid = invoicePayments.reduce((s, x) => s + Number(x.amount || 0), 0);
            const total = Number(row.amount || 0) + Number(row.tax_amount || 0);

            return (
              <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p dir="ltr" className="text-right font-black text-blue-700">{row.invoice_no}</p>
                <p className="mt-2 text-slate-500">الحالة: {row.status}</p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <Metric label="إجمالي الفاتورة" value={total} />
                  <Metric label="المحصل" value={paid} />
                  <Metric label="المتبقي" value={total - paid} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p dir="ltr" className="mt-2 text-right text-xl font-black text-[#071d49]">
        {Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR
      </p>
    </div>
  );
}
