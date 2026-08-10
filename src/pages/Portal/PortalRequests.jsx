import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const statusLabel = {
  new: "تم الاستلام",
  reviewing: "قيد المراجعة",
  preparing_quotation: "جارٍ إعداد عرض السعر",
  quoted: "تم إعداد/إرسال العرض",
  scheduled: "تم تحديد الموعد",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function PortalRequests() {
  const [rows, setRows] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [rfq, consultations, ndaResult] = await Promise.all([
      supabase
        .from("ict_rfq_requests")
        .select("id,request_no,project_type,project_description,status,nda_required,created_at"),
      supabase
        .from("ict_consultation_requests")
        .select("id,request_no,consultation_type,subject,details,status,nda_required,created_at"),
      supabase
        .from("ict_nda_requests")
        .select("id,source_type,source_id,status,nda_no,created_at"),
    ]);

    const error = rfq.error || consultations.error || ndaResult.error;

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNdas(ndaResult.data || []);

    const combined = [
      ...(rfq.data || []).map((x) => ({
        ...x,
        type: "rfq",
        title: x.project_type,
        description: x.project_description,
      })),
      ...(consultations.data || []).map((x) => ({
        ...x,
        type: "consultation",
        title: x.subject || x.consultation_type,
        description: x.details,
      })),
    ].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    setRows(combined);
  }

  function ndaFor(row) {
    return ndas.find((n) => n.source_type === row.type && n.source_id === row.id);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">طلباتي</h1>
        <p className="mt-3 text-slate-600">
          طلبات عروض الأسعار والاستشارات وNDA في مكان واحد.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-5">
          {rows.map((row) => {
            const nda = ndaFor(row);

            return (
              <article key={`${row.type}-${row.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {row.type === "rfq" ? "طلب عرض سعر" : "استشارة"}
                      </span>
                      <p dir="ltr" className="text-right font-black text-blue-700">
                        {row.request_no}
                      </p>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-[#071d49]">
                      {row.title || "طلب"}
                    </h2>
                  </div>

                  <span className="rounded-full bg-blue-50 px-4 py-2 font-black text-blue-800">
                    {statusLabel[row.status] || row.status}
                  </span>
                </div>

                <p className="mt-4 leading-7 text-slate-600">
                  {row.description}
                </p>

                {row.nda_required && (
                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="font-black text-orange-950">
                      NDA: {nda ? nda.status : "جارٍ الإنشاء"}
                    </p>

                    {nda && ["pending","sent"].includes(nda.status) && (
                      <Link
                        to={`/portal/nda/${nda.id}`}
                        className="mt-3 inline-block rounded-xl bg-[#071d49] px-4 py-2 font-black text-white"
                      >
                        مراجعة وقبول NDA
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {!rows.length && !errorMessage && (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-500">
              لا توجد طلبات حتى الآن.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
