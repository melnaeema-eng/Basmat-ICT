import {useEffect,useState} from "react";
import {FaBullseye,FaChartLine,FaPlus,FaRotate} from "react-icons/fa6";
import {supabase} from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);
const monthStart=today.slice(0,8)+"01";

export default function AdminSalesPlanning(){
 const [snap,setSnap]=useState({}),[targets,setTargets]=useState([]),[forecasts,setForecasts]=useState([]),[customers,setCustomers]=useState([]),[orders,setOrders]=useState([]),[msg,setMsg]=useState("");
 const [period,setPeriod]=useState({start:monthStart,end:today});
 const [target,setTarget]=useState({period_start:monthStart,period_end:today,revenue_target:"0",orders_target:"0",collection_target:"0",margin_target_percent:"0",notes:""});
 const [forecast,setForecast]=useState({customer_id:"",sales_order_id:"",forecast_date:today,forecast_type:"revenue",amount:"0",probability:"50",status:"forecast",notes:""});
 useEffect(()=>{load()},[]);
 async function load(){
  const [s,t,f,c,o]=await Promise.all([
   supabase.rpc("ict_sales_planning_snapshot",{p_start:period.start,p_end:period.end}),
   supabase.from("ict_sales_targets").select("*").order("period_start",{ascending:false}),
   supabase.from("ict_sales_forecast_entries").select("*").order("forecast_date"),
   supabase.from("ict_customers").select("id,name,company_name").order("name"),
   supabase.from("ict_sales_orders").select("id,order_no,customer_id,total_amount,status").order("created_at",{ascending:false})
  ]);
  const e=s.error||t.error||f.error||c.error||o.error;
  if(e)setMsg(e.message);else{setSnap(s.data||{});setTargets(t.data||[]);setForecasts(f.data||[]);setCustomers(c.data||[]);setOrders(o.data||[])}
 }
 async function addTarget(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("ict_sales_targets").insert({...target,revenue_target:Number(target.revenue_target),orders_target:Number(target.orders_target),collection_target:Number(target.collection_target),margin_target_percent:Number(target.margin_target_percent),created_by:user?.id||null});if(error)setMsg(error.message);else{setMsg("تم حفظ هدف المبيعات.");load()}}
 async function addForecast(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("ict_sales_forecast_entries").insert({...forecast,customer_id:forecast.customer_id||null,sales_order_id:forecast.sales_order_id||null,amount:Number(forecast.amount),probability:Number(forecast.probability),owner_user_id:user?.id||null,created_by:user?.id||null});if(error)setMsg(error.message);else{setMsg("تم حفظ التوقع.");load()}}
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">SALES PLANNING & FORECAST</span><h1 className="erp-page-title">تخطيط وأهداف المبيعات</h1><p className="erp-page-subtitle">الأهداف، الأداء الفعلي، والتوقعات الموزونة للمبيعات والتحصيل.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><K t="Orders" v={snap.orders_value}/><K t="Billed" v={snap.billed_value}/><K t="Collected" v={snap.collected_value}/><K t="Revenue Forecast" v={snap.weighted_revenue_forecast}/><K t="Orders Achievement" v={snap.orders_achievement} pct/><K t="Revenue Achievement" v={snap.revenue_achievement} pct/><K t="Collection Achievement" v={snap.collection_achievement} pct/><K t="Collection Forecast" v={snap.weighted_collection_forecast}/></div>
  <div className="mt-6 grid gap-6 xl:grid-cols-2">
   <form onSubmit={addTarget} className="erp-card p-6"><H i={<FaBullseye/>} t="هدف مبيعات"/><F l="من" type="date" v={target.period_start} c={v=>setTarget(x=>({...x,period_start:v}))}/><F l="إلى" type="date" v={target.period_end} c={v=>setTarget(x=>({...x,period_end:v}))}/><F l="Revenue Target" type="number" v={target.revenue_target} c={v=>setTarget(x=>({...x,revenue_target:v}))}/><F l="Orders Target" type="number" v={target.orders_target} c={v=>setTarget(x=>({...x,orders_target:v}))}/><F l="Collection Target" type="number" v={target.collection_target} c={v=>setTarget(x=>({...x,collection_target:v}))}/><F l="Margin Target %" type="number" v={target.margin_target_percent} c={v=>setTarget(x=>({...x,margin_target_percent:v}))}/><button className="erp-btn-primary mt-5"><FaPlus/>حفظ الهدف</button></form>
   <form onSubmit={addForecast} className="erp-card p-6"><H i={<FaChartLine/>} t="توقع مبيعات"/><S l="العميل" v={forecast.customer_id} c={v=>setForecast(x=>({...x,customer_id:v}))}><option value="">بدون عميل</option>{customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}</S><S l="أمر البيع" v={forecast.sales_order_id} c={v=>setForecast(x=>({...x,sales_order_id:v}))}><option value="">بدون أمر بيع</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_no} — {money(o.total_amount)}</option>)}</S><F l="تاريخ التوقع" type="date" v={forecast.forecast_date} c={v=>setForecast(x=>({...x,forecast_date:v}))}/><S l="النوع" v={forecast.forecast_type} c={v=>setForecast(x=>({...x,forecast_type:v}))}><option value="revenue">Revenue</option><option value="collection">Collection</option></S><F l="القيمة" type="number" v={forecast.amount} c={v=>setForecast(x=>({...x,amount:v}))}/><F l="Probability %" type="number" v={forecast.probability} c={v=>setForecast(x=>({...x,probability:v}))}/><button className="erp-btn-primary mt-5"><FaPlus/>حفظ التوقع</button></form>
  </div>
  <section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[850px]"><thead><tr><th className="p-3">الفترة</th><th>Revenue Target</th><th>Orders Target</th><th>Collection Target</th><th>Margin Target</th></tr></thead><tbody>{targets.map(t=><tr key={t.id} className="border-t"><td className="p-3">{t.period_start} → {t.period_end}</td><td>{money(t.revenue_target)}</td><td>{money(t.orders_target)}</td><td>{money(t.collection_target)}</td><td>{t.margin_target_percent}%</td></tr>)}</tbody></table></section>
 </div></div>
}
function K({t,v,pct}){return <article className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{pct?Number(v||0).toFixed(2)+"%":money(v)}</p>{!pct&&<small className="text-slate-300">SAR</small>}</article>}
function H({i,t}){return <h2 className="flex items-center gap-2 text-lg font-black">{i}{t}</h2>}
function F({l,v,c,type="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required type={type} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function S({l,v,c,children}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><select value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3">{children}</select></label>}
