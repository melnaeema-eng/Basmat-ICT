import { useEffect, useState } from "react";
import { FaBuildingColumns,FaCalculator,FaCalendarCheck,FaRotate } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminFinancialControl(){
 const [tab,setTab]=useState("bank"),[accounts,setAccounts]=useState([]),[statements,setStatements]=useState([]),[vat,setVat]=useState([]),[periods,setPeriods]=useState([]),[msg,setMsg]=useState("");
 const [bs,setBs]=useState({treasury_account_id:"",period_start:today,period_end:today,opening_balance:"",closing_balance:""});
 const [vr,setVr]=useState({period_start:today,period_end:today});
 const [summary,setSummary]=useState(null),[close,setClose]=useState(null);
 useEffect(()=>{load()},[]);
 async function load(){
  const [a,s,v,p]=await Promise.all([
   supabase.from("ict_treasury_accounts").select("*").eq("status","active").order("account_name"),
   supabase.from("ict_bank_statements").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_vat_returns").select("*").order("period_end",{ascending:false}),
   supabase.from("ict_fiscal_periods").select("*").order("start_date",{ascending:false})
  ]);
  const e=a.error||s.error||v.error||p.error;if(e)setMsg(e.message);else{setAccounts(a.data||[]);setStatements(s.data||[]);setVat(v.data||[]);setPeriods(p.data||[])}
 }
 async function addStatement(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_bank_statements").insert({...bs,opening_balance:Number(bs.opening_balance||0),closing_balance:Number(bs.closing_balance||0),created_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم إنشاء كشف التسوية.");load()}
 }
 async function calcVat(e){e.preventDefault();const {data,error}=await supabase.rpc("ict_calculate_vat_return",{p_period_start:vr.period_start,p_period_end:vr.period_end});
  if(error)setMsg(error.message);else{setSummary(data);setMsg("تم احتساب ضريبة القيمة المضافة.")}
 }
 async function saveVat(){const {error}=await supabase.rpc("ict_save_vat_return",{p_period_start:vr.period_start,p_period_end:vr.period_end});if(error)setMsg(error.message);else{setMsg("تم حفظ إقرار VAT كمسودة.");load()}}
 async function readiness(id){const {data,error}=await supabase.rpc("ict_period_close_readiness",{p_fiscal_period_id:id});if(error)setMsg(error.message);else{setClose(data);setMsg(data?.is_ready?"الفترة جاهزة للإقفال.":"توجد عناصر تحتاج معالجة قبل الإقفال.")}}
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">FINANCIAL CONTROL</span><h1 className="erp-page-title">الرقابة المالية والإقفال</h1><p className="erp-page-subtitle">Bank Reconciliation + VAT Control + Period Close Readiness.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 flex flex-wrap gap-2">{[["bank","التسويات البنكية"],["vat","ضريبة القيمة المضافة"],["close","إقفال الفترة"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>

  {tab==="bank"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
   <form onSubmit={addStatement} className="erp-card p-6"><h2 className="text-lg font-black"><FaBuildingColumns className="inline ml-2"/>كشف بنك جديد</h2>
    <label className="mt-4 block"><b className="mb-2 block">حساب الخزينة</b><select required className="w-full rounded-xl border p-3" value={bs.treasury_account_id} onChange={e=>setBs(x=>({...x,treasury_account_id:e.target.value}))}><option value="">اختر الحساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_no} — {a.account_name}</option>)}</select></label>
    <F l="من" t="date" v={bs.period_start} c={v=>setBs(x=>({...x,period_start:v}))}/><F l="إلى" t="date" v={bs.period_end} c={v=>setBs(x=>({...x,period_end:v}))}/><F l="الرصيد الافتتاحي" t="number" v={bs.opening_balance} c={v=>setBs(x=>({...x,opening_balance:v}))}/><F l="الرصيد الختامي حسب البنك" t="number" v={bs.closing_balance} c={v=>setBs(x=>({...x,closing_balance:v}))}/><button className="erp-btn-primary mt-5">إنشاء كشف التسوية</button>
   </form>
   <section className="erp-card overflow-x-auto p-6"><h2 className="text-lg font-black">كشوف التسوية</h2><table className="mt-4 w-full min-w-[800px]"><thead><tr><th className="p-3">الرقم</th><th>الحساب</th><th>الفترة</th><th>رصيد البنك</th><th>الحالة</th></tr></thead><tbody>{statements.map(s=><tr key={s.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{s.statement_no}</td><td>{accounts.find(a=>a.id===s.treasury_account_id)?.account_name||"—"}</td><td>{s.period_start} → {s.period_end}</td><td dir="ltr">{money(s.closing_balance)}</td><td>{s.status}</td></tr>)}</tbody></table></section>
  </div>}

  {tab==="vat"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
   <form onSubmit={calcVat} className="erp-card p-6"><h2 className="text-lg font-black"><FaCalculator className="inline ml-2"/>احتساب VAT</h2><F l="من" t="date" v={vr.period_start} c={v=>setVr(x=>({...x,period_start:v}))}/><F l="إلى" t="date" v={vr.period_end} c={v=>setVr(x=>({...x,period_end:v}))}/><button className="erp-btn-primary mt-5">احتساب</button>{summary&&<div className="mt-5 space-y-3"><R t="Output VAT" v={summary.output_vat}/><R t="Input VAT" v={summary.input_vat}/><R t="Net VAT" v={summary.net_vat}/><button type="button" onClick={saveVat} className="erp-btn-secondary w-full">حفظ كمسودة</button></div>}</form>
   <section className="erp-card overflow-x-auto p-6"><h2 className="text-lg font-black">إقرارات VAT</h2><table className="mt-4 w-full min-w-[750px]"><thead><tr><th className="p-3">الرقم</th><th>الفترة</th><th>Output</th><th>Input</th><th>Net</th><th>الحالة</th></tr></thead><tbody>{vat.map(v=><tr key={v.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{v.return_no}</td><td>{v.period_start} → {v.period_end}</td><td>{money(v.output_vat)}</td><td>{money(v.input_vat)}</td><td className="font-black">{money(v.net_vat)}</td><td>{v.status}</td></tr>)}</tbody></table></section>
  </div>}

  {tab==="close"&&<div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="erp-card overflow-x-auto p-6"><h2 className="text-lg font-black"><FaCalendarCheck className="inline ml-2"/>جاهزية إقفال الفترة</h2><table className="mt-4 w-full min-w-[650px]"><thead><tr><th className="p-3">الفترة</th><th>من</th><th>إلى</th><th>الحالة</th><th>فحص</th></tr></thead><tbody>{periods.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-black">{p.period_name||p.name||"فترة مالية"}</td><td>{p.start_date}</td><td>{p.end_date}</td><td>{p.status}</td><td><button onClick={()=>readiness(p.id)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">فحص الجاهزية</button></td></tr>)}</tbody></table></section><section className="erp-card p-6"><h2 className="text-lg font-black">آخر نتيجة</h2>{close?<div className="mt-4 space-y-3"><R t="Bank Unreconciled" v={close.unreconciled_bank_lines} raw/><R t="Open AP" v={close.open_supplier_bills} raw/><R t="Overdue AR" v={close.overdue_customer_invoices} raw/><R t="Draft VAT" v={close.draft_vat_returns} raw/><div className={close.is_ready?"rounded-xl bg-green-50 p-4 font-black text-green-700":"rounded-xl bg-amber-50 p-4 font-black text-amber-700"}>{close.is_ready?"READY TO CLOSE":"NOT READY"}</div></div>:<p className="mt-4 text-slate-400">اختر فترة واضغط فحص الجاهزية.</p>}</section></div>}
 </div></div>
}
function F({l,v,c,t="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required type={t} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function R({t,v,raw}){return <div className="flex justify-between rounded-xl border bg-[#fbfcfd] p-4"><b>{t}</b><strong dir="ltr">{raw?Number(v||0):money(v)}</strong></div>}
