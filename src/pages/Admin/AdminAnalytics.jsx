import { useEffect, useState } from "react";
import {
  FaChartColumn,
  FaFileInvoiceDollar,
  FaMoneyBillTrendUp,
  FaUserTie,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

export default function AdminAnalytics() {
  const [data, setData] = useState({
    rfqs: [],
    consultations: [],
    quotations: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setErrorMessage("");

    const [
      rfqResult,
      consultationResult,
      quotationResult,
    ] = await Promise.all([
      supabase
        .from("ict_rfq_requests")
        .select("id, status, created_at"),
      supabase
        .from(
          "ict_consultation_requests"
        )
        .select("id, status, created_at"),
      supabase
        .from("ict_quotations")
        .select(
          "id, status, total_amount, created_at"
        ),
    ]);

    const error =
      rfqResult.error ||
      consultationResult.error ||
      quotationResult.error;

    if (error) {
      setErrorMessage(error.message);
    } else {
      setData({
        rfqs: rfqResult.data || [],
        consultations:
          consultationResult.data || [],
        quotations:
          quotationResult.data || [],
      });
    }

    setLoading(false);
  }

  const quoteTotal = data.quotations.reduce(
    (sum, quote) =>
      sum + Number(quote.total_amount || 0),
    0
  );

  const acceptedTotal =
    data.quotations
      .filter(
        (quote) =>
          quote.status === "accepted"
      )
      .reduce(
        (sum, quote) =>
          sum +
          Number(
            quote.total_amount || 0
          ),
        0
      );

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          التحليلات
        </h1>

        <p className="mt-3 text-slate-600">
          مؤشرات المبيعات والطلبات والاستشارات.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<FaChartColumn />}
            label="طلبات RFQ"
            value={
              loading ? "..." : data.rfqs.length
            }
          />

          <Metric
            icon={<FaUserTie />}
            label="الاستشارات"
            value={
              loading
                ? "..."
                : data.consultations.length
            }
          />

          <Metric
            icon={
              <FaFileInvoiceDollar />
            }
            label="عروض الأسعار"
            value={
              loading
                ? "..."
                : data.quotations.length
            }
          />

          <Metric
            icon={
              <FaMoneyBillTrendUp />
            }
            label="قيمة العروض"
            value={
              loading
                ? "..."
                : `${formatMoney(
                    quoteTotal
                  )} SAR`
            }
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <StatusPanel
            title="حالات RFQ"
            rows={countByStatus(data.rfqs)}
          />

          <StatusPanel
            title="حالات عروض الأسعار"
            rows={countByStatus(
              data.quotations
            )}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-7">
          <p className="text-sm font-bold text-green-700">
            قيمة العروض المقبولة
          </p>

          <p
            dir="ltr"
            className="mt-3 text-4xl font-black text-green-900"
          >
            {formatMoney(acceptedTotal)} SAR
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
        {icon}
      </div>

      <p className="mt-5 font-bold text-slate-500">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-2 text-right text-3xl font-black text-[#071d49]"
      >
        {value}
      </p>
    </article>
  );
}

function StatusPanel({ title, rows }) {
  const total = rows.reduce(
    (sum, row) => sum + row.count,
    0
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#071d49]">
        {title}
      </h2>

      <div className="mt-6 space-y-5">
        {rows.map((row) => {
          const percent = total
            ? Math.round(
                (row.count / total) * 100
              )
            : 0;

          return (
            <div key={row.status}>
              <div className="flex justify-between gap-4">
                <span className="font-bold text-slate-700">
                  {statusLabel(
                    row.status
                  )}
                </span>

                <span className="font-black text-[#071d49]">
                  {row.count}
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${percent}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function countByStatus(rows) {
  const counts = {};

  rows.forEach((row) => {
    const status = row.status || "unknown";
    counts[status] =
      (counts[status] || 0) + 1;
  });

  return Object.entries(counts).map(
    ([status, count]) => ({
      status,
      count,
    })
  );
}

function statusLabel(status) {
  const labels = {
    new: "جديد",
    reviewing: "قيد المراجعة",
    waiting_customer: "بانتظار العميل",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    cancelled: "ملغي",
    draft: "مسودة",
    sent: "تم الإرسال",
    accepted: "مقبول",
    rejected: "مرفوض",
    expired: "منتهي",
  };

  return labels[status] || status;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}
