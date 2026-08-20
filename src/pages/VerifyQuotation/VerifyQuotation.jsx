import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FaCircleCheck,
  FaCircleExclamation,
  FaClock,
  FaFileInvoice,
  FaHouse,
  FaShieldHalved,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const stateConfig = {
  valid: {
    label: "عرض سعر صحيح وساري",
    icon: FaCircleCheck,
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  accepted: {
    label: "عرض سعر صحيح ومقبول",
    icon: FaCircleCheck,
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  expired: {
    label: "عرض السعر صحيح لكنه منتهي الصلاحية",
    icon: FaClock,
    box: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cancelled: {
    label: "عرض السعر ملغي",
    icon: FaCircleExclamation,
    box: "border-red-200 bg-red-50 text-red-800",
  },
  rejected: {
    label: "عرض السعر مرفوض",
    icon: FaCircleExclamation,
    box: "border-red-200 bg-red-50 text-red-800",
  },
  draft: {
    label: "عرض السعر مسودة وغير صادر للعميل",
    icon: FaCircleExclamation,
    box: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

function money(value, currency) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "SAR"}`;
}

export default function VerifyQuotation() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    verify();
  }, [token]);

  async function verify() {
    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "ict_verify_quotation",
      { p_token: token }
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (!data || data.valid !== true) {
      setRecord(null);
      setError("رمز التحقق غير صحيح أو عرض السعر غير موجود.");
      setLoading(false);
      return;
    }

    setRecord(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <FaShieldHalved className="mx-auto text-5xl text-[#071d49]" />
        <p className="mt-5 font-black text-slate-600">جارٍ التحقق من عرض السعر...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <FaCircleExclamation className="mx-auto text-5xl text-red-600" />
          <h1 className="mt-5 text-2xl font-black text-red-800">تعذر التحقق من عرض السعر</h1>
          <p className="mt-3 text-red-700">{error}</p>
        </div>
        <Link to="/" className="mx-auto mt-6 flex w-fit items-center gap-2 font-black text-[#071d49]">
          <FaHouse /> العودة إلى الموقع
        </Link>
      </div>
    );
  }

  const config = stateConfig[record.verification_state] || stateConfig.valid;
  const StateIcon = config.icon;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-4 py-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b-4 border-[#071d49] p-7 text-center">
          <img src="/logo.png" alt="بصمة النوابغ" className="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-3 text-2xl font-black text-[#071d49]">
            التحقق من صحة عرض السعر
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Basmat Alnawabigh ICT — Quotation Verification
          </p>
        </header>

        <main className="p-6 md:p-8">
          <div className={`rounded-2xl border p-5 text-center ${config.box}`}>
            <StateIcon className="mx-auto text-4xl" />
            <p className="mt-3 text-xl font-black">{config.label}</p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Info label="رقم العرض / Quotation No." value={record.quotation_no} ltr />
            <Info label="رمز التحقق / Verification Code" value={record.verification_code} ltr />
            <Info label="العميل / Customer" value={record.customer_name || "—"} />
            <Info label="الشركة / Company" value={record.company_name || "—"} />
            <Info label="الموضوع / Subject" value={record.subject || "—"} />
            <Info label="تاريخ الإصدار / Issue Date" value={record.issue_date || "—"} ltr />
            <Info label="صالح حتى / Valid Until" value={record.valid_until || "—"} ltr />
            <Info label="الإجمالي شامل الضريبة / Total" value={money(record.total_amount, record.currency)} ltr />
          </div>

          <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-center text-sm leading-7 text-slate-600">
            <FaFileInvoice className="mx-auto mb-2 text-xl text-[#071d49]" />
            هذه الصفحة تتحقق مباشرة من سجل عرض السعر في نظام بصمة النوابغ.
            لا تعتمد على صورة QR وحدها إذا كانت نتيجة التحقق هنا غير صحيحة أو منتهية أو ملغاة.
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value, ltr = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p dir={ltr ? "ltr" : undefined} className={`mt-2 font-black text-[#071d49] ${ltr ? "text-right" : ""}`}>
        {value}
      </p>
    </div>
  );
}
