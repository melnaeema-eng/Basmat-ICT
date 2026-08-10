import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminWorkflowCenter() {
  const [quotations, setQuotations] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [q, n] = await Promise.all([
      supabase
        .from("ict_quotations")
        .select("id,quotation_no,customer_id,customer_name,company_name,subject,total_amount,status,rfq_id,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_nda_requests")
        .select("id,nda_no,request_no,recipient_name,recipient_email,status,source_type,created_at")
        .order("created_at", { ascending: false }),
    ]);

    const error = q.error || n.error;
    if (error) return setMessage(error.message);

    setQuotations(q.data || []);
    setNdas(n.data || []);
  }

  async function convertToProject(quotationId) {
    setMessage("");

    const { data: projectId, error } = await supabase.rpc(
      "convert_quotation_to_project",
      { p_quotation_id: quotationId }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("تم تحويل العرض المقبول إلى مشروع تشغيلي.");
    window.location.href = `/admin/project-commercial?project=${projectId}`;
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          مركز سير العمل
        </h1>
        <p className="mt-3 text-slate-600">
          NDA → عرض السعر → قبول العميل → تحويل إلى مشروع.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-blue-800">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">
            عروض الأسعار المقبولة
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {quotations
              .filter((q) => q.status === "accepted")
              .map((q) => (
                <article key={q.id} className="rounded-2xl bg-slate-50 p-5">
                  <p dir="ltr" className="text-right font-black text-blue-700">
                    {q.quotation_no}
                  </p>
                  <h3 className="mt-2 text-xl font-black">{q.subject || "عرض سعر"}</h3>
                  <p className="mt-2 text-slate-500">
                    {q.company_name || q.customer_name}
                  </p>
                  <p dir="ltr" className="mt-3 text-right text-xl font-black">
                    {Number(q.total_amount || 0).toLocaleString()} SAR
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/admin/quotations/${q.id}`}
                      className="rounded-xl border border-slate-300 px-4 py-2 font-black">
                      فتح العرض
                    </Link>

                    <button onClick={() => convertToProject(q.id)}
                      className="rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white">
                      تحويل إلى مشروع
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">NDA</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ndas.map((n) => (
              <article key={n.id} className="rounded-2xl bg-slate-50 p-4">
                <p dir="ltr" className="text-right font-black text-blue-700">{n.nda_no}</p>
                <p className="mt-2 font-black">{n.request_no}</p>
                <p className="mt-2 text-sm text-slate-500">{n.recipient_email}</p>
                <p className="mt-3 font-black">الحالة: {n.status}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
