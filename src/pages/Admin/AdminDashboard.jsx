import { useEffect, useState } from "react";
import {
  FaEnvelope,
  FaFileInvoiceDollar,
  FaGift,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import StatCard from "../../components/admin/StatCard";
import { supabase } from "../../lib/supabase";

const initialCounts = {
  contacts: 0,
  quotes: 0,
  consultations: 0,
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState(initialCounts);
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
      ] = await Promise.all([
        supabase
          .from("ict_contact_messages")
          .select("*", {
            count: "exact",
            head: true,
          }),
        supabase
          .from("ict_rfq_requests")
          .select("*", {
            count: "exact",
            head: true,
          }),
        supabase
          .from("ict_consultation_requests")
          .select("*", {
            count: "exact",
            head: true,
          }),
      ]);

      const firstError =
        contactsResult.error ||
        quotesResult.error ||
        consultationsResult.error;

      if (firstError) {
        throw firstError;
      }

      setCounts({
        contacts: contactsResult.count || 0,
        quotes: quotesResult.count || 0,
        consultations:
          consultationsResult.count || 0,
      });
    } catch (error) {
      console.error(
        "خطأ في تحميل بيانات لوحة الإدارة:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر تحميل بيانات لوحة الإدارة."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-[#041632] p-8 text-white shadow-xl">
          <span className="font-bold tracking-wider text-cyan-300">
            ADMIN DASHBOARD
          </span>

          <h1 className="mt-3 text-4xl font-black">
            لوحة إدارة بصمة النوابغ
          </h1>

          <p className="mt-4 max-w-3xl leading-8 text-blue-100">
            متابعة رسائل التواصل وطلبات عروض الأسعار
            والاستشارات الواردة من الموقع.
          </p>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <StatCard
            icon={<FaEnvelope />}
            title="رسائل التواصل"
            value={counts.contacts}
            loading={loading}
          />

          <StatCard
            icon={<FaFileInvoiceDollar />}
            title="طلبات عروض الأسعار"
            value={counts.quotes}
            loading={loading}
          />

          <StatCard
            icon={<FaGift />}
            title="طلبات الاستشارات"
            value={counts.consultations}
            loading={loading}
          />
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <QuickLink
            to="/admin/contacts"
            title="رسائل التواصل"
            text="عرض الرسائل والاستفسارات الواردة."
          />

          <QuickLink
            to="/admin/rfqs"
            title="طلبات عرض السعر"
            text="متابعة طلبات الأفراد والشركات."
          />

          <QuickLink
            to="/admin/consultations"
            title="طلبات الاستشارات"
            text="متابعة الاستشارات المجانية والمرفقات."
          />
        </section>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#071d49]">
                حالة الاتصال بقاعدة البيانات
              </h2>

              <p className="mt-2 text-slate-600">
                تعرض هذه الصفحة الأعداد الحالية من جداول
                Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCounts}
              disabled={loading}
              className="rounded-xl bg-[#123878] px-6 py-3 font-black text-white transition hover:bg-[#0d2d69] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "جارٍ التحميل..."
                : "تحديث البيانات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, title, text }) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <h3 className="text-xl font-black text-[#071d49]">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        {text}
      </p>
    </Link>
  );
}
