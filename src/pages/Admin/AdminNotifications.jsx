import { useEffect, useState } from "react";
import {
  FaBell,
  FaCheck,
  FaRotate,
} from "react-icons/fa6";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";

export default function AdminNotifications() {
  const [notifications, setNotifications] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("ict_notifications")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  }

  async function markRead(id) {
    const { error } = await supabase
      .from("ict_notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        )
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              الإشعارات
            </h1>
            <p className="mt-3 text-slate-600">
              آخر الطلبات والأحداث داخل النظام.
            </p>
          </div>

          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
          >
            <FaRotate />
            تحديث
          </button>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={[
                "rounded-3xl border p-5 shadow-sm",
                item.is_read
                  ? "border-slate-200 bg-white"
                  : "border-blue-200 bg-blue-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <FaBell />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-[#071d49]">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-slate-600">
                      {item.message || "—"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(
                        item.created_at
                      )}
                    </p>

                    {entityLink(item) && (
                      <Link
                        to={entityLink(item)}
                        className="mt-3 inline-block font-bold text-blue-700"
                      >
                        فتح
                      </Link>
                    )}
                  </div>
                </div>

                {!item.is_read && (
                  <button
                    type="button"
                    onClick={() =>
                      markRead(item.id)
                    }
                    className="rounded-xl bg-green-100 p-3 text-green-700"
                    title="تعليم كمقروء"
                  >
                    <FaCheck />
                  </button>
                )}
              </div>
            </article>
          ))}

          {!loading &&
            notifications.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                لا توجد إشعارات.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function entityLink(item) {
  if (item.entity_type === "rfq") {
    return "/admin/rfqs";
  }

  if (
    item.entity_type === "consultation"
  ) {
    return "/admin/consultations";
  }

  if (
    item.entity_type === "quotation"
  ) {
    return `/admin/quotations/${item.entity_id}`;
  }

  return "";
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
