import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const statusLabels = {
  planning: "التخطيط",
  active: "قيد التنفيذ",
  on_hold: "متوقف مؤقتًا",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function PortalProjects() {
  const [rows, setRows] =
    useState([]);
  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } =
      await supabase
        .from(
          "ict_delivery_projects"
        )
        .select(`
          id,
          project_no,
          project_name,
          status,
          progress,
          start_date,
          target_end_date,
          scope,
          contract_value,
          quotation:ict_quotations(
            id,
            quotation_no,
            subject
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      setErrorMessage(
        error.message
      );
    } else {
      setRows(data || []);
    }
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10"
    >
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          المشاريع
        </h1>

        <p className="mt-3 text-slate-600">
          متابعة المشاريع التي تم
          تحويل عروض أسعارها المقبولة
          إلى التنفيذ.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    dir="ltr"
                    className="text-right text-sm font-black text-blue-700"
                  >
                    {row.project_no}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#071d49]">
                    {row.project_name}
                  </h2>

                  {row.quotation
                    ?.quotation_no && (
                    <p
                      dir="ltr"
                      className="mt-2 text-right text-sm font-bold text-slate-500"
                    >
                      {
                        row.quotation
                          .quotation_no
                      }
                    </p>
                  )}
                </div>

                <span className="rounded-full bg-blue-100 px-4 py-2 font-black text-blue-800">
                  {statusLabels[
                    row.status
                  ] ||
                    row.status}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex justify-between font-bold">
                  <span>
                    الإنجاز
                  </span>
                  <span>
                    {row.progress}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-[#ff7417]"
                    style={{
                      width: `${row.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info
                  label="تاريخ البداية"
                  value={
                    row.start_date
                      ? formatDate(
                          row.start_date
                        )
                      : "لم يحدد بعد"
                  }
                />

                <Info
                  label="النهاية المستهدفة"
                  value={
                    row.target_end_date
                      ? formatDate(
                          row.target_end_date
                        )
                      : "لم تحدد بعد"
                  }
                />
              </div>

              {row.scope && (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">
                  {row.scope}
                </p>
              )}
            </article>
          ))}

          {!rows.length &&
            !errorMessage && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 lg:col-span-2">
                لا توجد مشاريع
                مرتبطة بحسابك حتى
                الآن.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}) {
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

function formatDate(value) {
  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      dateStyle: "medium",
    }
  ).format(new Date(value));
}
