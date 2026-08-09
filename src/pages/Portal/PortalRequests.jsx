import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const statusLabel = {
  new: "تم استلام الطلب",
  reviewing: "قيد المراجعة",
  preparing_quotation: "جارٍ إعداد عرض السعر",
  quoted: "تم إعداد عرض السعر",
  sent: "تم إرسال عرض السعر",
  closed: "مغلق",
};

export default function PortalRequests() {
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from("ict_rfq_requests")
      .select("id,request_no,project_type,project_value,project_description,status,created_at")
      .order("created_at", { ascending: false });

    if (error) setErrorMessage(error.message);
    else setRows(data || []);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">طلباتي</h1>
        <p className="mt-3 text-slate-600">تابع حالة طلبات عروض الأسعار من الاستلام حتى إصدار العرض.</p>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 space-y-5">
          {rows.map(row => (
            <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p dir="ltr" className="text-right font-black text-blue-700">{row.request_no}</p>
                  <h2 className="mt-2 text-xl font-black text-[#071d49]">{row.project_type}</h2>
                </div>
                <span className="rounded-full bg-blue-50 px-4 py-2 font-black text-blue-800">
                  {statusLabel[row.status] || row.status}
                </span>
              </div>
              <p className="mt-4 leading-7 text-slate-600">{row.project_description}</p>
            </article>
          ))}
          {!rows.length && !errorMessage && <div className="rounded-3xl bg-white p-8 text-center text-slate-500">لا توجد طلبات حتى الآن.</div>}
        </div>
      </div>
    </div>
  );
}
