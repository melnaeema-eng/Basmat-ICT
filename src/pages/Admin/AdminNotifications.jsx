import { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheck, FaCircleCheck, FaCircleXmark, FaRotate } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setErrorMessage("");
      const { data, error } = await supabase
        .from("ict_admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    const { error } = await supabase
      .from("ict_admin_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return setErrorMessage(error.message);

    setNotifications((current) =>
      current.map((item) => item.id === id ? { ...item, is_read: true } : item)
    );
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]"><FaBell />الإشعارات</h1>
            <p className="mt-3 text-slate-600">القرارات والإجراءات المهمة في رحلة العميل.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-orange-100 px-4 py-2 font-black text-orange-800">غير مقروء: {unreadCount}</span>
            <button onClick={loadNotifications} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-60"><FaRotate />تحديث</button>
          </div>
        </div>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 space-y-4">
          {notifications.map((item) => {
            const accepted = item.notification_type === "quotation_accepted";
            return (
              <article key={item.id} className={["rounded-3xl border p-6 shadow-sm", item.is_read ? "border-slate-200 bg-white" : accepted ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"].join(" ")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl", accepted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"].join(" ")}>
                      {accepted ? <FaCircleCheck /> : <FaCircleXmark />}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#071d49]">{item.title}</h2>
                      <p className="mt-2 leading-7 text-slate-600">{item.message}</p>
                      <p className="mt-3 text-xs text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.action_url && (
                      <Link to={item.action_url} onClick={() => markRead(item.id)} className={["rounded-xl px-4 py-3 font-black text-white", accepted ? "bg-green-600" : "bg-[#071d49]"].join(" ")}>
                        {accepted ? "مراجعة وتحويل إلى مشروع" : "فتح عرض السعر"}
                      </Link>
                    )}
                    {!item.is_read && (
                      <button type="button" onClick={() => markRead(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-700"><FaCheck />تحديد كمقروء</button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && !notifications.length && <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">لا توجد إشعارات حتى الآن.</div>}
        </div>
      </div>
    </div>
  );
}
