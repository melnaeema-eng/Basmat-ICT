import { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaDownload,
  FaEnvelope,
  FaFile,
  FaMagnifyingGlass,
  FaPhone,
  FaRotate,
  FaUser,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";
import RequestWorkflowPanel from "../../components/admin/RequestWorkflowPanel";

const statusOptions = [
  { value: "new", label: "جديد" },
  { value: "reviewing", label: "قيد المراجعة" },
  { value: "quoted", label: "تم إرسال العرض" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const statusStyles = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  quoted: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const customerTypeLabels = {
  individual: "فرد",
  company: "شركة أو جهة",
};

export default function AdminRFQs() {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] =
    useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("ict_rfq_requests")
        .select(
          `
            id,
            request_no,
            customer_type,
            full_name,
            company,
            phone,
            email,
            city,
            project_type,
            project_value,
            expected_start_date,
            project_description,
            attachments,
            nda_required,
            status,
            assigned_to,
            priority,
            internal_notes,
            workflow_updated_at,
            created_at
          `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setRequests(data || []);
    } catch (error) {
      console.error(
        "خطأ في تحميل طلبات عرض السعر:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر تحميل طلبات عرض السعر."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    setUpdatingId(id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("ict_rfq_requests")
        .update({ status })
        .eq("id", id);

      if (error) {
        throw error;
      }

      setRequests((current) =>
        current.map((request) =>
          request.id === id
            ? { ...request, status }
            : request
        )
      );
    } catch (error) {
      console.error(
        "خطأ في تحديث حالة الطلب:",
        error
      );

      setErrorMessage(
        error.message ||
          "تعذر تحديث حالة الطلب."
      );
    } finally {
      setUpdatingId("");
    }
  }

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          request.request_no,
          request.full_name,
          request.company,
          request.phone,
          request.email,
          request.city,
          request.project_type,
          request.project_description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      const matchesCustomerType =
        customerTypeFilter === "all" ||
        request.customer_type ===
          customerTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCustomerType
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
    customerTypeFilter,
  ]);

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="طلبات عروض الأسعار"
          description="متابعة طلبات الأفراد والشركات والمرفقات المرتبطة بها."
          loading={loading}
          onRefresh={loadRequests}
        />

        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          customerTypeFilter={customerTypeFilter}
          onCustomerTypeChange={
            setCustomerTypeFilter
          }
        />

        {errorMessage && (
          <ErrorMessage message={errorMessage} />
        )}

        <div className="mt-8 space-y-6">
          {loading ? (
            <EmptyState text="جارٍ تحميل طلبات عرض السعر..." />
          ) : filteredRequests.length === 0 ? (
            <EmptyState text="لا توجد طلبات مطابقة." />
          ) : (
            filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                updating={
                  updatingId === request.id
                }
                onStatusChange={(status) =>
                  updateStatus(request.id, status)
                }
                onUpdated={loadRequests}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
  loading,
  onRefresh,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black text-[#071d49]">
          {title}
        </h1>

        <p className="mt-3 text-slate-600">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white transition hover:bg-[#0d2d69] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FaRotate />
        {loading ? "جارٍ التحديث..." : "تحديث"}
      </button>
    </div>
  );
}

function FilterBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  customerTypeFilter,
  onCustomerTypeChange,
}) {
  return (
    <div className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px_220px]">
      <div className="relative">
        <FaMagnifyingGlass className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />

        <input
          type="search"
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="ابحث برقم الطلب أو الاسم أو الشركة أو البريد"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 outline-none transition focus:border-blue-500 focus:bg-white"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(event) =>
          onStatusChange(event.target.value)
        }
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-blue-500"
      >
        <option value="all">كل الحالات</option>

        {statusOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={customerTypeFilter}
        onChange={(event) =>
          onCustomerTypeChange(event.target.value)
        }
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-blue-500"
      >
        <option value="all">كل أنواع العملاء</option>
        <option value="individual">الأفراد</option>
        <option value="company">الشركات والجهات</option>
      </select>
    </div>
  );
}

function RequestCard({
  request,
  updating,
  onStatusChange,
  onUpdated,
}) {
  const attachments = Array.isArray(
    request.attachments
  )
    ? request.attachments
    : [];

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              dir="ltr"
              className="text-2xl font-black text-[#071d49]"
            >
              {request.request_no}
            </h2>

            <span
              className={[
                "rounded-full px-4 py-2 text-sm font-black",
                statusStyles[request.status] ||
                  statusStyles.new,
              ].join(" ")}
            >
              {getStatusLabel(request.status)}
            </span>

            {request.nda_required && (
              <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-800">
                NDA مطلوب
              </span>
            )}
          </div>

          <p className="mt-3 text-slate-500">
            {formatDate(request.created_at)}
          </p>
        </div>

        <div className="min-w-56">
          <label className="mb-2 block text-sm font-bold text-slate-500">
            حالة الطلب
          </label>

          <select
            value={request.status || "new"}
            onChange={(event) =>
              onStatusChange(event.target.value)
            }
            disabled={updating}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-blue-500 disabled:opacity-60"
          >
            {statusOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoItem
          icon={
            request.customer_type === "company"
              ? <FaBuilding />
              : <FaUser />
          }
          label="نوع العميل"
          value={
            customerTypeLabels[
              request.customer_type
            ] || "غير محدد"
          }
        />

        <InfoItem
          label={
            request.customer_type === "company"
              ? "مسؤول التواصل"
              : "الاسم"
          }
          value={request.full_name}
        />

        <InfoItem
          icon={<FaPhone />}
          label="الجوال"
          value={request.phone}
          href={`tel:${request.phone}`}
        />

        <InfoItem
          icon={<FaEnvelope />}
          label="البريد"
          value={request.email}
          href={`mailto:${request.email}`}
        />

        {request.customer_type === "company" && (
          <InfoItem
            icon={<FaBuilding />}
            label="الشركة أو الجهة"
            value={request.company}
          />
        )}

        <InfoItem
          label="المدينة"
          value={request.city}
        />

        <InfoItem
          label="نوع المشروع"
          value={request.project_type}
        />

        <InfoItem
          label="القيمة التقديرية"
          value={request.project_value}
        />

        <InfoItem
          label="تاريخ البدء المتوقع"
          value={
            request.expected_start_date
              ? formatDateOnly(
                  request.expected_start_date
                )
              : "—"
          }
        />
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="text-sm font-bold text-slate-500">
          وصف المشروع
        </p>

        <p className="mt-3 whitespace-pre-wrap leading-8 text-slate-700">
          {request.project_description || "—"}
        </p>
      </div>

      <AttachmentsList
        attachments={attachments}
      />

      <RequestWorkflowPanel
        requestType="rfq"
        request={request}
        onUpdated={onUpdated}
      />
    </article>
  );
}

function AttachmentsList({ attachments }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-black text-[#071d49]">
        المرفقات ({attachments.length})
      </h3>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {attachments.map((attachment, index) => (
          <AttachmentItem
            key={`${attachment.storage_path}-${index}`}
            attachment={attachment}
          />
        ))}
      </div>
    </div>
  );
}

function AttachmentItem({ attachment }) {
  async function downloadFile() {
    try {
      const { data, error } =
        await supabase.storage
          .from("engineering-documents")
          .download(attachment.storage_path);

      if (error) {
        throw error;
      }

      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download =
        attachment.original_name || "document";
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <FaFile className="shrink-0 text-xl text-blue-700" />

        <div className="min-w-0">
          <p className="truncate font-bold text-[#071d49]">
            {attachment.original_name ||
              "مرفق"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {attachment.document_type ||
              "عام"}{" "}
            • {formatFileSize(attachment.size)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={downloadFile}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition hover:bg-blue-200"
        aria-label="تنزيل المرفق"
      >
        <FaDownload />
      </button>
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

function EmptyState({ text }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
      {text}
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
      {message}
    </div>
  );
}

function getStatusLabel(value) {
  return (
    statusOptions.find(
      (option) => option.value === value
    )?.label || value || "جديد"
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

function formatDateOnly(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
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
