import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaCircleCheck, FaCircleExclamation, FaFileInvoice, FaHouse, FaShieldHalved } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

function money(value, currency) {
  return `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || "SAR"}`;
}

export default function VerifyInvoice() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { verify(); }, [token]);

  async function verify() {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("ict_verify_invoice", { p_token: token });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    if (!data || data.valid !== true) {
      setError("رمز التحقق غير صحيح أو الفاتورة غير موجودة.");
      setRecord(null);
      setLoading(false);
      return;
    }
    setRecord(data);
    setLoading(false);
  }

  if (loading) {
    return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-16 text-center"><FaShieldHalved className="mx-auto text-5xl text-[#071d49]" /><p className="mt-5 font-black text-slate-600">جارٍ التحقق من الفاتورة...</p></div>;
  }

  if (error || !record) {
    return <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16"><div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center"><FaCircleExclamation className="mx-auto text-5xl text-red-600" /><h1 className="mt-5 text-2xl font-black text-red-800">تعذر التحقق من الفاتورة</h1><p className="mt-3 text-red-700">{error}</p></div><Link to="/" className="mx-auto mt-6 flex w-fit items-center gap-2 font-black text-[#071d49]"><FaHouse /> العودة إلى الموقع</Link></div>;
  }

  const cancelled = ["cancelled", "canceled"].includes(String(record.status || "").toLowerCase());
  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-4 py-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b-4 border-[#071d49] p-7 text-center"><img src="/logo.png" alt="بصمة النوابغ" className="mx-auto h-20 w-20 object-contain" /><h1 className="mt-3 text-2xl font-black text-[#071d49]">التحقق من صحة الفاتورة</h1><p className="mt-1 text-sm font-bold text-slate-500">Basmat Alnawabigh ICT — Invoice Verification</p></header>
        <main className="p-6 md:p-8">
          <div className={`rounded-2xl border p-5 text-center ${cancelled ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{cancelled ? <FaCircleExclamation className="mx-auto text-4xl" /> : <FaCircleCheck className="mx-auto text-4xl" />}<p className="mt-3 text-xl font-black">{cancelled ? "الفاتورة صحيحة لكنها ملغاة" : "فاتورة صحيحة ومسجلة بالنظام"}</p></div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Info label="رقم الفاتورة / Invoice No." value={record.invoice_no} ltr />
            <Info label="رمز التحقق / Verification Code" value={record.verification_code} ltr />
            <Info label="العميل / Customer" value={record.customer_name || "—"} />
            <Info label="الشركة / Company" value={record.company_name || "—"} />
            <Info label="تاريخ الإصدار / Issue Date" value={record.issue_date || "—"} ltr />
            <Info label="تاريخ الاستحقاق / Due Date" value={record.due_date || "—"} ltr />
            <Info label="الحالة / Status" value={record.status || "—"} ltr />
            <Info label="الإجمالي / Total" value={money(record.total_amount, record.currency)} ltr />
            <Info label="اعتماد العميل / Customer Acceptance" value={record.customer_accepted_at ? `Accepted ${record.customer_accepted_at}` : "Not accepted yet / لم تعتمد بعد"} ltr />
          </div>
          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-center text-sm leading-7 text-slate-600"><FaFileInvoice className="mx-auto mb-2 text-xl text-[#071d49]" />هذه الصفحة تتحقق مباشرة من سجل الفاتورة في نظام بصمة النوابغ.</div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value, ltr = false }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-black text-slate-500">{label}</p><p dir={ltr ? "ltr" : undefined} className={`mt-2 font-black text-[#071d49] ${ltr ? "text-right" : ""}`}>{value}</p></div>;
}
