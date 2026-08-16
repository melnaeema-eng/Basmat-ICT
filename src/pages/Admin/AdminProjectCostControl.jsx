import { useEffect, useMemo, useState } from "react";
import { FaArrowTrendDown, FaArrowTrendUp, FaChartLine, FaCoins, FaFileCirclePlus, FaPeopleGroup, FaPlus, FaRotate, FaScaleBalanced } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money=(v)=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const emptyBudget={project_id:"",revenue_budget:"",material_budget:"",labor_budget:"",subcontractor_budget:"",other_cost_budget:"",contingency_budget:""};
const emptyTS={project_id:"",employee_id:"",work_date:new Date().toISOString().slice(0,10),hours:"",hourly_cost:"",description:""};
const emptyCO={project_id:"",title:"",description:"",revenue_impact:"",cost_impact:""};

export default function AdminProjectCostControl(){
 const [projects,setProjects]=useState([]),[portfolio,setPortfolio]=useState([]),[employees,setEmployees]=useState([]);
 const [budgets,setBudgets]=useState([]),[timesheets,setTimesheets]=useState([]),[changes,setChanges]=useState([]);
 const [selected,setSelected]=useState(""),[snapshot,setSnapshot]=useState(null),[tab,setTab]=useState("portfolio");
 const [budget,setBudget]=useState(emptyBudget),[ts,setTs]=useState(emptyTS),[co,setCo]=useState(emptyCO);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");

 useEffect(()=>{load();},[]);

 async function load(){
  setLoading(true); setMessage("");
  const [p,pf,e,b,t,c]=await Promise.all([
   supabase.from("ict_delivery_projects").select("id,project_no,project_name,status,progress,contract_value").order("created_at",{ascending:false}),
   supabase.rpc("ict_project_profitability_portfolio"),
   supabase.from("ict_hr_employees").select("id,employee_code,full_name,status").eq("status","active").order("full_name"),
   supabase.from("ict_project_budgets").select("*"),
   supabase.from("ict_project_timesheets").select("*").order("work_date",{ascending:false}).limit(200),
   supabase.from("ict_project_change_orders").select("*").order("created_at",{ascending:false}).limit(200)
  ]);
  const err=p.error||pf.error||e.error||b.error||t.error||c.error;
  if(err)setMessage(err.message); else {
   setProjects(p.data||[]);setPortfolio(pf.data||[]);setEmployees(e.data||[]);setBudgets(b.data||[]);setTimesheets(t.data||[]);setChanges(c.data||[]);
   const id=selected||p.data?.[0]?.id||""; if(id){setSelected(id);await loadSnapshot(id);}
  }
  setLoading(false);
 }

 async function loadSnapshot(id){
  if(!id){setSnapshot(null);return;}
  const {data,error}=await supabase.rpc("ict_project_financial_snapshot",{p_project_id:id});
  if(error)setMessage(error.message);else setSnapshot(data);
 }

 async function saveBudget(ev){
  ev.preventDefault();setBusy(true);
  const payload={project_id:budget.project_id,revenue_budget:+budget.revenue_budget||0,material_budget:+budget.material_budget||0,labor_budget:+budget.labor_budget||0,subcontractor_budget:+budget.subcontractor_budget||0,other_cost_budget:+budget.other_cost_budget||0,contingency_budget:+budget.contingency_budget||0,approved_at:new Date().toISOString()};
  const {error}=await supabase.from("ict_project_budgets").upsert(payload,{onConflict:"project_id"});
  if(error)setMessage(error.message);else{setMessage("تم حفظ ميزانية المشروع.");setBudget(emptyBudget);await load();} setBusy(false);
 }

 async function addTS(ev){
  ev.preventDefault();setBusy(true);
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_project_timesheets").insert({project_id:ts.project_id,employee_id:ts.employee_id,work_date:ts.work_date,hours:+ts.hours||0,hourly_cost:+ts.hourly_cost||0,description:ts.description.trim()||null,status:"approved",approved_by:user?.id||null,approved_at:new Date().toISOString(),created_by:user?.id||null});
  if(error)setMessage(error.message);else{setMessage("تم تسجيل ساعات المشروع.");setTs(emptyTS);await load();}setBusy(false);
 }

 async function addCO(ev){
  ev.preventDefault();setBusy(true);const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_project_change_orders").insert({project_id:co.project_id,title:co.title.trim(),description:co.description.trim()||null,revenue_impact:+co.revenue_impact||0,cost_impact:+co.cost_impact||0,status:"pending",requested_by:user?.id||null});
  if(error)setMessage(error.message);else{setMessage("تم إنشاء Change Order.");setCo(emptyCO);await load();}setBusy(false);
 }

 async function reviewCO(row,status){
  setBusy(true);const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_project_change_orders").update({status,approved_by:status==="approved"?user?.id||null:null,approved_at:status==="approved"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",row.id);
  if(error)setMessage(error.message);else{setMessage(status==="approved"?"تم الاعتماد.":"تم الرفض.");await load();}setBusy(false);
 }

 const pmap=useMemo(()=>Object.fromEntries(projects.map(p=>[p.id,`${p.project_no||""} — ${p.project_name||""}`])),[projects]);
 const emap=useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,`${e.employee_code||""} — ${e.full_name}`])),[employees]);
 const totals=useMemo(()=>{const revenue=portfolio.reduce((s,r)=>s+(+r.revenue||0),0),cost=portfolio.reduce((s,r)=>s+(+r.actual_cost||0),0),margin=portfolio.reduce((s,r)=>s+(+r.margin||0),0),collections=portfolio.reduce((s,r)=>s+(+r.collections||0),0);return{revenue,cost,margin,collections,pct:revenue?margin/revenue*100:0};},[portfolio]);

 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">PROJECT COST CONTROL</span><h1 className="erp-page-title">تكلفة المشاريع والربحية</h1><p className="erp-page-subtitle">Budget vs Actual، العمالة، المخزون، Change Orders، التحصيل والربحية.</p></div><button onClick={load} disabled={loading} className="erp-btn-secondary"><FaRotate/> تحديث</button></section>
  {message&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
   <Metric title="إيرادات المحفظة" value={totals.revenue} icon={<FaArrowTrendUp/>}/><Metric title="التكلفة الفعلية" value={totals.cost} icon={<FaCoins/>}/><Metric title="هامش الربح" value={totals.margin} icon={<FaScaleBalanced/>}/><Metric title="Margin %" value={totals.pct} percent icon={<FaChartLine/>}/><Metric title="التحصيل" value={totals.collections} icon={<FaScaleBalanced/>}/>
  </div>
  <div className="mt-6 flex flex-wrap gap-2">{[["portfolio","المحفظة"],["project","تفاصيل مشروع"],["budget","الميزانية"],["timesheets","ساعات العمل"],["changeorders","Change Orders"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab===k?"bg-[#0f2747] text-white":"border border-slate-200 bg-white text-slate-500"}`}>{l}</button>)}</div>

  {tab==="portfolio"&&<section className="erp-card mt-6 overflow-x-auto p-6"><Title icon={<FaChartLine/>} title="ربحية المشاريع"/><table className="mt-5 w-full min-w-[1000px] text-right"><thead><tr><th className="p-3">المشروع</th><th className="p-3">التقدم</th><th className="p-3">الإيراد</th><th className="p-3">التكلفة</th><th className="p-3">الهامش</th><th className="p-3">Margin %</th><th className="p-3">التحصيل</th></tr></thead><tbody>{portfolio.map(r=><tr key={r.project_id} className="border-t border-slate-100"><td className="p-3"><button onClick={async()=>{setSelected(r.project_id);await loadSnapshot(r.project_id);setTab("project");}} className="font-black text-[#345a82]">{r.project_no||"—"} — {r.project_name||"بدون اسم"}</button></td><td className="p-3">{r.progress||0}%</td><td dir="ltr" className="p-3 text-right">{money(r.revenue)}</td><td dir="ltr" className="p-3 text-right">{money(r.actual_cost)}</td><td dir="ltr" className="p-3 text-right font-black">{money(r.margin)}</td><td className="p-3"><Margin value={r.margin_pct}/></td><td dir="ltr" className="p-3 text-right">{money(r.collections)}</td></tr>)}</tbody></table></section>}

  {tab==="project"&&<section className="erp-card mt-6 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><Title icon={<FaScaleBalanced/>} title="تفاصيل المشروع المالية"/><Select label="المشروع" value={selected} onChange={async v=>{setSelected(v);await loadSnapshot(v);}}><option value="">اختر المشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{pmap[p.id]}</option>)}</Select></div>{snapshot?<><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Contract Value",snapshot.contract_value],["Budget Cost",snapshot.budget_cost],["Actual Cost",snapshot.total_actual_cost],["Gross Margin",snapshot.gross_margin],["Invoices",snapshot.invoice_revenue],["Collections",snapshot.collections],["PO Committed",snapshot.po_committed],["Cost Variance",snapshot.cost_variance]].map(([t,v])=><Small key={t} title={t} value={v}/>)}</div><div className="mt-6 grid gap-4 md:grid-cols-3">{[["مصروفات",snapshot.expenses],["تكلفة مخزون مصروف",snapshot.stock_cost],["تكلفة العمالة",snapshot.labor_cost],["Change Order Revenue",snapshot.change_order_revenue],["Change Order Cost",snapshot.change_order_cost]].map(([t,v])=><Small key={t} title={t} value={v}/>)}<Small title="Margin %" value={snapshot.gross_margin_pct} percent/></div></>:<p className="py-10 text-center text-slate-400">اختر مشروعًا.</p>}</section>}

  {tab==="budget"&&<div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><form onSubmit={saveBudget} className="erp-card p-6"><Title icon={<FaCoins/>} title="ميزانية المشروع"/><div className="mt-5 grid gap-4 md:grid-cols-2"><Select label="المشروع" value={budget.project_id} onChange={v=>{const b=budgets.find(x=>x.project_id===v);setBudget(b?{project_id:v,revenue_budget:b.revenue_budget,material_budget:b.material_budget,labor_budget:b.labor_budget,subcontractor_budget:b.subcontractor_budget,other_cost_budget:b.other_cost_budget,contingency_budget:b.contingency_budget}:{...emptyBudget,project_id:v});}}><option value="">اختر المشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{pmap[p.id]}</option>)}</Select>{[["revenue_budget","Budget Revenue"],["material_budget","مواد"],["labor_budget","عمالة"],["subcontractor_budget","مقاولين باطن"],["other_cost_budget","تكاليف أخرى"],["contingency_budget","Contingency"]].map(([k,l])=><Input key={k} label={l} type="number" value={budget[k]} onChange={v=>setBudget(f=>({...f,[k]:v}))}/>)}</div><button disabled={busy} className="erp-btn-primary mt-5"><FaPlus/> حفظ الميزانية</button></form><section className="erp-card overflow-x-auto p-6"><Title icon={<FaScaleBalanced/>} title="ميزانيات المشاريع"/><table className="mt-5 w-full min-w-[800px] text-right"><thead><tr><th className="p-3">المشروع</th><th className="p-3">Revenue</th><th className="p-3">Materials</th><th className="p-3">Labor</th><th className="p-3">Other</th></tr></thead><tbody>{budgets.map(b=><tr key={b.id} className="border-t border-slate-100"><td className="p-3 font-black">{pmap[b.project_id]}</td><td className="p-3">{money(b.revenue_budget)}</td><td className="p-3">{money(b.material_budget)}</td><td className="p-3">{money(b.labor_budget)}</td><td className="p-3">{money(+b.subcontractor_budget + +b.other_cost_budget + +b.contingency_budget)}</td></tr>)}</tbody></table></section></div>}

  {tab==="timesheets"&&<div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]"><form onSubmit={addTS} className="erp-card p-6"><Title icon={<FaPeopleGroup/>} title="تسجيل ساعات المشروع"/><div className="mt-5 grid gap-4"><Select label="المشروع" value={ts.project_id} onChange={v=>setTs(f=>({...f,project_id:v}))}><option value="">اختر المشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{pmap[p.id]}</option>)}</Select><Select label="الموظف" value={ts.employee_id} onChange={v=>setTs(f=>({...f,employee_id:v}))}><option value="">اختر الموظف</option>{employees.map(e=><option key={e.id} value={e.id}>{emap[e.id]}</option>)}</Select><Input label="التاريخ" type="date" value={ts.work_date} onChange={v=>setTs(f=>({...f,work_date:v}))}/><Input label="الساعات" type="number" value={ts.hours} onChange={v=>setTs(f=>({...f,hours:v}))}/><Input label="تكلفة الساعة" type="number" value={ts.hourly_cost} onChange={v=>setTs(f=>({...f,hourly_cost:v}))}/><Input label="الوصف" value={ts.description} onChange={v=>setTs(f=>({...f,description:v}))}/></div><button disabled={busy} className="erp-btn-primary mt-5">حفظ الساعات</button></form><section className="erp-card overflow-x-auto p-6"><Title icon={<FaPeopleGroup/>} title="سجل الساعات"/><table className="mt-5 w-full min-w-[850px] text-right"><thead><tr><th className="p-3">التاريخ</th><th className="p-3">المشروع</th><th className="p-3">الموظف</th><th className="p-3">الساعات</th><th className="p-3">التكلفة</th></tr></thead><tbody>{timesheets.map(t=><tr key={t.id} className="border-t border-slate-100"><td className="p-3">{t.work_date}</td><td className="p-3">{pmap[t.project_id]}</td><td className="p-3">{emap[t.employee_id]}</td><td className="p-3">{t.hours}</td><td className="p-3">{money(+t.hours * +t.hourly_cost)}</td></tr>)}</tbody></table></section></div>}

  {tab==="changeorders"&&<div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]"><form onSubmit={addCO} className="erp-card p-6"><Title icon={<FaFileCirclePlus/>} title="Change Order جديد"/><div className="mt-5 grid gap-4"><Select label="المشروع" value={co.project_id} onChange={v=>setCo(f=>({...f,project_id:v}))}><option value="">اختر المشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{pmap[p.id]}</option>)}</Select><Input label="العنوان" value={co.title} onChange={v=>setCo(f=>({...f,title:v}))}/><Input label="Revenue Impact" type="number" value={co.revenue_impact} onChange={v=>setCo(f=>({...f,revenue_impact:v}))}/><Input label="Cost Impact" type="number" value={co.cost_impact} onChange={v=>setCo(f=>({...f,cost_impact:v}))}/><Input label="الوصف" value={co.description} onChange={v=>setCo(f=>({...f,description:v}))}/></div><button disabled={busy} className="erp-btn-primary mt-5">إنشاء الطلب</button></form><section className="erp-card overflow-x-auto p-6"><Title icon={<FaFileCirclePlus/>} title="Change Orders"/><table className="mt-5 w-full min-w-[900px] text-right"><thead><tr><th className="p-3">الرقم</th><th className="p-3">المشروع</th><th className="p-3">العنوان</th><th className="p-3">Revenue</th><th className="p-3">Cost</th><th className="p-3">الحالة</th><th className="p-3">الإجراء</th></tr></thead><tbody>{changes.map(c=><tr key={c.id} className="border-t border-slate-100"><td className="p-3 font-black text-[#345a82]">{c.change_order_no}</td><td className="p-3">{pmap[c.project_id]}</td><td className="p-3">{c.title}</td><td className="p-3">{money(c.revenue_impact)}</td><td className="p-3">{money(c.cost_impact)}</td><td className="p-3">{c.status}</td><td className="p-3">{c.status==="pending"?<div className="flex gap-2"><button onClick={()=>reviewCO(c,"approved")} type="button" className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700">اعتماد</button><button onClick={()=>reviewCO(c,"rejected")} type="button" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">رفض</button></div>:"—"}</td></tr>)}</tbody></table></section></div>}
 </div></div>
}

function Metric({title,value,icon,percent=false}){return <article className="erp-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{title}</p><p dir="ltr" className="mt-2 text-right text-2xl font-black text-[#0f2747]">{percent?`${Number(value||0).toFixed(2)}%`:money(value)}</p>{!percent&&<p className="mt-1 text-[10px] font-black text-slate-300">SAR</p>}</div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{icon}</div></div></article>}
function Small({title,value,percent=false}){return <div className="rounded-xl border border-slate-100 bg-[#fbfcfd] p-4"><p className="text-xs font-bold text-slate-400">{title}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{percent?`${Number(value||0).toFixed(2)}%`:money(value)}</p></div>}
function Margin({value}){const n=Number(value||0);return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${n>=0?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{n>=0?<FaArrowTrendUp/>:<FaArrowTrendDown/>}{n.toFixed(2)}%</span>}
function Title({title,icon}){return <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{icon}</div><h2 className="text-lg font-black text-[#0f2747]">{title}</h2></div>}
function Input({label,value,onChange,type="text"}){return <label><span className="mb-2 block text-sm font-black text-slate-600">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none"/></label>}
function Select({label,value,onChange,children}){return <label><span className="mb-2 block text-sm font-black text-slate-600">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="w-full min-w-64 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none">{children}</select></label>}
