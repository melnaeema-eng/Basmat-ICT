import { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheck, FaRotate } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const filters = [
  ["all", "الكل"],
  ["unread", "غير مقروء"],
  ["sales", "العروض"],
  ["projects", "المشاريع"],
  ["finance", "المالية"],
  ["support", "الدعم"],
];

export default function PortalNotifications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("ict_customer_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setErrorMessage(error.message);
    else setRows(data || []);
    const { data: announcementData, error: announcementError } = await supabase.from("ict_announcement_inbox").select("*").order("created_at",{ascending:false}).limit(100);
    if (announcementError) setErrorMessage(announcementError.message); else setAnnouncements(announcementData || []);
    setLoading(false);
  }

  async function markRead(id) {
    const { error } = await supabase
      .from("ict_customer_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return setErrorMessage(error.message);
    setRows((current) => current.map((row) => row.id === id ? { ...row, is_read: true } : row));
  }

  async function openNotification(item) {
    if (!item.is_read) await markRead(item.id);
    if (item.action_url) navigate(item.action_url);
  }

  async function markAllRead() {
    const unreadIds = rows.filter((row) => !row.is_read).map((row) => row.id);
    if (!unreadIds.length) return;
    const { error } = await supabase
      .from("ict_customer_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);
    if (error) return setErrorMessage(error.message);
    setRows((current) => current.map((row) => ({ ...row, is_read: true })));
  }

  async function markAnnouncementRead(recipientId) {
    const { error } = await supabase.from("ict_announcement_recipients").update({is_read:true,read_at:new Date().toISOString()}).eq("id",recipientId);
    if (error) return setErrorMessage(error.message);
    setAnnouncements(current=>current.map(row=>row.recipient_id===recipientId?{...row,is_read:true}:row));
  }

  const unread = useMemo(() => rows.filter((row) => !row.is_read).length, [rows]);
  const visible = useMemo(() => rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "unread") return !row.is_read;
    return row.category === filter;
  }), [rows, filter]);

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]"><FaBell />الإشعارات</h1>
            <p className="mt-3 text-slate-600">آخر التحديثات على عروض الأسعار والمشاريع والفواتير والدعم.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-100 px-4 py-3 font-black text-orange-800">غير مقروء: {unread}</span>
            <button onClick={markAllRead} className="rounded-xl border bg-white px-4 py-3 font-black text-slate-700"><FaCheck className="ml-2 inline" />قراءة الكل</button>
            <button onClick={load} disabled={loading} className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white"><FaRotate className="ml-2 inline" />تحديث</button>
          </div>
        </div>

        {announcements.length>0 && <section className="mt-6 space-y-3">
          {announcements.map(item=><article key={item.recipient_id} className={["rounded-2xl border p-5 shadow-sm",item.priority==="important"?"border-orange-300 bg-orange-50":"border-blue-200 bg-blue-50"].join(" ")}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-xs font-black text-[#ff7417]">إعلان</span><h2 className="mt-1 text-xl font-black text-[#071d49]">{item.title}</h2><p className="mt-2 leading-7 text-slate-600">{item.message}</p></div>{!item.is_read&&<button onClick={()=>markAnnouncementRead(item.recipient_id)} className="rounded-xl bg-white px-4 py-2 font-black text-slate-700">مقروء</button>}</div>
          </article>)}
        </section>}

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={["rounded-full px-4 py-2 font-black", filter === value ? "bg-[#ff7417] text-white" : "bg-white text-slate-600"].join(" ")}>{label}</button>
          ))}
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
                  <p className="mt-3 text-xs text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p>
                </div>
                <div className="flex gap-2">
                  {item.action_url && <button onClick={() => openNotification(item)} className="rounded-xl bg-[#071d49] px-4 py-3 font-black text-white">فتح</button>}
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
