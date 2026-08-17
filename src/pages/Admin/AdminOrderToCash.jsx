import { useEffect, useState } from "react";
import { FaArrowTrendUp,FaCoins,FaFileInvoiceDollar,FaPlus,FaRotate,FaSackDollar,FaTriangleExclamation } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminOrderToCash(){
 const [snap,setSnap]=useState(null),[orders,setOrders]=useState([]),[customers,setCustomers]=useState([]),[projects,setProjects]=useState([]),[invoices,setInvoices]=useState([]),[actions,setActions]=useState([]),[tab,setTab]=useState("dashboard"),[msg,setMsg]=useState("");
 const [form,setForm]=useState({customer_id:"",project_id:"",order_date:today,tax_rate:"15",payment_terms:"",scope:""});
 const [item,setItem]=useState({sales_order_id:"",description:"",quantity:"1",unit:"",unit_price:""});
 const [milestone,setMilestone]=useState({sales_order_id:"",milestone_name:"",milestone_percent:"",milestone_amount:"",due_date:""});
 useEffect(()=>{load()},[]);
 async function load(){
  const [s,o,c,p,i,a]=await Promise.all([
   supabase.rpc("ict_order_to_cash_snapshot"),
   supabase.from("ict_sales_orders").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_customers").select("id,name,company_name,status").order("name"),
   supabase.from("ict_projects").select("id,title,project_name,status").order("created_at",{ascending:false}),
   supabase.from("ict_invoices").select("id,invoice_no,customer_id,total_amount,amount_paid,balance_due,due_date,status").order("created_at",{ascending:false}),
   supabase.from("ict_collection_actions").select("*").order("created_at",{ascending:false}).limit(100)
  ]);
  const e=s.error||o.error||c.error||p.error||i.error||a.error;
  if(e)setMsg(e.message);else{setSnap(s.data);setOrders(o.data||[]);setCustomers(c.data||[]);setProjects(p.data||[]);setInvoices(i.data||[]);setActions(a.data||[])}
 }
 async function addOrder(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_sales_orders").insert({...form,project_id:form.project_id||null,tax_rate:Number(form.tax_rate||15),created_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم إنشاء أمر البيع.");setForm({customer_id:"",project_id:"",order_date:today,tax_rate:"15",payment_terms:"",scope:""});load()}
 }
 async function addItem(e){e.preventDefault();
  const order=orders.find(x=>x.id===item.sales_order_id); if(!order){setMsg("اختر أمر البيع.");return}
  const {count}=await supabase.from("ict_sales_order_items").select("*",{count:"exact",head:true}).eq("sales_order_id",item.sales_order_id);
  const {error}=await supabase.from("ict_sales_order_items").insert({...item,line_no:Number(count||0)+1,quantity:Number(item.quantity||1),unit_price:Number(item.unit_price||0)});
  if(error)setMsg(error.message);else{const r=await supabase.rpc("ict_recalculate_sales_order",{p_sales_order_id:item.sales_order_id});if(r.error)setMsg(r.error.message);else{setMsg("تمت إضافة البند وإعادة احتساب الأمر.");setItem({sales_order_id:"",description:"",quantity:"1",unit:"",unit_price:""});load()}}
 }
 async function approve(id){const {error}=await supabase.rpc("ict_approve_sales_order",{p_sales_order_id:id});if(error)setMsg(error.message);else{setMsg("تم اعتماد أمر البيع.");load()}}
 async function addMilestone(e){e.preventDefault();
  const {error}=await supabase.from("ict_billing_milestones").insert({...milestone,due_date:milestone.due_date||null,milestone_percent:Number(milestone.milestone_percent||0),milestone_amount:Number(milestone.milestone_amount||0)});
  if(error)setMsg(error.message);else{setMsg("تمت إضافة مرحلة الفوترة.");setMilestone({sales_order_id:"",milestone_name:"",milestone_percent:"",milestone_amount:"",due_date:""});load()}
 }
 async function collection(invoice){
  const type=window.prompt("نوع المتابعة: call / email / meeting / promise_to_pay / escalation / other","call");if(!type)return;
  const notes=window.prompt("ملاحظات المتابعة","")||"";
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_collection_actions").insert({invoice_id:invoice.id,action_type:type,notes,status:"open",created_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم تسجيل متابعة التحصيل.");load()}
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">ORDER TO CASH</span><h1 className="erp-page-title">أوامر البيع والفوترة والتحصيل</h1><p className="erp-page-subtitle">من أمر العميل إلى الفاتورة والتحصيل ومراقبة الذمم.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   <K t="Sales Orders" v={snap?.sales_orders_value} i={<FaArrowTrendUp/>}/><K t="Billed" v={snap?.billed_value} i={<FaFileInvoiceDollar/>}/><K t="Collected" v={snap?.collected_value} i={<FaCoins/>}/><K t="Accounts Receivable" v={snap?.accounts_receivable} i={<FaSackDollar/>}/>
   <K t="Overdue AR" v={snap?.overdue_receivables} i={<FaTriangleExclamation/>}/><K t="Due Next 30 Days" v={snap?.due_next_30_days}/><K t="Unbilled Orders" v={snap?.unbilled_order_value}/><K t="Collection Rate %" v={snap?.collection_rate} raw/>
  </div>
  <div className="mt-6 flex flex-wrap gap-2">{[["dashboard","لوحة التحكم"],["orders","أوامر البيع"],["billing","خطة الفوترة"],["collections","التحصيل"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>

  {tab==="dashboard"&&<div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="erp-card p-6"><h2 className="text-lg font-black">مؤشرات دورة الإيراد</h2><R t="إجمالي أوامر البيع المعتمدة" v={snap?.sales_orders_value}/><R t="غير مفوتر من الأوامر" v={snap?.unbilled_order_value}/><R t="الذمم المدينة" v={snap?.accounts_receivable}/><R t="المتأخر" v={snap?.overdue_receivables}/></section><section className="erp-card p-6"><h2 className="text-lg font-black">التحصيل</h2><R t="إجمالي المفوتر" v={snap?.billed_value}/><R t="إجمالي المحصل" v={snap?.collected_value}/><R t="مستحق خلال 30 يوم" v={snap?.due_next_30_days}/><R t="نسبة التحصيل" v={snap?.collection_rate} raw suffix="%"/></section></div>}

  {tab==="orders"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.65fr_1.35fr]"><div className="space-y-6"><form onSubmit={addOrder} className="erp-card p-6"><h2 className="text-lg font-black">أمر بيع جديد</h2><label className="mt-4 block"><b className="mb-2 block">العميل</b><select required className="w-full rounded-xl border p-3" value={form.customer_id} onChange={e=>setForm(x=>({...x,customer_id:e.target.value}))}><option value="">اختر العميل</option>{customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}</select></label><label className="mt-4 block"><b className="mb-2 block">المشروع</b><select className="w-full rounded-xl border p-3" value={form.project_id} onChange={e=>setForm(x=>({...x,project_id:e.target.value}))}><option value="">بدون مشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name||p.title}</option>)}</select></label><F l="تاريخ الأمر" t="date" v={form.order_date} c={v=>setForm(x=>({...x,order_date:v}))}/><F l="VAT %" t="number" v={form.tax_rate} c={v=>setForm(x=>({...x,tax_rate:v}))}/><F l="شروط الدفع" v={form.payment_terms} c={v=>setForm(x=>({...x,payment_terms:v}))}/><label className="mt-4 block"><b className="mb-2 block">النطاق</b><textarea className="w-full rounded-xl border p-3" value={form.scope} onChange={e=>setForm(x=>({...x,scope:e.target.value}))}/></label><button className="erp-btn-primary mt-5"><FaPlus/>إنشاء</button></form>
  <form onSubmit={addItem} className="erp-card p-6"><h2 className="text-lg font-black">إضافة بند</h2><OrderSelect orders={orders} v={item.sales_order_id} c={v=>setItem(x=>({...x,sales_order_id:v}))}/><F l="الوصف" v={item.description} c={v=>setItem(x=>({...x,description:v}))}/><F l="الكمية" t="number" v={item.quantity} c={v=>setItem(x=>({...x,quantity:v}))}/><F l="الوحدة" v={item.unit} c={v=>setItem(x=>({...x,unit:v}))}/><F l="سعر الوحدة" t="number" v={item.unit_price} c={v=>setItem(x=>({...x,unit_price:v}))}/><button className="erp-btn-secondary mt-5">إضافة البند</button></form></div>
  <section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[950px]"><thead><tr><th className="p-3">الأمر</th><th>العميل</th><th>المشروع</th><th>الإجمالي</th><th>المفوتر</th><th>المحصل</th><th>الحالة</th><th></th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{o.order_no}</td><td>{customers.find(c=>c.id===o.customer_id)?.company_name||customers.find(c=>c.id===o.customer_id)?.name||"—"}</td><td>{projects.find(p=>p.id===o.project_id)?.project_name||projects.find(p=>p.id===o.project_id)?.title||"—"}</td><td>{money(o.total_amount)}</td><td>{money(o.billed_amount)}</td><td>{money(o.collected_amount)}</td><td>{o.status}</td><td>{o.status==="draft"?<button onClick={()=>approve(o.id)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">اعتماد</button>:"—"}</td></tr>)}</tbody></table></section></div>}

  {tab==="billing"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.65fr_1.35fr]"><form onSubmit={addMilestone} className="erp-card p-6"><h2 className="text-lg font-black">مرحلة فوترة</h2><OrderSelect orders={orders.filter(o=>o.status!=="cancelled")} v={milestone.sales_order_id} c={v=>setMilestone(x=>({...x,sales_order_id:v}))}/><F l="اسم المرحلة" v={milestone.milestone_name} c={v=>setMilestone(x=>({...x,milestone_name:v}))}/><F l="النسبة %" t="number" v={milestone.milestone_percent} c={v=>setMilestone(x=>({...x,milestone_percent:v}))}/><F l="القيمة" t="number" v={milestone.milestone_amount} c={v=>setMilestone(x=>({...x,milestone_amount:v}))}/><F l="تاريخ الاستحقاق" t="date" v={milestone.due_date} c={v=>setMilestone(x=>({...x,due_date:v}))}/><button className="erp-btn-primary mt-5">إضافة المرحلة</button></form><section className="erp-card p-6"><h2 className="text-lg font-black">سياسة الفوترة</h2><p className="mt-3 leading-8 text-slate-500">يتم ربط مراحل الفوترة بأوامر البيع ثم بالفواتير الفعلية. الموديول يحافظ على فصل أمر البيع عن الفاتورة مع تتبع القيمة غير المفوترة والتحصيل.</p></section></div>}

  {tab==="collections"&&<section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[900px]"><thead><tr><th className="p-3">الفاتورة</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th><th>متابعة</th></tr></thead><tbody>{invoices.filter(i=>Number(i.balance_due)>0).map(i=><tr key={i.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{i.invoice_no}</td><td>{money(i.total_amount)}</td><td>{money(i.amount_paid)}</td><td className="font-black">{money(i.balance_due)}</td><td>{i.due_date||"—"}</td><td>{i.status}</td><td><button onClick={()=>collection(i)} className="rounded-lg bg-[#ff7417] px-3 py-2 text-xs font-black text-white">تسجيل متابعة</button></td></tr>)}</tbody></table></section>}
 </div></div>
}
function K({t,v,i,raw}){return <article className="erp-card p-5"><div className="flex justify-between"><div><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{raw?Number(v||0).toFixed(2):money(v)}</p>{!raw&&<p className="text-[10px] text-slate-300">SAR</p>}</div>{i&&<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{i}</div>}</div></article>}
function R({t,v,raw,suffix=""}){return <div className="mt-4 flex justify-between rounded-xl border bg-[#fbfcfd] p-4"><b>{t}</b><strong dir="ltr">{raw?Number(v||0).toFixed(2)+suffix:money(v)+" SAR"}</strong></div>}
function F({l,v,c,t="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required type={t} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function OrderSelect({orders,v,c}){return <label className="mt-4 block"><b className="mb-2 block">أمر البيع</b><select required className="w-full rounded-xl border p-3" value={v} onChange={e=>c(e.target.value)}><option value="">اختر أمر البيع</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_no} — {money(o.total_amount)} SAR</option>)}</select></label>}
