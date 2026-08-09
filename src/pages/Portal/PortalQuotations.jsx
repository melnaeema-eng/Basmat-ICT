import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function PortalQuotations() {
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from("ict_quotations")
      .select("id,quotation_no,subject,total_amount,currency,status,created_at")
      .order("created_at", { ascending: false });

    if (error) setErrorMessage(error.message);
    else setRows(data || []);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">عروض الأسعار</h1>
        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p dir="ltr" className="text-right font-black text-blue-700">{row.quotation_no}</p>
              <h2 className="mt-2 text-xl font-black text-[#071d49]">{row.subject || "عرض سعر"}</h2>
              <p className="mt-2 text-sm text-slate-500">الحالة: {row.status}</p>
              <p dir="ltr" className="mt-5 text-right text-2xl font-black text-[#071d49]">
                {Number(row.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} {row.currency}
              </p>
              <Link to={`/portal/quotations/${row.id}`}
                className="mt-5 inline-block rounded-xl bg-[#123878] px-5 py-3 font-black text-white">
                فتح العرض
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
