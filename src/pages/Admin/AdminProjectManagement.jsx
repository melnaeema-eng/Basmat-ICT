import { useEffect, useState } from "react";
import { FaPlus, FaRotate } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const empty = {
  project_name: "",
  customer_id: "",
  opportunity_id: "",
  project_manager_id: "",
  contract_value: "",
  start_date: "",
  target_end_date: "",
  scope: "",
};

function projectNo() {
  return `PRJ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

export default function AdminProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [p,c,o,t] = await Promise.all([
      supabase.from("ict_projects").select("*,customer:ict_customers(name,company_name),manager:ict_team_members(full_name)").order("created_at",{ascending:false}),
      supabase.from("ict_customers").select("id,name,company_name").order("name"),
      supabase.from("ict_sales_opportunities").select("id,title,opportunity_no,stage").eq("stage","won").order("created_at",{ascending:false}),
      supabase.from("ict_team_members").select("id,full_name").eq("is_active",true).order("full_name"),
    ]);
    const error = p.error || c.error || o.error || t.error;
    if (error) return setMessage(error.message);
    setProjects(p.data || []); setCustomers(c.data || []); setOpportunities(o.data || []); setTeam(t.data || []);
  }

  function field(name,value){ setForm(x=>({...x,[name]:value})); }

  async function add(e){
    e.preventDefault(); setMessage("");
    if(!form.project_name.trim()) return setMessage("اسم المشروع مطلوب.");
    const {data:auth}=await supabase.auth.getUser();
    const {error}=await supabase.from("ict_projects").insert({
      project_no:projectNo(),
      project_name:form.project_name.trim(),
      customer_id:form.customer_id||null,
      opportunity_id:form.opportunity_id||null,
      project_manager_id:form.project_manager_id||null,
      contract_value:Number(form.contract_value||0),
      start_date:form.start_date||null,
      target_end_date:form.target_end_date||null,
      scope:form.scope.trim()||null,
      created_by:auth.user?.id||null
    });
    if(error) return setMessage(error.message);
    setForm(empty); setMessage("تم إنشاء المشروع."); await load();
  }

  async function updateProject(id, values){
    const {error}=await supabase.from("ict_projects").update({...values,updated_at:new Date().toISOString()}).eq("id",id);
    if(error) setMessage(error.message); else await load();
  }

  return (
    <div dir="rtl" className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap justify-between gap-4">
          <div><h1 className="text-4xl font-black text-[#071d49]">إدارة المشاريع</h1><p className="mt-3 text-slate-600">تحويل المبيعات إلى تنفيذ ومتابعة تقدم المشروع.</p></div>
          <button onClick={load} className="rounded-xl bg-[#123878] px-6 py-3 font-black text-white"><FaRotate className="inline ml-2"/>تحديث</button>
        </div>

        <form onSubmit={add} className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#071d49]">مشروع جديد</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Input label="اسم المشروع" value={form.project_name} onChange={v=>field("project_name",v)}/>
            <Select label="العميل" value={form.customer_id} onChange={v=>field("customer_id",v)} options={[["","بدون عميل"],...customers.map(x=>[x.id,x.company_name||x.name])]}/>
            <Select label="فرصة رابحة" value={form.opportunity_id} onChange={v=>field("opportunity_id",v)} options={[["","بدون فرصة"],...opportunities.map(x=>[x.id,`${x.opportunity_no} — ${x.title}`])]}/>
            <Select label="مدير المشروع" value={form.project_manager_id} onChange={v=>field("project_manager_id",v)} options={[["","غير معين"],...team.map(x=>[x.id,x.full_name])]}/>
            <Input type="number" label="قيمة العقد SAR" value={form.contract_value} onChange={v=>field("contract_value",v)}/>
            <Input type="date" label="تاريخ البداية" value={form.start_date} onChange={v=>field("start_date",v)}/>
            <Input type="date" label="النهاية المستهدفة" value={form.target_end_date} onChange={v=>field("target_end_date",v)}/>
            <label><span className="mb-2 block font-bold">نطاق العمل</span><textarea className="form-input resize-none" rows={3} value={form.scope} onChange={e=>field("scope",e.target.value)}/></label>
          </div>
          <button className="mt-6 rounded-xl bg-[#ff7417] px-6 py-3 font-black text-white"><FaPlus className="inline ml-2"/>إنشاء المشروع</button>
        </form>

        {message && <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-blue-800">{message}</div>}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map(p=><article key={p.id} className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div><p className="text-sm font-black text-blue-700">{p.project_no}</p><h2 className="mt-1 text-2xl font-black text-[#071d49]">{p.project_name}</h2><p className="mt-2 text-slate-500">{p.customer?.company_name||p.customer?.name||"بدون عميل"}</p></div>
              <span className="h-fit rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">{p.status}</span>
            </div>
            <div className="mt-5"><div className="flex justify-between text-sm font-bold"><span>التقدم</span><span>{p.progress}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#ff7417]" style={{width:`${p.progress}%`}}/></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <select value={p.status} onChange={e=>updateProject(p.id,{status:e.target.value})} className="form-input"><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
              <input type="number" min="0" max="100" value={p.progress} onChange={e=>updateProject(p.id,{progress:Number(e.target.value)})} className="form-input"/>
            </div>
            <p dir="ltr" className="mt-5 text-right text-xl font-black">{Number(p.contract_value||0).toLocaleString()} SAR</p>
            <p className="mt-2 text-sm text-slate-500">مدير المشروع: {p.manager?.full_name||"غير معين"}</p>
            <Link to={`/admin/project-commercial?project=${p.id}`} className="mt-5 inline-block rounded-xl bg-[#123878] px-5 py-3 font-black text-white">العقد والمهام والمالية</Link>
          </article>)}
        </div>
      </div>
    </div>
  );
}
function Input({label,value,onChange,type="text"}){return <label><span className="mb-2 block font-bold">{label}</span><input className="form-input" type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function Select({label,value,onChange,options}){return <label><span className="mb-2 block font-bold">{label}</span><select className="form-input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
