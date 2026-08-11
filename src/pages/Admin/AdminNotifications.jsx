import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheck,
  FaCircleCheck,
  FaCircleXmark,
  FaHeadset,
  FaPaperclip,
  FaReply,
  FaRotate,
} from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const supportTypes = new Set([
  "support_ticket_created",
  "support_customer_reply",
  "support_attachment_uploaded",
]);

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

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
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );
  }


  async function runAction(item) {
    const { error } = await supabase
      .from("ict_admin_notifications")
      .update({
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
        action_completed: true,
        action_completed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) return setErrorMessage(error.message);

    setNotifications((current) =>
      current.map((row) =>
        row.id === item.id
          ? { ...row, is_read: true, action_completed: true }
          : row
      )
    );

    if (item.action_url) navigate(item.action_url);
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  function iconFor(item) {
    if (item.notification_type === "support_attachment_uploaded") return <FaPaperclip />;
    if (item.notification_type === "support_customer_reply") return <FaReply />;
    if (item.notification_type === "support_ticket_created") return <FaHeadset />;
    if (item.notification_type === "quotation_accepted") return <FaCircleCheck />;
    return <FaCircleXmark />;
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black text-[#071d49]"><FaBell />الإشعارات</h1>
            <p className="mt-3 text-slate-600">القرارات وحركات العملاء وطلبات الدعم والمرفقات.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-orange-100 px-4 py-2 font-black text-orange-800">غير مقروء: {unreadCount}</span>
            <button onClick={loadNotifications} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-60"><FaRotate />تحديث</button>
          </div>
        </div>

        {errorMessage && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <div className="mt-8 space-y-4">
          {notifications.map((item) => {
            const isSupport = supportTypes.has(item.notification_type);
            const accepted = item.notification_type === "quotation_accepted";
            const accent = isSupport ? "border-blue-200 bg-blue-50" : accepted ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50";
            return (
              <article key={item.id} className={["rounded-3xl border p-6 shadow-sm", item.is_read ? "border-slate-200 bg-white" : accent].join(" ")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl", isSupport ? "bg-blue-100 text-blue-700" : accepted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"].join(" ")}>
                      {iconFor(item)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#071d49]">{item.title}</h2>
                      <p className="mt-2 leading-7 text-slate-600">{item.message}</p>
                      <p className="mt-3 text-xs text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.action_url && !item.action_completed && (
                      <button
                        type="button"
                        onClick={() => runAction(item)}
                        className="rounded-xl bg-[#071d49] px-4 py-3 font-black text-white"
                      >
                        {isSupport ? "فتح طلب الدعم" : accepted ? "مراجعة وتحويل إلى مشروع" : "فتح التفاصيل"}
                      </button>
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
