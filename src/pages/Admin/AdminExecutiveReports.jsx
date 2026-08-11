import { useEffect, useMemo, useState } from "react";
import { FaArrowTrendUp, FaChartPie, FaPrint, FaRotate } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminExecutiveReports() {
  const [period, setPeriod] = useState("year");
  const [data, setData] = useState({ quotations: [], projects: [], invoices: [], payments: [], customers: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError("");
    const [q, p, i, pay, c, t] = await Promise.all([
      supabase.from("ict_quotations").select("id,status,total_amount,created_at"),
      supabase.from("ict_delivery_projects").select("id,status,progress,contract_value,created_at"),
      supabase.from("ict_invoices").select("id,status,total_amount,amount_paid,balance_due,due_date,created_at"),
      supabase.from("ict_payments").select("id,amount,status,payment_date,created_at"),
      supabase.from("ict_customers").select("id,status,created_at"),
      supabase.from("ict_support_tickets").select("id,status,priority,created_at"),
    ]);
    const e = q.error || p.error || i.error || pay.error || c.error || t.error;
    if (e) setError(e.message);
    else setData({ quotations:q.data||[], projects:p.data||[], invoices:i.data||[], payments:pay.data||[], customers:c.data||[], tickets:t.data||[] });
    setLoading(false);
  }

  const start = useMemo(() => periodStart(period), [period]);
  const inPeriod = (row, field="created_at") => !start || (row[field] && new Date(row[field]) >= start);
  const d = useMemo(() => ({
    quotations: data.quotations.filter(inPeriod), projects: data.projects.filter(inPeriod), invoices: data.invoices.filter(inPeriod),
    payments: data.payments.filter((x)=>inPeriod(x, x.created_at ? "created_at" : "payment_date")), customers: data.customers.filter(inPeriod), tickets: data.tickets.filter(inPeriod),
  }), [data, start]);

  const contractValue = d.projects.reduce((s,x)=>s+Number(x.contract_value||0),0);
  const invoiced = d.invoices.filter(x=>x.status!=="cancelled").reduce((s,x)=>s+Number(x.total_amount||0),0);
  const collected = d.payments.filter(x=>!x.status || ["received","paid","completed"].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);
  const balance = d.invoices.filter(x=>x.status!=="cancelled").reduce((s,x)=>s+Number(x.balance_due ?? (Number(x.total_amount||0)-Number(x.amount_paid||0))),0);
  const overdueInvoices = d.invoices.filter(x=>x.status!=="paid" && x.status!=="cancelled" && x.due_date && new Date(x.due_date)<new Date()).length;
  const accepted = d.quotations.filter(x=>x.status==="accepted").length;
  const decided = d.quotations.filter(x=>["accepted","rejected"].includes(x.status)).length;
  const conversion = decided ? Math.round((accepted/decided)*100) : 0;
  const activeProjects = d.projects.filter(x=>x.status==="active").length;
  const completedProjects = d.projects.filter(x=>x.status==="completed").length;
  const avgProgress = d.projects.length ? Math.round(d.projects.reduce((s,x)=>s+Number(x.progress||0),0)/d.projects.length) : 0;
  const openTickets = d.tickets.filter(x=>!["resolved","closed"].includes(x.status)).length;
  const urgentTickets = d.tickets.filter(x=>x.priority==="urgent" && !["resolved","closed"].includes(x.status)).length;

  return <div dir="rtl" className="px-4 py-10 md:px-8 print:p-0"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div><div className="flex items-center gap-3"><FaChartPie className="text-3xl text-[#ff7417]"/><h1 className="text-4xl font-black text-[#071d49]">Executive Dashboard</h1></div><p className="mt-2 text-slate-600">ملخص تنفيذي للمبيعات والمشاريع والتحصيل والدعم.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl bg-slate-100 px-4 py-3 font-black"><FaRotate className="inline ml-2"/>تحديث</button><button onClick={()=>window.print()} className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white"><FaPrint className="inline ml-2"/>طباعة / PDF</button></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-2 print:hidden">{[["month","هذا الشهر"],["quarter","هذا الربع"],["year","هذه السنة"],["all","الكل"]].map(([v,l])=><button key={v} onClick={()=>setPeriod(v)} className={["rounded-xl px-4 py-2 font-black",period===v?"bg-[#ff7417] text-white":"bg-white border text-slate-700"].join(" ")}>{l}</button>)}</div>
    {error && <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">{error}</div>}
    {loading ? <div className="mt-10 text-center font-bold text-slate-500">جاري تحميل المؤشرات...</div> : <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="قيمة المشاريع" value={`${money(contractValue)} SAR`}/><Kpi label="إجمالي الفواتير" value={`${money(invoiced)} SAR`}/><Kpi label="المحصل" value={`${money(collected)} SAR`}/><Kpi label="الرصيد المستحق" value={`${money(balance)} SAR`} warn={balance>0}/>
        <Kpi label="المشاريع النشطة" value={activeProjects}/><Kpi label="المشاريع المكتملة" value={completedProjects}/><Kpi label="متوسط الإنجاز" value={`${avgProgress}%`}/><Kpi label="فواتير متأخرة" value={overdueInvoices} warn={overdueInvoices>0}/>
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Sales Conversion"><Bar label="عروض الأسعار" value={d.quotations.length} max={Math.max(d.quotations.length,1)}/><Bar label="مقبولة" value={accepted} max={Math.max(d.quotations.length,1)}/><Big label="معدل التحويل" value={`${conversion}%`}/></Panel>
        <Panel title="Projects"><Bar label="نشطة" value={activeProjects} max={Math.max(d.projects.length,1)}/><Bar label="مكتملة" value={completedProjects} max={Math.max(d.projects.length,1)}/><Big label="إجمالي المشاريع" value={d.projects.length}/></Panel>
        <Panel title="Support"><Bar label="تذاكر مفتوحة" value={openTickets} max={Math.max(d.tickets.length,1)}/><Bar label="عاجلة" value={urgentTickets} max={Math.max(d.tickets.length,1)}/><Big label="إجمالي التذاكر" value={d.tickets.length}/></Panel>
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2"><Panel title="Customer & Sales Snapshot"><Row label="عملاء جدد بالفترة" value={d.customers.length}/><Row label="عروض أسعار" value={d.quotations.length}/><Row label="قيمة العروض" value={`${money(d.quotations.reduce((s,x)=>s+Number(x.total_amount||0),0))} SAR`}/></Panel><Panel title="Management Alerts"><Row label="فواتير متأخرة" value={overdueInvoices}/><Row label="تذاكر دعم مفتوحة" value={openTickets}/><Row label="تذاكر عاجلة" value={urgentTickets}/></Panel></section>
    </>}
  </div></div>;
}

function periodStart(period){ const n=new Date(); if(period==="all") return null; if(period==="month") return new Date(n.getFullYear(),n.getMonth(),1); if(period==="quarter") return new Date(n.getFullYear(),Math.floor(n.getMonth()/3)*3,1); return new Date(n.getFullYear(),0,1); }
function Kpi({label,value,warn}){return <article className="rounded-3xl border bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p dir="ltr" className={["mt-3 text-right text-2xl font-black",warn?"text-[#ff7417]":"text-[#071d49]"].join(" ")}>{value}</p></article>}
function Panel({title,children}){return <article className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black text-[#071d49]"><FaArrowTrendUp className="text-[#ff7417]"/>{title}</h2><div className="mt-5 space-y-4">{children}</div></article>}
function Bar({label,value,max}){const w=Math.min(100,Math.round((Number(value||0)/Math.max(Number(max||1),1))*100));return <div><div className="flex justify-between font-bold text-slate-600"><span>{label}</span><span>{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#123878]" style={{width:`${w}%`}}/></div></div>}
function Big({label,value}){return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-[#071d49]">{value}</p></div>}
function Row({label,value}){return <div className="flex items-center justify-between border-b pb-3 last:border-0"><span className="font-bold text-slate-600">{label}</span><strong dir="ltr" className="text-[#071d49]">{value}</strong></div>}
