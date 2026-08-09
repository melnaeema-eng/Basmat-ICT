import { useMemo, useState } from "react";
import {
  FaDownload,
  FaFile,
  FaMagnifyingGlass,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const initialDocuments = [];

export default function AdminDocuments() {
  const [documents, setDocuments] =
    useState(initialDocuments);
  const [searchTerm, setSearchTerm] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return documents;
    }

    return documents.filter((document) =>
      [
        document.original_name,
        document.document_type,
        document.request_no,
        document.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [documents, searchTerm]);

  async function loadDocuments() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        rfqResult,
        consultationResult,
      ] = await Promise.all([
        supabase
          .from("ict_rfq_requests")
          .select(
            "request_no, attachments, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("ict_consultation_requests")
          .select(
            "request_no, attachments, created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const firstError =
        rfqResult.error ||
        consultationResult.error;

      if (firstError) {
        throw firstError;
      }

      const rfqDocuments = flattenDocuments(
        rfqResult.data,
        "عرض سعر"
      );

      const consultationDocuments =
        flattenDocuments(
          consultationResult.data,
          "استشارة"
        );

      setDocuments([
        ...rfqDocuments,
        ...consultationDocuments,
      ]);
    } catch (error) {
      console.error(
        "خطأ في تحميل المستندات:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر تحميل المستندات."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              مركز المستندات
            </h1>

            <p className="mt-3 text-slate-600">
              عرض جميع مرفقات عروض الأسعار والاستشارات في مكان واحد.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="rounded-xl bg-[#123878] px-6 py-3 font-black text-white transition hover:bg-[#0d2d69] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "جارٍ التحميل..."
              : "تحميل المستندات"}
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
              placeholder="ابحث باسم الملف أو نوعه أو رقم الطلب"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8">
          {filteredDocuments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              اضغط «تحميل المستندات» لعرض المرفقات.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map(
                (document, index) => (
                  <DocumentCard
                    key={`${document.storage_path}-${index}`}
                    document={document}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function flattenDocuments(rows, source) {
  return (rows || []).flatMap((row) => {
    const attachments = Array.isArray(
      row.attachments
    )
      ? row.attachments
      : [];

    return attachments.map((attachment) => ({
      ...attachment,
      source,
      request_no: row.request_no,
      request_created_at: row.created_at,
    }));
  });
}

function DocumentCard({ document }) {
  async function downloadFile() {
    try {
      const { data, error } =
        await supabase.storage
          .from("engineering-documents")
          .download(document.storage_path);

      if (error) {
        throw error;
      }

      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download =
        document.original_name || "document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(
        "تعذر تنزيل المرفق:",
        error
      );

      window.alert(
        error.message ||
          "تعذر تنزيل المرفق."
      );
    }
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
        <FaFile />
      </div>

      <h2 className="mt-5 truncate text-xl font-black text-[#071d49]">
        {document.original_name || "مرفق"}
      </h2>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>
          <strong>المصدر:</strong>{" "}
          {document.source}
        </p>

        <p dir="ltr">
          <strong>رقم الطلب:</strong>{" "}
          {document.request_no}
        </p>

        <p>
          <strong>النوع:</strong>{" "}
          {document.document_type || "عام"}
        </p>

        <p>
          <strong>الحجم:</strong>{" "}
          {formatFileSize(document.size)}
        </p>
      </div>

      <button
        type="button"
        onClick={downloadFile}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white transition hover:bg-[#0d2d69]"
      >
        <FaDownload />
        تنزيل الملف
      </button>
    </article>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) {
    return "حجم غير معروف";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
