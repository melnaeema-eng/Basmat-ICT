import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeftLong,FaRotate,FaRoute } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const stages=[
 {key:"requests",no:"01",title:"الطلب / الاستشارة",desc:"استقبال فرصة العميل أو RFQ أو الاستشارة.",tables:["ict_contact_requests","ict_rfqs","ict_consultations"],to:"/admin/rfqs"},
 {key:"nda",no:"02",title:"NDA",desc:"إدارة اتفاقية عدم الإفصاح عند الحاجة.",tables:["ict_nda_requests"],to:"/admin/documents"},
 {key:"quotation",no:"03",title:"عرض السعر",desc:"إعداد العرض وإرساله ومتابعة قبول العميل.",tables:["ict_quotations"],to:"/admin/quotations"},
 {key:"project",no:"04",title:"إنشاء المشروع",desc:"تحويل العرض المقبول إلى مشروع وتسليم المسؤولية للتنفيذ.",tables:["ict_delivery_projects"],to:"/admin/project-management"},
 {key:"delivery",no:"05",title:"التنفيذ والمتابعة",desc:"المهام والمستندات والتكلفة والتقدم التشغيلي.",tables:["ict_project_tasks"],to:"/admin/project-commercial"},
 {key:"billing",no:"06",title:"الفوترة والتحصيل",desc:"أمر البيع والفواتير والدفعات وإجراءات التحصيل.",tables:["ict_invoices","ict_payments"],to:"/admin/order-to-cash"},
 {key:"service",no:"07",title:"الخدمة وSLA",desc:"الدعم والخدمة بعد التسليم ومتابعة SLA.",tables:["ict_support_tickets"],to:"/admin/service-management"},
];

export default function AdminWorkflowCenter(){
 const [counts,setCounts]=useState({}),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{load()},[]);
 async function load(){
  setLoading(true);setMsg("");
  const pairs=await Promise.all(stages.map(async s=>{
   let total=0,errors=[];
   for(const table of s.tables){
    const {count,error}=await supabase.from(table).select("*",{count:"exact",head:true});
    if(error)errors.push(`${table}: ${error.message}`); else total+=Number(count||0);
   }
   return [s.key,total,errors];
  }));
  const next={};const errors=[];
  pairs.forEach(([k,c,e])=>{next[k]=c;errors.push(...e)});
  setCounts(next);if(errors.length)setMsg("بعض مؤشرات الدورة لم تُقرأ: "+errors.join(" | "));
  setLoading(false);
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">END-TO-END WORKFLOW</span><h1 className="erp-page-title">دورة سير العمل</h1><p className="erp-page-subtitle">من طلب العميل حتى التنفيذ والفوترة والتحصيل والخدمة بعد التسليم.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{msg}</div>}
  <section className="mt-6 grid gap-4 lg:grid-cols-7">{stages.map((s,i)=><article key={s.key} className="erp-card relative p-5"><span className="text-xs font-black text-[#ff7417]">STEP {s.no}</span><h2 className="mt-2 font-black text-[#0f2747]">{s.title}</h2><p className="mt-2 min-h-20 text-sm leading-6 text-slate-500">{s.desc}</p><p className="mt-4 text-3xl font-black text-[#0f2747]">{loading?"…":Number(counts[s.key]||0).toLocaleString()}</p><Link to={s.to} className="mt-4 inline-flex items-center gap-2 font-black text-blue-700">فتح المرحلة <FaArrowLeftLong/></Link>{i<stages.length-1&&<span className="absolute -left-3 top-1/2 hidden text-slate-300 lg:block">←</span>}</article>)}</section>
  <section className="erp-card mt-6 p-6"><h2 className="flex items-center gap-2 text-xl font-black text-[#0f2747]"><FaRoute/>قاعدة الدورة</h2><p className="mt-3 leading-8 text-slate-600">لا تنتقل المعاملة للمرحلة التالية إلا بعد اكتمال متطلبات المرحلة الحالية. العرض المقبول يتحول إلى مشروع، ثم تتم متابعة التنفيذ والتكلفة والمستندات، وبعدها الفوترة والتحصيل، ثم الخدمة والإغلاق التشغيلي.</p></section>
 </div></div>
}