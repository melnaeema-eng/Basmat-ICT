import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

export default function AdminOperationsDashboard(){
  const [d,setD]=useState({projects:[],tasks:[],pos:[],invoices:[],payments:[]});
  const [error,setError]=useState("");
  useEffect(()=>{load()},[]);
  async function load(){
    const [p,t,po,i,pay]=await Promise.all([
      supabase.from("ict_projects").select("id,status,progress,contract_value"),
      supabase.from("ict_project_tasks").select("id,status,due_date"),
      supabase.from("ict_purchase_orders").select("id,status,amount"),
      supabase.from("ict_project_invoices").select("id,status,amount,tax_amount,due_date"),
      supabase.from("ict_project_payments").select("id,amount")
    ]);
    const e=p.error||t.error||po.error||i.error||pay.error;if(e)return setError(e.message);
    setD({projects:p.data||[],tasks:t.data||[],pos:po.data||[],invoices:i.data||[],payments:pay.data||[]});
  }
  const contract=d.projects.reduce((s,x)=>s+Number(x.contract_value||0),0);
  const invoiced=d.invoices.reduce((s,x)=>s+Number(x.amount||0)+Number(x.tax_amount||0),0);
  const paid=d.payments.reduce((s,x)=>s+Number(x.amount||0),0);
  const purchases=d.pos.filter(x=>x.status!=="cancelled").reduce((s,x)=>s+Number(x.amount||0),0);
  const overdue=d.tasks.filter(x=>x.status!=="done"&&x.due_date&&new Date(x.due_date)<new Date()).length;
  return <div dir="rtl" className="px-4 py-10 md:px-8"><div className="mx-auto max-w-7xl">
    <h1 className="text-4xl font-black text-[#071d49]">Operations Dashboard</h1>
    <p className="mt-3 text-slate-600">ملخص المشاريع والتنفيذ والتحصيل والمشتريات.</p>
    {error&&<div className="mt-6 bg-red-50 p-5 text-red-700">{error}</div>}
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <M label="المشاريع النشطة" value={d.projects.filter(x=>x.status==="active").length}/>
      <M label="مهام متأخرة" value={overdue}/>
      <M label="قيمة العقود" value={`${money(contract)} SAR`}/>
      <M label="إجمالي الفواتير" value={`${money(invoiced)} SAR`}/>
      <M label="المحصل" value={`${money(paid)} SAR`}/>
      <M label="الرصيد المستحق" value={`${money(invoiced-paid)} SAR`}/>
      <M label="المشتريات" value={`${money(purchases)} SAR`}/>
      <M label="هامش أولي" value={`${money(contract-purchases)} SAR`}/>
    </div>
  </div></div>
}
function M({label,value}){return <article className="rounded-3xl border bg-white p-6 shadow-sm"><p className="font-bold text-slate-500">{label}</p><p dir="ltr" className="mt-3 text-right text-2xl font-black text-[#071d49]">{value}</p></article>}
