import { useEffect, useMemo, useState } from "react";
import {
  FaFileInvoiceDollar,
  FaMagnifyingGlass,
  FaPlus,
  FaRotate,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const statusLabels = {
  draft: "مسودة",
  sent: "تم الإرسال",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي",
  cancelled: "ملغي",
};

export default function AdminQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadQuotations();
  }, []);

  async function loadQuotations() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("ict_quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuotations(data || []);
    } catch (error) {
      setErrorMessage(
        error.message || "تعذر تحميل عروض الأسعار."
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return quotations;

    return quotations.filter((quote) =>
      [
        quote.quotation_no,
        quote.customer_name,
        quote.company_name,
        quote.customer_email,
        quote.subject,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [quotations, searchTerm]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              عروض الأسعار
            </h1>
            <p className="mt-3 text-slate-600">
              إنشاء ومتابعة عروض الأسعار للعملاء.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadQuotations}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              <FaRotate />
              تحديث
            </button>

            <Link
              to="/admin/quotations/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white"
            >
              <FaPlus />
              عرض سعر جديد
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <FaMagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="ابحث برقم العرض أو العميل أو الشركة"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {loading ? (
            <Empty text="جارٍ تحميل عروض الأسعار..." />
          ) : filtered.length === 0 ? (
            <Empty text="لا توجد عروض أسعار." />
          ) : (
            filtered.map((quote) => (
              <article
                key={quote.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <FaFileInvoiceDollar className="text-2xl text-blue-700" />
                      <h2
                        dir="ltr"
                        className="text-2xl font-black text-[#071d49]"
                      >
                        {quote.quotation_no}
                      </h2>
                    </div>

                    <p className="mt-3 font-bold text-slate-700">
                      {quote.company_name ||
                        quote.customer_name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {quote.subject || "عرض سعر"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">
                    {statusLabels[quote.status] ||
                      quote.status}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Info
                    label="الإجمالي"
                    value={`${formatMoney(
                      quote.total_amount
                    )} ${quote.currency}`}
                  />
                  <Info
                    label="التاريخ"
                    value={formatDate(
                      quote.created_at
                    )}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    to={`/admin/quotations/${quote.id}`}
                    className="rounded-xl bg-[#123878] px-5 py-3 font-black text-white"
                  >
                    فتح العرض
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-black text-[#071d49]">
        {value}
      </p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
      {text}
    </div>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}
