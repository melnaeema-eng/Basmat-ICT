import { useEffect, useState } from "react";
import {
  FaBell,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaGift,
  FaHeadset,
  FaTriangleExclamation,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import StatCard from "../../components/admin/StatCard";
import { supabase } from "../../lib/supabase";

const initialCounts = {
  contacts: 0,
  quotes: 0,
  consultations: 0,
  openTickets: 0,
  urgentTickets: 0,
  unreadNotifications: 0,
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState(initialCounts);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        contactsResult,
        quotesResult,
        consultationsResult,
        openTicketsResult,
        urgentTicketsResult,
        unreadResult,
        activityResult,
      ] = await Promise.all([
        supabase.from("ict_contact_messages").select("*", { count: "exact", head: true }),
        supabase.from("ict_rfq_requests").select("*", { count: "exact", head: true }),
        supabase.from("ict_consultation_requests").select("*", { count: "exact", head: true }),
        supabase.from("ict_support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress", "waiting_customer"]),
        supabase.from("ict_support_tickets").select("*", { count: "exact", head: true }).eq("priority", "urgent").not("status", "in", '("resolved","closed")'),
        supabase.from("ict_admin_notifications").select("*", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("ict_admin_notifications").select("id,notification_type,title,message,action_url,is_read,created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const firstError =
        contactsResult.error ||
        quotesResult.error ||
        consultationsResult.error ||
        openTicketsResult.error ||
        urgentTicketsResult.error ||
        unreadResult.error ||
        activityResult.error;

      if (firstError) throw firstError;

      setCounts({
        contacts: contactsResult.count || 0,
        quotes: quotesResult.count || 0,
        consultations: consultationsResult.count || 0,
        openTickets: openTicketsResult.count || 0,
        urgentTickets: urgentTicketsResult.count || 0,
        unreadNotifications: unreadResult.count || 0,
      });
      setRecentActivity(activityResult.data || []);
    } catch (error) {
      console.error("خطأ في تحميل بيانات لوحة الإدارة:", error);
      setErrorMessage(error.message || "تعذر تحميل بيانات لوحة الإدارة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-[#041632] p-8 text-white shadow-xl">
          <span className="font-bold tracking-wider text-cyan-300">ADMIN DASHBOARD</span>
          <h1 className="mt-3 text-4xl font-black">لوحة إدارة بصمة النوابغ</h1>
          <p className="mt-4 max-w-3xl leading-8 text-blue-100">متابعة الطلبات وحركة العملاء والدعم والإشعارات من مكان واحد.</p>
        </section>

        {errorMessage && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{errorMessage}</div>}

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={<FaEnvelope />} title="رسائل التواصل" value={counts.contacts} loading={loading} />
          <StatCard icon={<FaFileInvoiceDollar />} title="طلبات عروض الأسعار" value={counts.quotes} loading={loading} />
          <StatCard icon={<FaGift />} title="طلبات الاستشارات" value={counts.consultations} loading={loading} />
          <StatCard icon={<FaHeadset />} title="طلبات الدعم المفتوحة" value={counts.openTickets} loading={loading} />
          <StatCard icon={<FaTriangleExclamation />} title="طلبات الدعم العاجلة" value={counts.urgentTickets} loading={loading} />
          <StatCard icon={<FaBell />} title="إشعارات غير مقروءة" value={counts.unreadNotifications} loading={loading} />
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <QuickLink to="/admin/support" title="الدعم الفني" text="متابعة التذاكر والردود والمرفقات." />
          <QuickLink to="/admin/notifications" title="الإشعارات" text="مراجعة أحدث حركات العملاء." />
          <QuickLink to="/admin/rfqs" title="طلبات عرض السعر" text="متابعة طلبات الأفراد والشركات." />
          <QuickLink to="/admin/consultations" title="طلبات الاستشارات" text="متابعة الاستشارات والمرفقات." />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#071d49]">آخر الحركات</h2>
              <p className="mt-2 text-slate-600">أحدث إشعارات العملاء والدعم.</p>
            </div>
            <Link to="/admin/notifications" className="rounded-xl bg-[#123878] px-5 py-3 font-black text-white">كل الإشعارات</Link>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <Link key={item.id} to={item.action_url || "/admin/notifications"} className="flex items-start justify-between gap-4 py-4 transition hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    {!item.is_read && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                    <h3 className="font-black text-[#071d49]">{item.title}</h3>
                  </div>
                  {item.message && <p className="mt-1 text-sm text-slate-600">{item.message}</p>}
                </div>
                <time className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time>
              </Link>
            ))}
            {!loading && !recentActivity.length && <div className="py-8 text-center text-slate-500">لا توجد حركات حتى الآن.</div>}
          </div>
        </section>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#071d49]">حالة الاتصال بقاعدة البيانات</h2>
              <p className="mt-2 text-slate-600">الأرقام والحركات أعلاه تُقرأ مباشرة من Supabase.</p>
            </div>
            <button type="button" onClick={loadCounts} disabled={loading} className="rounded-xl bg-[#123878] px-6 py-3 font-black text-white disabled:opacity-60">
              {loading ? "جارٍ التحميل..." : "تحديث البيانات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, title, text }) {
  return (
    <Link to={to} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <h3 className="text-xl font-black text-[#071d49]">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </Link>
  );
}
