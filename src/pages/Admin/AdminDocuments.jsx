import { useEffect, useMemo, useState } from "react";
import {
  FaDownload,
  FaFile,
  FaMagnifyingGlass,
  FaRotate,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [rfqResult, consultationResult] = await Promise.all([
        supabase
          .from("ict_rfq_requests")
          .select("request_no, attachments, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("ict_consultation_requests")
          .select("request_no, attachments, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (rfqResult.error) throw rfqResult.error;
      if (consultationResult.error) throw consultationResult.error;

      const allDocuments = [
        ...flattenDocuments(rfqResult.data, "عرض سعر"),
        ...flattenDocuments(consultationResult.data, "استشارة"),
      ].sort(
        (a, b) =>
          new Date(b.request_created_at || 0) -
          new Date(a.request_created_at || 0)
      );

      setDocuments(allDocuments);
    } catch (error) {
      console.error("خطأ تحميل المستندات:", error);
      setErrorMessage(
        error.message ||
          "تعذر تحميل المستندات من Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredDocuments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return documents;

    return documents.filter((item) =>
      [
        item.original_name,
        item.name,
        item.document_type,
        item.request_no,
        item.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [documents, searchTerm]);

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              مركز المستندات
            </h1>
            <p className="mt-3 text-slate-600">
              مرفقات عروض الأسعار والاستشارات.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white disabled:opacity-60"
          >
            <FaRotate />
            {loading ? "جارٍ التحميل..." : "تحديث المستندات"}
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <FaMagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الملف أو رقم الطلب"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <EmptyState text="جارٍ تحميل المستندات..." />
          ) : filteredDocuments.length === 0 ? (
            <EmptyState text="لا توجد مرفقات محفوظة في الطلبات الحالية." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((item, index) => (
                <DocumentCard
                  key={`${item.storage_path || item.path || index}-${index}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function flattenDocuments(rows, source) {
  return (rows || []).flatMap((row) => {
    let attachments = row.attachments;

    if (typeof attachments === "string") {
      try {
        attachments = JSON.parse(attachments);
      } catch {
        attachments = [];
      }
    }

    if (!Array.isArray(attachments)) {
      attachments = attachments ? [attachments] : [];
    }

    return attachments
      .filter(Boolean)
      .map((attachment) => {
        if (typeof attachment === "string") {
          return {
            storage_path: attachment,
            original_name:
              attachment.split("/").pop() || "مرفق",
            source,
            request_no: row.request_no,
            request_created_at: row.created_at,
          };
        }

        return {
          ...attachment,
          storage_path:
            attachment.storage_path ||
            attachment.path ||
            attachment.file_path ||
            null,
          original_name:
            attachment.original_name ||
            attachment.name ||
            attachment.file_name ||
            "مرفق",
          source,
          request_no: row.request_no,
          request_created_at: row.created_at,
        };
      })
      .filter((attachment) => attachment.storage_path);
  });
}

function DocumentCard({ item }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadFile() {
    setDownloading(true);

    try {
      const { data, error } = await supabase.storage
        .from("engineering-documents")
        .download(item.storage_path);

      if (error) throw error;

      const objectUrl = URL.createObjectURL(data);
      const anchor = window.document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = item.original_name || "document";
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("خطأ تنزيل المستند:", error);
      window.alert(
        error.message || "تعذر تنزيل المستند."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
        <FaFile />
      </div>

      <h2 className="mt-5 break-words text-xl font-black text-[#071d49]">
        {item.original_name}
      </h2>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p><strong>المصدر:</strong> {item.source}</p>
        <p><strong>رقم الطلب:</strong> {item.request_no || "—"}</p>
        <p><strong>نوع المستند:</strong> {item.document_type || "عام"}</p>
      </div>

      <button
        type="button"
        onClick={downloadFile}
        disabled={downloading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-60"
      >
        <FaDownload />
        {downloading ? "جارٍ التنزيل..." : "تنزيل الملف"}
      </button>
    </article>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
      {text}
    </div>
  );
}
