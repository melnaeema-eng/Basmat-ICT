import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminActivityLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("ict_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  }

  return (
    <div dir="rtl" className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-[#071d49]">سجل النشاط</h1>
            <p className="mt-2 text-slate-600">
              دخول وخروج الموظفين والعمليات المهمة داخل النظام.
            </p>
          </div>
          <button onClick={load} className="rounded-xl bg-[#071d49] px-4 py-2 font-bold text-white">
            تحديث
          </button>
        </div>

        {error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-right">الوقت</th>
                <th className="p-3 text-right">المستخدم</th>
                <th className="p-3 text-right">العملية</th>
                <th className="p-3 text-right">القسم</th>
                <th className="p-3 text-right">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center">جارٍ التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">لا توجد حركات مسجلة بعد.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="whitespace-nowrap p-3">{r.created_at ? new Date(r.created_at).toLocaleString("ar-SA") : "—"}</td>
                  <td className="p-3">{r.user_email || r.user_id || "—"}</td>
                  <td className="p-3 font-bold">{r.action || "—"}</td>
                  <td className="p-3">{r.module || "—"}</td>
                  <td className="max-w-md p-3 text-slate-600">{r.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
