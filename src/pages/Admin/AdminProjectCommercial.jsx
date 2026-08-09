import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const num = v => Number(v || 0);
const money = v => num(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const makeNo = prefix => `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`;

export default function AdminProjectCommercial(){
  const [params]=useSearchParams();
  const [projects,setProjects]=useState([]);
  const [projectId,setProjectId]=useState(params.get("project")||"");
  const [team,setTeam]=useState([]);
  const [contracts,setContracts]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [pos,setPos]=useState([]);
  const [invoices,setInvoices]=useState([]);
  const [payments,setPayments]=useState([]);
  const [message,setMessage]=useState("");

  useEffect(()=>{loadBase()},[]);
  useEffect(()=>{if(projectId) loadProjectData();},[projectId]);

  async function loadBase(){
    const [p,t]=await Promise.all([
      supabase.from("ict_projects").select("id,project_no,project_name,customer_id,contract_value").order("created_at",{ascending:false}),
      supabase.from("ict_team_members").select("id,full_name").eq("is_active",true).order("full_name")
    ]);
    if(p.error||t.error) return setMessage((p.error||t.error).message);
    setProjects(p.data||[]); setTeam(t.data||[]);
    if(!projectId && p.data?.length) setProjectId(p.data[0].id);
  }

  async function loadProjectData(){
    const [c,t,p,i,pay]=await Promise.all([
      supabase.from("ict_contracts").select("*").eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("ict_project_tasks").select("*,owner:ict_team_members(full_name)").eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("ict_purchase_orders").select("*").eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("ict_project_invoices").select("*").eq("project_id",projectId).order("created_at",{ascending:false}),
      supabase.from("ict_project_payments").select("*").eq("project_id",projectId).order("payment_date",{ascending:false}),
    ]);
    const e=c.error||t.error||p.error||i.error||pay.error;
    if(e) return setMessage(e.message);
    setContracts(c.data||[]);setTasks(t.data||[]);setPos(p.data||[]);setInvoices(i.data||[]);setPayments(pay.data||[]);
  }

  const project=projects.find(x=>x.id===projectId);
  const invoiced=useMemo(()=>invoices.reduce((s,x)=>s+num(x.amount)+num(x.tax_amount),0),[invoices]);
  const paid=useMemo(()=>payments.reduce((s,x)=>s+num(x.amount),0),[payments]);
  const purchasing=useMemo(()=>pos.filter(x=>x.status!=="cancelled").reduce((s,x)=>s+num(x.amount),0),[pos]);

  async function insert(table,payload){
    setMessage("");
    const {data:a}=await supabase.auth.getUser();
    const {error}=await supabase.from(table).insert({...payload,created_by:a.user?.id||null});
    if(error) setMessage(error.message); else {setMessage("تم الحفظ بنجاح."); await loadProjectData();}
  }

  if(!projects.length) return <div dir="rtl" className="p-10">أنشئ مشروعًا أولًا من صفحة إدارة المشاريع.</div>;

  return <div dir="rtl" className="px-4 py-10 md:px-8"><div className="mx-auto max-w-7xl">
    <h1 className="text-4xl font-black text-[#071d49]">التنفيذ والتجاري</h1>
    <select className="form-input mt-6 max-w-xl" value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(x=><option key={x.id} value={x.id}>{x.project_no} — {x.project_name}</option>)}</select>

    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric label="قيمة المشروع" value={project?.contract_value}/>
      <Metric label="إجمالي الفواتير" value={invoiced}/>
      <Metric label="المحصل" value={paid}/>
      <Metric label="أوامر الشراء" value={purchasing}/>
    </div>
    {message&&<div className="mt-5 rounded-2xl bg-blue-50 p-4 text-blue-800">{message}</div>}

    <Section title="العقود">
      <QuickForm fields={[["title","عنوان العقد"],["contract_value","القيمة","number"],["signed_date","تاريخ التوقيع","date"]]} button="إضافة عقد" onSave={v=>insert("ict_contracts",{project_id:projectId,customer_id:project?.customer_id||null,contract_no:makeNo("CTR"),title:v.title,contract_value:num(v.contract_value),signed_date:v.signed_date||null,status:"active"})}/>
      <Cards rows={contracts} render={x=><><b>{x.contract_no}</b><p>{x.title}</p><strong>{money(x.contract_value)} SAR</strong></>}/>
    </Section>

    <Section title="مهام المشروع">
      <QuickForm fields={[["title","المهمة"],["due_date","تاريخ الاستحقاق","date"]]} extra={<select id="task-owner" className="form-input"><option value="">غير معين</option>{team.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select>} button="إضافة مهمة" onSave={v=>insert("ict_project_tasks",{project_id:projectId,title:v.title,due_date:v.due_date||null,assigned_to:document.getElementById("task-owner")?.value||null})}/>
      <Cards rows={tasks} render={x=><><b>{x.title}</b><p>{x.owner?.full_name||"غير معين"} — {x.status}</p></>}/>
    </Section>

    <Section title="أوامر الشراء">
      <QuickForm fields={[["vendor_name","المورد"],["amount","القيمة","number"],["description","الوصف"]]} button="إضافة PO" onSave={v=>insert("ict_purchase_orders",{project_id:projectId,po_no:makeNo("PO"),vendor_name:v.vendor_name,amount:num(v.amount),description:v.description||null,status:"issued"})}/>
      <Cards rows={pos} render={x=><><b>{x.po_no}</b><p>{x.vendor_name}</p><strong>{money(x.amount)} SAR</strong></>}/>
    </Section>

    <Section title="فواتير العميل">
      <QuickForm fields={[["amount","المبلغ قبل الضريبة","number"],["tax_amount","الضريبة","number"],["due_date","تاريخ الاستحقاق","date"]]} button="إضافة فاتورة" onSave={v=>insert("ict_project_invoices",{project_id:projectId,customer_id:project?.customer_id||null,invoice_no:makeNo("INV"),amount:num(v.amount),tax_amount:num(v.tax_amount),due_date:v.due_date||null,status:"issued"})}/>
      <Cards rows={invoices} render={x=><><b>{x.invoice_no}</b><p>{x.status}</p><strong>{money(num(x.amount)+num(x.tax_amount))} SAR</strong></>}/>
    </Section>

    <Section title="الدفعات والتحصيل">
      <PaymentForm invoices={invoices} onSave={v=>insert("ict_project_payments",{project_id:projectId,invoice_id:v.invoice_id,amount:num(v.amount),payment_method:v.payment_method||null,reference_no:v.reference_no||null})}/>
      <Cards rows={payments} render={x=><><b>{money(x.amount)} SAR</b><p>{x.payment_date} — {x.payment_method||"—"}</p></>}/>
    </Section>
  </div></div>
}
function Metric({label,value}){return <div className="rounded-3xl border bg-white p-6 shadow-sm"><p className="font-bold text-slate-500">{label}</p><p dir="ltr" className="mt-2 text-right text-2xl font-black">{money(value)} SAR</p></div>}
function Section({title,children}){return <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-black text-[#071d49]">{title}</h2>{children}</section>}
function Cards({rows,render}){return <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map(x=><div key={x.id} className="rounded-2xl bg-slate-50 p-4 leading-7">{render(x)}</div>)}</div>}
function QuickForm({fields,extra,button,onSave}){const [v,setV]=useState({});return <form className="mt-5 grid gap-3 md:grid-cols-4" onSubmit={e=>{e.preventDefault();onSave(v);setV({})}}>{fields.map(([n,l,t="text"])=><input key={n} required={n==="title"||n==="vendor_name"} type={t} placeholder={l} value={v[n]||""} onChange={e=>setV(x=>({...x,[n]:e.target.value}))} className="form-input"/>)}{extra}<button className="rounded-xl bg-[#123878] px-4 py-3 font-black text-white">{button}</button></form>}
function PaymentForm({invoices,onSave}){const [v,setV]=useState({invoice_id:"",amount:"",payment_method:"Bank Transfer",reference_no:""});return <form className="mt-5 grid gap-3 md:grid-cols-5" onSubmit={e=>{e.preventDefault();if(v.invoice_id&&v.amount)onSave(v)}}><select required className="form-input" value={v.invoice_id} onChange={e=>setV({...v,invoice_id:e.target.value})}><option value="">اختر الفاتورة</option>{invoices.map(x=><option key={x.id} value={x.id}>{x.invoice_no}</option>)}</select><input required type="number" className="form-input" placeholder="المبلغ" value={v.amount} onChange={e=>setV({...v,amount:e.target.value})}/><input className="form-input" placeholder="طريقة الدفع" value={v.payment_method} onChange={e=>setV({...v,payment_method:e.target.value})}/><input className="form-input" placeholder="المرجع" value={v.reference_no} onChange={e=>setV({...v,reference_no:e.target.value})}/><button className="rounded-xl bg-[#ff7417] px-4 py-3 font-black text-white">تسجيل دفعة</button></form>}
