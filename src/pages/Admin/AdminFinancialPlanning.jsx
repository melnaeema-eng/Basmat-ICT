import { useEffect, useState } from "react";
import { FaRotate, FaPlus, FaMoneyBillTrendUp, FaArrowTrendUp, FaArrowTrendDown, FaChartLine } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
export default function AdminFinancialPlanning(){
 const year=new Date().getFullYear();
 const [snapshot,setSnapshot]=useState(null),[budgets,setBudgets]=useState([]),[flows,setFlows]=useState([]),[tab,setTab]=useState("overview"),[msg,setMsg]=useState("");
 const [budget,setBudget]=useState({budget_name:"",fiscal_year:year,revenue_budget:"",expense_budget:"",capex_budget:"",payroll_budget:"",notes:""});
 const [flow,setFlow]=useState({forecast_date:"",forecast_type:"inflow",category:"",description:"",amount:"",probability:100});
 useEffect(()=>{load()},[]);
 async function load(){
  const [s,b,f]=await Promise.all([
   supabase.rpc("ict_financial_planning_snapshot",{p_year:year}),
   supabase.from("ict_financial_budgets").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_cashflow_forecasts").select("*").order("forecast_date")
  ]);
  if(s.error||b.error||f.error)setMsg((s.error||b.error||f.error).message);
  else{setSnapshot(s.data);setBudgets(b.data||[]);setFlows(f.data||[])}
 }
 async function addBudget(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_financial_budgets").insert({...budget,fiscal_year:Number(budget.fiscal_year),revenue_budget:Number(budget.revenue_budget||0),expense_budget:Number(budget.expense_budget||0),capex_budget:Number(budget.capex_budget||0),payroll_budget:Number(budget.payroll_budget||0),created_by:user?.id});
  if(error)setMsg(error.message);else{setMsg("تم حفظ الميزانية.");setBudget({budget_name:"",fiscal_year:year,revenue_budget:"",expense_budget:"",capex_budget:"",payroll_budget:"",notes:""});load()}
 }
 async function addFlow(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_cashflow_forecasts").insert({...flow,amount:Number(flow.amount||0),probability:Number(flow.probability||100),created_by:user?.id});
  if(error)setMsg(error.message);else{setMsg("تمت إضافة توقع التدفق النقدي.");setFlow({forecast_date:"",forecast_type:"inflow",category:"",description:"",amount:"",probability:100});load()}
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">FINANCIAL PLANNING & FP&A</span><h1 className="erp-page-title">الميزانيات والتدفقات والتوقعات</h1><p className="erp-page-subtitle">Budget vs Actual، Cash Forecast، والسيولة المستقبلية.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   <K t="Budget Revenue" v={snapshot?.budget_revenue}/><K t="Actual Revenue" v={snapshot?.actual_revenue}/><K t="Forecast Inflow" v={snapshot?.forecast_inflow}/><K t="Forecast Outflow" v={snapshot?.forecast_outflow}/>
   <K t="Budget Expenses" v={snapshot?.budget_expense}/><K t="Actual Expenses" v={snapshot?.actual_expense}/><K t="Payroll Actual" v={snapshot?.actual_payroll}/><K t="Forecast Net" v={snapshot?.forecast_net}/>
  </div>
  <div className="mt-6 flex gap-2">{[["overview","نظرة عامة"],["budget","الميزانيات"],["cashflow","Cash Flow Forecast"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#0f2747] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>
  {tab==="overview"&&<div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="erp-card p-6"><h2 className="text-lg font-black text-[#0f2747]">Budget Performance</h2><Row t="Revenue Achievement" v={`${Number(snapshot?.revenue_achievement||0).toFixed(2)}%`}/><Row t="Expense Utilization" v={`${Number(snapshot?.expense_utilization||0).toFixed(2)}%`}/><Row t="Operating Actual Net" v={`${money(snapshot?.operating_actual_net)} SAR`}/></section><section className="erp-card p-6"><h2 className="text-lg font-black text-[#0f2747]">Liquidity Outlook</h2><Row t="Expected Inflow" v={`${money(snapshot?.forecast_inflow)} SAR`}/><Row t="Expected Outflow" v={`${money(snapshot?.forecast_outflow)} SAR`}/><Row t="Forecast Net" v={`${money(snapshot?.forecast_net)} SAR`}/></section></div>}
  {tab==="budget"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addBudget} className="erp-card p-6"><h2 className="text-lg font-black">ميزانية جديدة</h2>{[["budget_name","اسم الميزانية","text"],["fiscal_year","السنة","number"],["revenue_budget","Revenue Budget","number"],["expense_budget","Expense Budget","number"],["capex_budget","CAPEX Budget","number"],["payroll_budget","Payroll Budget","number"],["notes","ملاحظات","text"]].map(([k,l,t])=><Field key={k} label={l} type={t} value={budget[k]} onChange={v=>setBudget(x=>({...x,[k]:v}))}/>)}<button className="erp-btn-primary mt-4"><FaPlus/>حفظ</button></form><TableBudget rows={budgets}/></div>}
  {tab==="cashflow"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addFlow} className="erp-card p-6"><h2 className="text-lg font-black">توقع تدفق نقدي</h2><Field label="التاريخ" type="date" value={flow.forecast_date} onChange={v=>setFlow(x=>({...x,forecast_date:v}))}/><label className="mt-4 block"><span className="mb-2 block font-black">النوع</span><select className="w-full rounded-xl border p-3" value={flow.forecast_type} onChange={e=>setFlow(x=>({...x,forecast_type:e.target.value}))}><option value="inflow">Inflow</option><option value="outflow">Outflow</option></select></label>{[["category","التصنيف","text"],["description","الوصف","text"],["amount","القيمة","number"],["probability","Probability %","number"]].map(([k,l,t])=><Field key={k} label={l} type={t} value={flow[k]} onChange={v=>setFlow(x=>({...x,[k]:v}))}/>)}<button className="erp-btn-primary mt-4"><FaPlus/>إضافة</button></form><TableFlow rows={flows}/></div>}
 </div></div>
}
function K({t,v}){return <div className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{money(v)}</p><p className="text-[10px] text-slate-300">SAR</p></div>}
function Row({t,v}){return <div className="mt-4 flex justify-between rounded-xl border border-slate-100 bg-[#fbfcfd] p-4"><b>{t}</b><strong dir="ltr">{v}</strong></div>}
function Field({label,value,onChange,type="text"}){return <label className="mt-4 block"><span className="mb-2 block font-black">{label}</span><input required={label==="اسم الميزانية"||label==="التاريخ"||label==="التصنيف"||label==="القيمة"} type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function TableBudget({rows}){return <section className="erp-card overflow-x-auto p-6"><h2 className="text-lg font-black">الميزانيات</h2><table className="mt-4 w-full min-w-[800px]"><thead><tr><th className="p-3">الاسم</th><th>السنة</th><th>Revenue</th><th>Expenses</th><th>CAPEX</th><th>Payroll</th><th>الحالة</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3 font-black">{r.budget_name}</td><td>{r.fiscal_year}</td><td>{money(r.revenue_budget)}</td><td>{money(r.expense_budget)}</td><td>{money(r.capex_budget)}</td><td>{money(r.payroll_budget)}</td><td>{r.status}</td></tr>)}</tbody></table></section>}
function TableFlow({rows}){return <section className="erp-card overflow-x-auto p-6"><h2 className="text-lg font-black">Cash Flow Forecast</h2><table className="mt-4 w-full min-w-[800px]"><thead><tr><th className="p-3">التاريخ</th><th>النوع</th><th>التصنيف</th><th>الوصف</th><th>القيمة</th><th>Probability</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.forecast_date}</td><td>{r.forecast_type}</td><td>{r.category}</td><td>{r.description||"—"}</td><td>{money(r.amount)}</td><td>{r.probability}%</td></tr>)}</tbody></table></section>}
