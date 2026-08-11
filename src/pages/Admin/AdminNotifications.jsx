import { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheck, FaRotate } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const filters = [
  ["all", "الكل"], ["unread", "غير مقروء"], ["action", "يتطلب إجراء"],
  ["sales", "المبيعات"], ["projects", "المشاريع"], ["finance", "المالية"], ["support", "الدعم"],
];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("ict_admin_notifications").select("*").order("created_at", { ascending: false }).limit(250);
    if (error) setErrorMessage(error.message); else setNotifications(data || []);
    setLoading(false);
  }

  async function markRead(id) {
    const { error } = await supabase.from("ict_admin_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    if (error) return setErrorMessage(error.message);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  async function markAllRead() {
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    const { error } = await supabase.from("ict_admin_notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", ids);
    if (error) return setErrorMessage(error.message);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  async function runAction(item) {
    const { error } = await supabase.from("ict_admin_notifications").update({
      is_read: true,
      read_at: item.read_at || new Date().toISOString(),
      action_completed: true,
      action_completed_at: new Date().toISOString(),
    }).eq("id", item.id);
    if (error) return setErrorMessage(error.message);
    setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, is_read: true, action_completed: true } : row));
    if (item.action_url) navigate(item.action_url);
  }

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const actionCount = useMemo(() => notifications.filter((item) => item.action_url && !item.action_completed).length, [notifications]);
  const visible = useMemo(() => notifications.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.is_read;
    if (filter === "action") return item.action_url && !item.action_completed;
    return item.category === filter;
  }), [notifications, filter]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]"><FaBell />مركز الإشعارات</h1>
            <p className="mt-3 text-slate-600">كل حركات العملاء والمبيعات والمشاريع والمالية والدعم في مكان واحد.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-100 px-4 py-3 font-black text-orange-800">غير مقروء: {unreadCount}</span>
            <span className="rounded-full bg-blue-100 px-4 py-3 font-black text-blue-800">إجراء مطلوب: {actionCount}</span>
            <button onClick={markAllRead} className="rounded-xl border bg-white px-4 py-3 font-black text-slate-700"><FaCheck className="ml-2 inline" />قراءة الكل</button>
            <button onClick={loadNotifications} disabled={loading} className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white"><FaRotate className="ml-2 inline" />تحديث</button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={["rounded-full px-4 py-2 font-black", filter === value ? "bg-[#ff7417] text-white" : "bg-white text-slate-600"].join(" ")}>{label}</button>)}
        </div>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 space-y-4">
          {visible.map((item) => (
            <article key={item.id} className={["rounded-3xl border p-6 shadow-sm", item.is_read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50"].join(" ")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {!item.is_read && <span className="h-3 w-3 rounded-full bg-orange-500" />}
                    <h2 className="text-xl font-black text-[#071d49]">{item.title}</h2>
                  </div>
                  {item.message && <p className="mt-2 leading-7 text-slate-600">{item.message}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400"><span>{item.category || "general"}</span><span>•</span><span>{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.action_url && !item.action_completed && <button onClick={() => runAction(item)} className="rounded-xl bg-[#071d49] px-4 py-3 font-black text-white">تنفيذ الإجراء</button>}
                  {!item.is_read && <button onClick={() => markRead(item.id)} className="rounded-xl border bg-white px-4 py-3 font-black text-slate-700">مقروء</button>}
                </div>
              </div>
            </article>
          ))}
          {!loading && !visible.length && <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">لا توجد إشعارات في هذا القسم.</div>}
        </div>
      </div>
    </div>
  );
}
