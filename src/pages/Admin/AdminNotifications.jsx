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
  const [announcements, setAnnouncements] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "", message: "", target_type: "all", target_role: "",
    priority: "normal", expires_at: "", send_email: false,
  });

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    setLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("ict_admin_notifications").select("*").order("created_at", { ascending: false }).limit(250);
    if (error) setErrorMessage(error.message); else setNotifications(data || []);
    const { data: announcementData, error: announcementError } = await supabase
      .from("ict_announcement_inbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (announcementError) setErrorMessage(announcementError.message);
    else setAnnouncements(announcementData || []);
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

  async function publishAnnouncement(event) {
    event.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      return setErrorMessage("عنوان الإعلان ومحتواه مطلوبان.");
    }
    setPublishing(true); setErrorMessage("");
    const { data, error } = await supabase.rpc("ict_publish_announcement", {
      p_title: announcementForm.title.trim(),
      p_message: announcementForm.message.trim(),
      p_target_type: announcementForm.target_type,
      p_target_role: announcementForm.target_role || null,
      p_priority: announcementForm.priority,
      p_expires_at: announcementForm.expires_at || null,
      p_send_email: announcementForm.send_email,
    });
    if (error) { setPublishing(false); return setErrorMessage(error.message); }

    if (announcementForm.send_email && data?.announcement_id) {
      const { error: emailError } = await supabase.functions.invoke("send-global-announcement", {
        body: { announcement_id: data.announcement_id },
      });
      if (emailError) setErrorMessage("تم نشر الإعلان داخل النظام، لكن تعذر إرسال البريد: " + emailError.message);
    }
    setAnnouncementForm({ title:"", message:"", target_type:"all", target_role:"", priority:"normal", expires_at:"", send_email:false });
    setPublishing(false);
    await loadNotifications();
  }

  async function markAnnouncementRead(recipientId) {
    const { error } = await supabase.from("ict_announcement_recipients")
      .update({ is_read:true, read_at:new Date().toISOString() }).eq("id", recipientId);
    if (error) return setErrorMessage(error.message);
    setAnnouncements(rows => rows.map(row => row.recipient_id === recipientId ? {...row,is_read:true} : row));
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

        <form onSubmit={publishAnnouncement} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">نشر إعلان عام</h2>
          <p className="mt-2 text-sm text-slate-500">يمكن استهداف جميع الحسابات المسجلة في قاعدة البيانات أو الموظفين أو العملاء أو Role محدد.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input className="form-input" placeholder="عنوان الإعلان" value={announcementForm.title} onChange={e=>setAnnouncementForm(x=>({...x,title:e.target.value}))}/>
            <select className="form-input" value={announcementForm.target_type} onChange={e=>setAnnouncementForm(x=>({...x,target_type:e.target.value}))}>
              <option value="all">جميع المسجلين بالداتابيز</option><option value="employees">الموظفون والإدارة</option><option value="customers">العملاء</option><option value="role">Role محدد</option>
            </select>
            {announcementForm.target_type==="role" && <select className="form-input" value={announcementForm.target_role} onChange={e=>setAnnouncementForm(x=>({...x,target_role:e.target.value}))}>
              <option value="">اختر Role</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="sales">Sales</option><option value="engineer">Engineer</option><option value="support">Support</option><option value="hr">HR</option><option value="finance">Finance</option><option value="it">IT</option>
            </select>}
            <select className="form-input" value={announcementForm.priority} onChange={e=>setAnnouncementForm(x=>({...x,priority:e.target.value}))}><option value="normal">عادي</option><option value="important">مهم</option></select>
            <input className="form-input" type="datetime-local" value={announcementForm.expires_at} onChange={e=>setAnnouncementForm(x=>({...x,expires_at:e.target.value}))}/>
            <label className="flex items-center gap-3 rounded-xl border p-3 font-bold"><input type="checkbox" checked={announcementForm.send_email} onChange={e=>setAnnouncementForm(x=>({...x,send_email:e.target.checked}))}/>داخل النظام + Email</label>
            <textarea className="form-input min-h-28 md:col-span-2" placeholder="محتوى الإعلان" value={announcementForm.message} onChange={e=>setAnnouncementForm(x=>({...x,message:e.target.value}))}/>
          </div>
          <button disabled={publishing} className="mt-4 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white">{publishing?"جارٍ النشر...":"نشر الإعلان"}</button>
        </form>

        {announcements.length>0 && <section className="mt-8">
          <h2 className="text-2xl font-black text-[#071d49]">الإعلانات الموجهة لك</h2>
          <div className="mt-4 space-y-3">{announcements.map(item=><article key={item.recipient_id} className={["rounded-2xl border p-5",item.priority==="important"?"border-orange-300 bg-orange-50":"border-slate-200 bg-white"].join(" ")}>
            <div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-[#071d49]">{item.title}</h3><p className="mt-2 text-slate-600">{item.message}</p></div>{!item.is_read&&<button onClick={()=>markAnnouncementRead(item.recipient_id)} className="rounded-xl border bg-white px-3 py-2 font-bold">مقروء</button>}</div>
          </article>)}</div>
        </section>}

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
