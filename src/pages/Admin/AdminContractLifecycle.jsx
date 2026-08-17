import { useEffect,useState } from "react";
import { FaArrowsRotate,FaChartLine,FaClock,FaFileContract,FaPlus,FaRotate } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminContractLifecycle(){
 const [snap,setSnap]=useState(null),[contracts,setContracts]=useState([]),[lines,setLines]=useState([]),[billing,setBilling]=useState([]),[renewals,setRenewals]=useState([]),[sla,setSla]=useState([]),[tab,setTab]=useState("dashboard"),[msg,setMsg]=useState("");
 const [line,setLine]=useState({contract_id:"",item_type:"service",description:"",quantity:"1",unit_price:"",billing_frequency:"monthly",start_date:today,end_date:""});
 const [policy,setPolicy]=useState({contract_id:"",policy_name:"Standard SLA",severity:"high",response_minutes:"60",resolution_minutes:"480",service_window:"business_hours",penalty_percent:"0"});
 useEffect(()=>{load()},[]);
 async function load(){
  const [s,c,l,b,r,p]=await Promise.all([
    supabase.rpc("ict_contract_revenue_snapshot"),
    supabase.from("ict_contracts").select("*").order("created_at",{ascending:false}),
    supabase.from("ict_contract_lines").select("*").order("created_at",{ascending:false}),
    supabase.from("ict_contract_billing_schedules").select("*").order("billing_date"),
    supabase.from("ict_contract_renewals").select("*").order("created_at",{ascending:false}),
    supabase.from("ict_contract_sla_policies").select("*").order("created_at",{ascending:false})
  ]);
  const e=s.error||c.error||l.error||b.error||r.error||p.error;
  if(e)setMsg(e.message);else{setSnap(s.data);setContracts(c.data||[]);setLines(l.data||[]);setBilling(b.data||[]);setRenewals(r.data||[]);setSla(p.data||[])}
 }
 async function addLine(e){e.preventDefault();
  const count=lines.filter(x=>x.contract_id===line.contract_id).length;
  const {error}=await supabase.from("ict_contract_lines").insert({...line,line_no:count+1,quantity:Number(line.quantity||1),unit_price:Number(line.unit_price||0),end_date:line.end_date||null});
  if(error)setMsg(error.message);else{setMsg("تمت إضافة بند العقد.");setLine({contract_id:"",item_type:"service",description:"",quantity:"1",unit_price:"",billing_frequency:"monthly",start_date:today,end_date:""});load()}
 }
 async function addSla(e){e.preventDefault();
  const {error}=await supabase.from("ict_contract_sla_policies").upsert({...policy,response_minutes:Number(policy.response_minutes),resolution_minutes:Number(policy.resolution_minutes),penalty_percent:Number(policy.penalty_percent||0)},{onConflict:"contract_id,severity"});
  if(error)setMsg(error.message);else{setMsg("تم حفظ SLA.");load()}
 }
 async function genBilling(id){const {data,error}=await supabase.rpc("ict_generate_contract_billing",{p_contract_id:id});if(error)setMsg(error.message);else{setMsg(`تم توليد ${data?.generated||0} موعد فوترة.`);load()}}
 async function renewalsScan(){const {data,error}=await supabase.rpc("ict_identify_contract_renewals",{p_days:120});if(error)setMsg(error.message);else{setMsg(`تم تحديد ${data||0} فرصة تجديد.`);load()}}
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">CONTRACT LIFECYCLE</span><h1 className="erp-page-title">العقود وSLA والفوترة المتكررة</h1><p className="erp-page-subtitle">إدارة دورة العقد، SLA، الفوترة المجدولة، والتجديدات.</p></div><div className="flex gap-2"><button onClick={renewalsScan} className="erp-btn-primary"><FaArrowsRotate/>فحص التجديدات</button><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></div></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <K t="Active Contracts" v={snap?.active_contracts} raw/><K t="Contract Value" v={snap?.contract_value}/><K t="Billed" v={snap?.billed_value}/><K t="Unbilled Schedule" v={snap?.unbilled_schedule}/><K t="Renewal Pipeline" v={snap?.renewal_pipeline}/>
    <K t="Collected" v={snap?.collected_value}/><K t="Billing Due 30" v={snap?.billing_due_30}/><K t="Billing Due 60" v={snap?.billing_due_60}/><K t="Expiring 30 Days" v={snap?.expiring_30_days} raw/><K t="Expiring 90 Days" v={snap?.expiring_90_days} raw/>
  </div>
  <div className="mt-6 flex flex-wrap gap-2">{[["dashboard","لوحة العقود"],["lines","بنود العقود"],["sla","SLA"],["billing","الفوترة المتكررة"],["renewals","التجديدات"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>

  {tab==="dashboard"&&<section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[950px]"><thead><tr><th className="p-3">العقد</th><th>العنوان</th><th>القيمة</th><th>البداية</th><th>النهاية</th><th>الحالة</th><th>الفوترة</th></tr></thead><tbody>{contracts.map(c=><tr key={c.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{c.contract_no}</td><td>{c.title}</td><td>{money(c.contract_value)}</td><td>{c.start_date||"—"}</td><td>{c.end_date||"—"}</td><td>{c.status}</td><td><button onClick={()=>genBilling(c.id)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">توليد الجدول</button></td></tr>)}</tbody></table></section>}

  {tab==="lines"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addLine} className="erp-card p-6"><h2 className="text-lg font-black"><FaFileContract className="inline ml-2"/>بند عقد</h2><ContractSelect rows={contracts} v={line.contract_id} c={v=>setLine(x=>({...x,contract_id:v}))}/><F l="الوصف" v={line.description} c={v=>setLine(x=>({...x,description:v}))}/><F l="الكمية" t="number" v={line.quantity} c={v=>setLine(x=>({...x,quantity:v}))}/><F l="سعر الوحدة" t="number" v={line.unit_price} c={v=>setLine(x=>({...x,unit_price:v}))}/><label className="mt-4 block"><b className="mb-2 block">التكرار</b><select className="w-full rounded-xl border p-3" value={line.billing_frequency} onChange={e=>setLine(x=>({...x,billing_frequency:e.target.value}))}><option value="one_time">مرة واحدة</option><option value="monthly">شهري</option><option value="quarterly">ربع سنوي</option><option value="semi_annual">نصف سنوي</option><option value="annual">سنوي</option></select></label><F l="البداية" t="date" v={line.start_date} c={v=>setLine(x=>({...x,start_date:v}))}/><F l="النهاية" t="date" v={line.end_date} c={v=>setLine(x=>({...x,end_date:v}))}/><button className="erp-btn-primary mt-5"><FaPlus/>إضافة البند</button></form><section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[850px]"><thead><tr><th className="p-3">العقد</th><th>الوصف</th><th>القيمة</th><th>التكرار</th><th>الحالة</th></tr></thead><tbody>{lines.map(l=><tr key={l.id} className="border-t"><td className="p-3">{contracts.find(c=>c.id===l.contract_id)?.contract_no||"—"}</td><td>{l.description}</td><td>{money(l.line_total)}</td><td>{l.billing_frequency}</td><td>{l.status}</td></tr>)}</tbody></table></section></div>}

  {tab==="sla"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addSla} className="erp-card p-6"><h2 className="text-lg font-black"><FaClock className="inline ml-2"/>SLA Policy</h2><ContractSelect rows={contracts} v={policy.contract_id} c={v=>setPolicy(x=>({...x,contract_id:v}))}/><F l="اسم السياسة" v={policy.policy_name} c={v=>setPolicy(x=>({...x,policy_name:v}))}/><label className="mt-4 block"><b className="mb-2 block">Severity</b><select className="w-full rounded-xl border p-3" value={policy.severity} onChange={e=>setPolicy(x=>({...x,severity:e.target.value}))}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><F l="Response Minutes" t="number" v={policy.response_minutes} c={v=>setPolicy(x=>({...x,response_minutes:v}))}/><F l="Resolution Minutes" t="number" v={policy.resolution_minutes} c={v=>setPolicy(x=>({...x,resolution_minutes:v}))}/><F l="Penalty %" t="number" v={policy.penalty_percent} c={v=>setPolicy(x=>({...x,penalty_percent:v}))}/><button className="erp-btn-primary mt-5">حفظ SLA</button></form><section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[800px]"><thead><tr><th className="p-3">العقد</th><th>Severity</th><th>Response</th><th>Resolution</th><th>Penalty</th></tr></thead><tbody>{sla.map(s=><tr key={s.id} className="border-t"><td className="p-3">{contracts.find(c=>c.id===s.contract_id)?.contract_no||"—"}</td><td>{s.severity}</td><td>{s.response_minutes} min</td><td>{s.resolution_minutes} min</td><td>{s.penalty_percent}%</td></tr>)}</tbody></table></section></div>}

  {tab==="billing"&&<section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[950px]"><thead><tr><th className="p-3">Schedule</th><th>العقد</th><th>تاريخ الفوترة</th><th>قبل الضريبة</th><th>VAT</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>{billing.map(b=><tr key={b.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{b.schedule_no}</td><td>{contracts.find(c=>c.id===b.contract_id)?.contract_no||"—"}</td><td>{b.billing_date}</td><td>{money(b.amount)}</td><td>{money(b.tax_amount)}</td><td className="font-black">{money(b.total_amount)}</td><td>{b.status}</td></tr>)}</tbody></table></section>}

  {tab==="renewals"&&<section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[900px]"><thead><tr><th className="p-3">Renewal</th><th>العقد</th><th>القيمة المقترحة</th><th>Probability</th><th>البداية</th><th>النهاية</th><th>الحالة</th></tr></thead><tbody>{renewals.map(r=><tr key={r.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{r.renewal_no}</td><td>{contracts.find(c=>c.id===r.contract_id)?.contract_no||"—"}</td><td>{money(r.proposed_value)}</td><td>{r.probability}%</td><td>{r.proposed_start_date||"—"}</td><td>{r.proposed_end_date||"—"}</td><td>{r.status}</td></tr>)}</tbody></table></section>}
 </div></div>
}
function K({t,v,raw}){return <article className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{raw?Number(v||0):money(v)}</p>{!raw&&<p className="text-[10px] text-slate-300">SAR</p>}</article>}
function F({l,v,c,t="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required={l!=="النهاية"} type={t} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function ContractSelect({rows,v,c}){return <label className="mt-4 block"><b className="mb-2 block">العقد</b><select required value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"><option value="">اختر العقد</option>{rows.map(r=><option key={r.id} value={r.id}>{r.contract_no} — {r.title}</option>)}</select></label>}
