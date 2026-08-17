import { useEffect,useState } from "react";
import { FaBoxesPacking,FaChartLine,FaClipboardCheck,FaPlus,FaRotate,FaScaleBalanced } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminProcureToPay(){
 const [snap,setSnap]=useState(null),[suppliers,setSuppliers]=useState([]),[pos,setPos]=useState([]),[bills,setBills]=useState([]),[grns,setGrns]=useState([]),[reviews,setReviews]=useState([]),[perf,setPerf]=useState([]),[tab,setTab]=useState("dashboard"),[msg,setMsg]=useState("");
 const [grn,setGrn]=useState({purchase_order_id:"",supplier_id:"",project_id:"",receipt_date:today,delivery_note_no:"",received_value:"",quality_status:"pending",notes:""});
 const [review,setReview]=useState({supplier_id:"",review_period_start:today,review_period_end:today,quality_score:"",delivery_score:"",commercial_score:"",responsiveness_score:"",issues:"",improvement_actions:""});
 const [match,setMatch]=useState(null);
 useEffect(()=>{load()},[]);
 async function load(){
  const [s,sp,po,b,g,r,p]=await Promise.all([
   supabase.rpc("ict_procure_to_pay_snapshot"),
   supabase.from("ict_suppliers").select("id,supplier_no,name,status").order("name"),
   supabase.from("ict_purchase_orders").select("id,po_no,project_id,vendor_name,amount,status,po_date").order("created_at",{ascending:false}),
   supabase.from("ict_supplier_bills").select("id,bill_no,purchase_order_id,supplier_id,total_amount,amount_paid,balance_due,status,due_date").order("created_at",{ascending:false}),
   supabase.from("ict_goods_receipts").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_supplier_performance_reviews").select("*").order("created_at",{ascending:false}),
   supabase.rpc("ict_supplier_performance_snapshot")
  ]);
  const e=s.error||sp.error||po.error||b.error||g.error||r.error||p.error;
  if(e)setMsg(e.message);else{setSnap(s.data);setSuppliers(sp.data||[]);setPos(po.data||[]);setBills(b.data||[]);setGrns(g.data||[]);setReviews(r.data||[]);setPerf(p.data||[])}
 }
 async function addGrn(e){e.preventDefault();const po=pos.find(x=>x.id===grn.purchase_order_id);const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_goods_receipts").insert({...grn,supplier_id:grn.supplier_id||null,project_id:grn.project_id||po?.project_id||null,received_value:Number(grn.received_value||0),status:"received",received_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم تسجيل الاستلام.");setGrn({purchase_order_id:"",supplier_id:"",project_id:"",receipt_date:today,delivery_note_no:"",received_value:"",quality_status:"pending",notes:""});load()}
 }
 async function addReview(e){e.preventDefault();const {data:{user}}=await supabase.auth.getUser();
  const q=Number(review.quality_score||0),d=Number(review.delivery_score||0),c=Number(review.commercial_score||0),r=Number(review.responsiveness_score||0);
  const overall=(q+d+c+r)/4;
  const {error}=await supabase.from("ict_supplier_performance_reviews").insert({...review,quality_score:q,delivery_score:d,commercial_score:c,responsiveness_score:r,overall_score:overall,reviewed_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم حفظ تقييم المورد.");load()}
 }
 async function runMatch(){
  const poNo=window.prompt("رقم أمر الشراء مثل PO-...");if(!poNo)return;
  const billNo=window.prompt("رقم فاتورة المورد BILL-...");if(!billNo)return;
  const po=pos.find(x=>x.po_no.toLowerCase()===poNo.toLowerCase());
  const bill=bills.find(x=>x.bill_no.toLowerCase()===billNo.toLowerCase());
  if(!po||!bill){setMsg("لم يتم العثور على PO أو فاتورة المورد.");return}
  const {data,error}=await supabase.rpc("ict_three_way_match",{p_purchase_order_id:po.id,p_supplier_bill_id:bill.id});
  if(error)setMsg(error.message);else{setMatch(data);setMsg(data?.is_matched?"3-Way Match = PASS ✅":"يوجد فرق يحتاج مراجعة.")}
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">PROCURE TO PAY</span><h1 className="erp-page-title">الشراء والاستلام ومطابقة الموردين</h1><p className="erp-page-subtitle">PO → GRN → Supplier Bill → 3-Way Match → Vendor Performance.</p></div><div className="flex gap-2"><button onClick={runMatch} className="erp-btn-primary"><FaScaleBalanced/>3-Way Match</button><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></div></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
   <K t="PO Value" v={snap?.purchase_order_value}/><K t="Received" v={snap?.received_value}/><K t="Supplier Billed" v={snap?.supplier_billed_value}/><K t="Supplier Paid" v={snap?.supplier_paid_value}/><K t="Accounts Payable" v={snap?.accounts_payable}/>
   <K t="Overdue AP" v={snap?.overdue_ap}/><K t="Open POs" v={snap?.open_purchase_orders} raw/><K t="Quality Failures" v={snap?.failed_quality_receipts} raw/><K t="Receipt Coverage %" v={snap?.receipt_coverage} raw suffix="%"/><K t="Payment Coverage %" v={snap?.payment_coverage} raw suffix="%"/>
  </div>
  <div className="mt-6 flex flex-wrap gap-2">{[["dashboard","لوحة P2P"],["grn","استلام المواد GRN"],["match","3-Way Match"],["vendors","تقييم الموردين"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>

  {tab==="dashboard"&&<section className="erp-card mt-6 overflow-x-auto p-6"><table className="w-full min-w-[900px]"><thead><tr><th className="p-3">PO</th><th>Vendor</th><th>القيمة</th><th>التاريخ</th><th>الحالة</th><th>GRNs</th></tr></thead><tbody>{pos.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{p.po_no}</td><td>{p.vendor_name}</td><td>{money(p.amount)}</td><td>{p.po_date}</td><td>{p.status}</td><td>{grns.filter(g=>g.purchase_order_id===p.id).length}</td></tr>)}</tbody></table></section>}

  {tab==="grn"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addGrn} className="erp-card p-6"><h2 className="text-lg font-black"><FaBoxesPacking className="inline ml-2"/>Goods Receipt</h2><label className="mt-4 block"><b className="mb-2 block">PO</b><select required className="w-full rounded-xl border p-3" value={grn.purchase_order_id} onChange={e=>setGrn(x=>({...x,purchase_order_id:e.target.value}))}><option value="">اختر PO</option>{pos.map(p=><option key={p.id} value={p.id}>{p.po_no} — {p.vendor_name}</option>)}</select></label><label className="mt-4 block"><b className="mb-2 block">المورد</b><select className="w-full rounded-xl border p-3" value={grn.supplier_id} onChange={e=>setGrn(x=>({...x,supplier_id:e.target.value}))}><option value="">اختياري</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_no} — {s.name}</option>)}</select></label><F l="تاريخ الاستلام" t="date" v={grn.receipt_date} c={v=>setGrn(x=>({...x,receipt_date:v}))}/><F l="Delivery Note" v={grn.delivery_note_no} c={v=>setGrn(x=>({...x,delivery_note_no:v}))}/><F l="قيمة المستلم المقبول" t="number" v={grn.received_value} c={v=>setGrn(x=>({...x,received_value:v}))}/><label className="mt-4 block"><b className="mb-2 block">الجودة</b><select className="w-full rounded-xl border p-3" value={grn.quality_status} onChange={e=>setGrn(x=>({...x,quality_status:e.target.value}))}><option value="pending">Pending</option><option value="passed">Passed</option><option value="partial">Partial</option><option value="failed">Failed</option></select></label><button className="erp-btn-primary mt-5"><FaPlus/>تسجيل الاستلام</button></form><section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[850px]"><thead><tr><th className="p-3">GRN</th><th>PO</th><th>التاريخ</th><th>القيمة</th><th>الجودة</th><th>الحالة</th></tr></thead><tbody>{grns.map(g=><tr key={g.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{g.grn_no}</td><td>{pos.find(p=>p.id===g.purchase_order_id)?.po_no||"—"}</td><td>{g.receipt_date}</td><td>{money(g.received_value)}</td><td>{g.quality_status}</td><td>{g.status}</td></tr>)}</tbody></table></section></div>}

  {tab==="match"&&<section className="erp-card mt-6 p-6"><h2 className="text-lg font-black"><FaClipboardCheck className="inline ml-2"/>نتيجة 3-Way Match</h2>{match?<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><R t="PO Amount" v={match.purchase_order_amount}/><R t="GRN Received" v={match.received_value}/><R t="Supplier Bill" v={match.supplier_bill_amount}/><R t="PO vs Bill Diff" v={match.po_bill_difference}/><R t="GRN vs Bill Diff" v={match.grn_bill_difference}/><div className={match.is_matched?"rounded-xl bg-green-50 p-4 font-black text-green-700":"rounded-xl bg-red-50 p-4 font-black text-red-600"}>{match.is_matched?"MATCHED ✅":"NOT MATCHED"}</div></div>:<p className="mt-4 text-slate-400">اضغط زر 3-Way Match بالأعلى وأدخل PO ورقم فاتورة المورد.</p>}</section>}

  {tab==="vendors"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addReview} className="erp-card p-6"><h2 className="text-lg font-black"><FaChartLine className="inline ml-2"/>تقييم مورد</h2><label className="mt-4 block"><b className="mb-2 block">المورد</b><select required className="w-full rounded-xl border p-3" value={review.supplier_id} onChange={e=>setReview(x=>({...x,supplier_id:e.target.value}))}><option value="">اختر المورد</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_no} — {s.name}</option>)}</select></label><F l="من" t="date" v={review.review_period_start} c={v=>setReview(x=>({...x,review_period_start:v}))}/><F l="إلى" t="date" v={review.review_period_end} c={v=>setReview(x=>({...x,review_period_end:v}))}/><F l="Quality Score" t="number" v={review.quality_score} c={v=>setReview(x=>({...x,quality_score:v}))}/><F l="Delivery Score" t="number" v={review.delivery_score} c={v=>setReview(x=>({...x,delivery_score:v}))}/><F l="Commercial Score" t="number" v={review.commercial_score} c={v=>setReview(x=>({...x,commercial_score:v}))}/><F l="Responsiveness Score" t="number" v={review.responsiveness_score} c={v=>setReview(x=>({...x,responsiveness_score:v}))}/><button className="erp-btn-primary mt-5">حفظ التقييم</button></form><section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[800px]"><thead><tr><th className="p-3">المورد</th><th>Quality</th><th>Delivery</th><th>Commercial</th><th>Response</th><th>Overall</th><th>Reviews</th></tr></thead><tbody>{perf.map(p=><tr key={p.supplier_id} className="border-t"><td className="p-3 font-black">{p.supplier_name}</td><td>{p.avg_quality??"—"}</td><td>{p.avg_delivery??"—"}</td><td>{p.avg_commercial??"—"}</td><td>{p.avg_responsiveness??"—"}</td><td className="font-black">{p.avg_overall??"—"}</td><td>{p.review_count}</td></tr>)}</tbody></table></section></div>}
 </div></div>
}
function K({t,v,raw,suffix=""}){return <article className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{raw?Number(v||0).toFixed(suffix?2:0)+suffix:money(v)}</p>{!raw&&<p className="text-[10px] text-slate-300">SAR</p>}</article>}
function R({t,v}){return <div className="rounded-xl border bg-[#fbfcfd] p-4"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right font-black">{money(v)} SAR</p></div>}
function F({l,v,c,t="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required type={t} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
