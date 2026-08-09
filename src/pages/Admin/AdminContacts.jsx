import { useEffect, useMemo, useState } from "react";
import {
  FaEnvelope,
  FaMagnifyingGlass,
  FaPhone,
  FaRotate,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const statusLabels = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  completed: "مكتمل",
};

export default function AdminContacts() {
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("ict_contact_messages")
        .select(
          `
            id,
            full_name,
            company,
            phone,
            email,
            service,
            message,
            status,
            created_at
          `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setMessages(data || []);
    } catch (error) {
      console.error(
        "خطأ في تحميل رسائل التواصل:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر تحميل رسائل التواصل."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredMessages = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return messages;
    }

    return messages.filter((message) => {
      const searchableText = [
        message.full_name,
        message.company,
        message.phone,
        message.email,
        message.service,
        message.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [messages, searchTerm]);

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              رسائل التواصل
            </h1>

            <p className="mt-3 text-slate-600">
              عرض الرسائل الواردة من نموذج التواصل في الموقع.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMessages}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white transition hover:bg-[#0d2d69] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaRotate />
            {loading ? "جارٍ التحديث..." : "تحديث"}
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <FaMagnifyingGlass className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="ابحث بالاسم أو الشركة أو البريد أو رقم الجوال"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-5">
          {loading ? (
            <EmptyState text="جارٍ تحميل الرسائل..." />
          ) : filteredMessages.length === 0 ? (
            <EmptyState text="لا توجد رسائل مطابقة." />
          ) : (
            filteredMessages.map((message) => (
              <article
                key={message.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[#071d49]">
                      {message.full_name}
                    </h2>

                    <p className="mt-1 text-slate-500">
                      {message.company ||
                        "بدون اسم شركة"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">
                    {statusLabels[message.status] ||
                      message.status ||
                      "جديد"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoItem
                    icon={<FaPhone />}
                    label="الجوال"
                    value={message.phone}
                    href={`tel:${message.phone}`}
                  />

                  <InfoItem
                    icon={<FaEnvelope />}
                    label="البريد"
                    value={message.email}
                    href={`mailto:${message.email}`}
                  />

                  <InfoItem
                    label="الخدمة"
                    value={message.service}
                  />

                  <InfoItem
                    label="التاريخ"
                    value={formatDate(
                      message.created_at
                    )}
                  />
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-bold text-slate-500">
                    نص الرسالة
                  </p>

                  <p className="mt-3 whitespace-pre-wrap leading-8 text-slate-700">
                    {message.message}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
      {text}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  href,
}) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words font-black text-[#071d49]">
        {value || "—"}
      </p>
    </div>
  );

  return href ? (
    <a
      href={href}
      className="block transition hover:-translate-y-1"
    >
      {content}
    </a>
  ) : (
    content
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
