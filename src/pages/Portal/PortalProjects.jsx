import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PortalProjects() {
  const [rows, setRows] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from("ict_delivery_projects")
      .select("id,project_no,project_name,status,progress,start_date,target_end_date,scope")
      .order("created_at", { ascending: false });

    if (error) setErrorMessage(error.message);
    else setRows(data || []);
  }

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">المشاريع</h1>
        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p dir="ltr" className="text-right text-sm font-black text-blue-700">{row.project_no}</p>
              <h2 className="mt-2 text-2xl font-black text-[#071d49]">{row.project_name}</h2>
              <p className="mt-3 text-slate-500">الحالة: {row.status}</p>

              <div className="mt-5">
                <div className="flex justify-between font-bold"><span>الإنجاز</span><span>{row.progress}%</span></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-[#ff7417]" style={{ width: `${row.progress}%` }} />
                </div>
              </div>

              {row.scope && <p className="mt-5 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">{row.scope}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
