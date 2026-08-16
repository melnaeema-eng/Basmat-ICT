import { useEffect, useMemo, useState } from "react";
import {
  FaClockRotateLeft,
  FaFileInvoiceDollar,
  FaFileLines,
  FaFolderOpen,
  FaHeadset,
  FaListCheck,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const CLOSED_PROJECT = new Set(["completed","closed","cancelled","canceled","finished"]);
const CLOSED_TICKET = new Set(["resolved","closed"]);
const CLOSED_INVOICE = new Set(["paid","cancelled","canceled"]);
const CLOSED_QUOTATION = new Set(["accepted","rejected","expired","cancelled","canceled"]);
const CLOSED_REQUEST = new Set(["completed","closed","cancelled","canceled","finished"]);

export default function PortalHistory() {
  const [tab, setTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState({
    projects: [],
    tickets: [],
    invoices: [],
    quotations: [],
    requests: [],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const [projects, tickets, invoices, quotations, rfq, consultations] = await Promise.all([
      supabase
        .from("ict_delivery_projects")
        .select("id,project_no,project_name,status,progress,start_date,target_end_date")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_support_tickets")
        .select("id,ticket_no,subject,status,priority,last_message_at,created_at")
        .order("last_message_at", { ascending: false }),
      supabase
        .from("ict_invoices")
        .select("id,invoice_no,issue_date,due_date,currency,total_amount,amount_paid,balance_due,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_quotations")
        .select("id,quotation_no,subject,total_amount,currency,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_rfq_requests")
        .select("id,request_no,project_type,project_description,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("ict_consultation_requests")
        .select("id,request_no,consultation_type,subject,details,status,created_at")
        .order("created_at", { ascending: false }),
    ]);

    const error =
      projects.error ||
      tickets.error ||
      invoices.error ||
      quotations.error ||
      rfq.error ||
      consultations.error;

    if (error) {
      setErrorMessage(error.message);
    } else {
      const requests = [
        ...(rfq.data || []).map((x) => ({
          ...x,
          type: "rfq",
          title: x.project_type || "طلب عرض سعر",
        })),
        ...(consultations.data || []).map((x) => ({
          ...x,
          type: "consultation",
          title: x.subject || x.consultation_type || "استشارة",
        })),
      ]
        .filter((x) => CLOSED_REQUEST.has(String(x.status || "").toLowerCase()))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setData({
        projects: (projects.data || []).filter((x) =>
          CLOSED_PROJECT.has(String(x.status || "").toLowerCase())
        ),
        tickets: (tickets.data || []).filter((x) =>
          CLOSED_TICKET.has(String(x.status || "").toLowerCase())
        ),
        invoices: (invoices.data || []).filter((x) =>
          CLOSED_INVOICE.has(String(x.status || "").toLowerCase())
        ),
        quotations: (quotations.data || []).filter((x) =>
          CLOSED_QUOTATION.has(String(x.status || "").toLowerCase())
        ),
        requests,
      });
    }
    setLoading(false);
  }

  const tabs = useMemo(() => [
    ["projects", "المشاريع", FaFolderOpen, data.projects.length],
    ["tickets", "الدعم", FaHeadset, data.tickets.length],
    ["invoices", "الفواتير", FaFileInvoiceDollar, data.invoices.length],
    ["quotations", "عروض الأسعار", FaFileLines, data.quotations.length],
    ["requests", "الطلبات", FaListCheck, data.requests.length],
  ], [data]);

  return (
    <div dir="rtl" className="px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <FaClockRotateLeft className="text-3xl text-[#ff7417]" />
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">السجل</h1>
            <p className="mt-2 text-slate-600">
              المعاملات المنتهية محفوظة هنا ولا تظهر في الصفحات التشغيلية.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map(([key, label, Icon, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-3 font-black",
                tab === key ? "bg-[#071d49] text-white" : "border bg-white text-slate-700",
              ].join(" ")}
            >
              <Icon /> {label}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{count}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center text-slate-500">
              جارٍ تحميل السجل...
            </div>
          ) : (
            <HistoryRows type={tab} rows={data[tab]} />
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRows({ type, rows }) {
  if (!rows.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        لا توجد معاملات منتهية في هذا القسم.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const number =
          type === "projects" ? row.project_no :
          type === "tickets" ? row.ticket_no :
          type === "invoices" ? row.invoice_no :
          type === "quotations" ? row.quotation_no :
          row.request_no;

        const title =
          type === "projects" ? row.project_name :
          type === "tickets" ? row.subject :
          type === "invoices" ? "فاتورة" :
          type === "quotations" ? (row.subject || "عرض سعر") :
          row.title;

        return (
          <article key={`${type}-${row.id}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p dir="ltr" className="text-right text-sm font-black text-blue-700">
                  {number || "—"}
                </p>
                <h2 className="mt-2 text-xl font-black text-[#071d49]">
                  {title || "—"}
                </h2>
                {type === "requests" && (
                  <p className="mt-2 text-sm text-slate-500">
                    {row.type === "rfq" ? "طلب عرض سعر" : "استشارة"}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                {row.status || "—"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              {type === "projects" && <span>الإنجاز: {Number(row.progress || 0)}%</span>}
              {type === "tickets" && row.priority && <span>الأولوية: {row.priority}</span>}
              {type === "invoices" && (
                <span dir="ltr">
                  {Number(row.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} {row.currency || "SAR"}
                </span>
              )}
              {type === "quotations" && (
                <span dir="ltr">
                  {Number(row.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} {row.currency || "SAR"}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
