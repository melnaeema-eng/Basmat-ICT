import {useEffect,useState} from "react";
import {FaRotate,FaShieldHalved} from "react-icons/fa6";
import {supabase} from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);
const start=today.slice(0,5)+"01-01";

export default function AdminERPHealth(){
 const [period,setPeriod]=useState({start,end:today}),[snap,setSnap]=useState({}),[health,setHealth]=useState([]),[msg,setMsg]=useState("");
 useEffect(()=>{load()},[]);
 async function load(){
  setMsg("");
  const [s,h]=await Promise.all([
   supabase.rpc("ict_executive_erp_snapshot",{p_start:period.start,p_end:period.end}),
   supabase.rpc("ict_erp_production_health")
  ]);
  const e=s.error||h.error;if(e)setMsg(e.message);else{setSnap(s.data||{});setHealth(h.data||[])}
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">ERP PRODUCTION CONTROL</span><h1 className="erp-page-title">مراقبة جاهزية نظام ERP</h1><p className="erp-page-subtitle">مؤشرات الإدارة التنفيذية وفحص المكونات الأساسية للنظام قبل الإنتاج.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{msg}</div>}
  <section className="erp-card mt-6 grid gap-4 p-5 md:grid-cols-3"><label><b className="mb-2 block">من</b><input type="date" value={period.start} onChange={e=>setPeriod(x=>({...x,start:e.target.value}))} className="form-input"/></label><label><b className="mb-2 block">إلى</b><input type="date" value={period.end} onChange={e=>setPeriod(x=>({...x,end:e.target.value}))} className="form-input"/></label><button onClick={load} className="erp-btn-primary self-end">تطبيق الفترة</button></section>
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><K t="Customers" v={snap.customers} plain/><K t="Active Projects" v={snap.active_projects} plain/><K t="Orders" v={snap.orders}/><K t="Billed" v={snap.billed}/><K t="Collected" v={snap.collected}/><K t="Total Cost" v={snap.total_cost}/><K t="Gross Profit" v={snap.gross_profit}/><K t="Gross Margin" v={snap.gross_margin_percent} pct/><K t="Collection Rate" v={snap.collection_rate} pct/><K t="Open Invoices" v={snap.open_invoices} plain/></div>
  <section className="erp-card mt-6 p-6"><h2 className="flex items-center gap-2 text-xl font-black text-[#0f2747]"><FaShieldHalved/>Production Health</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{health.map((x,i)=><article key={i} className="rounded-2xl border border-slate-200 p-4"><p className="font-black text-[#0f2747]">{x.check_name}</p><p className={"mt-2 font-black "+(String(x.result).includes("PASS")?"text-green-700":"text-red-600")}>{x.result}</p></article>)}</div></section>
 </div></div>
}
function K({t,v,pct,plain}){return <article className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{pct?Number(v||0).toFixed(2)+"%":plain?Number(v||0).toLocaleString("en-US"):money(v)}</p>{!pct&&!plain&&<small className="text-slate-300">SAR</small>}</article>}
