import { useEffect,useState } from "react";
import {
  FaCalendarCheck,
  FaClock,
  FaHeadset,
  FaPlus,
  FaRotate,
  FaScrewdriverWrench,
  FaShieldHalved,
  FaTriangleExclamation
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminServiceManagement(){
  const [snap,setSnap]=useState(null);
  const [tickets,setTickets]=useState([]);
  const [contracts,setContracts]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [projects,setProjects]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [visits,setVisits]=useState([]);
  const [plans,setPlans]=useState([]);
  const [tab,setTab]=useState("dashboard");
  const [msg,setMsg]=useState("");
  const [visit,setVisit]=useState({
    ticket_id:"",
    customer_id:"",
    project_id:"",
    contract_id:"",
    engineer_id:"",
    visit_type:"corrective",
    scheduled_start:"",
    scheduled_end:"",
    location:"",
    work_performed:"",
    findings:"",
    recommendations:""
  });
  const [plan,setPlan]=useState({
    customer_id:"",
    project_id:"",
    contract_id:"",
    plan_name:"",
    frequency:"quarterly",
    next_visit_date:today,
    assigned_engineer_id:"",
    scope:""
  });

  useEffect(()=>{load()},[]);

  async function load(){
    const [s,t,c,cu,p,e,v,pm]=await Promise.all([
      supabase.rpc("ict_service_management_snapshot"),
      supabase.from("ict_support_tickets").select("*").order("created_at",{ascending:false}).limit(200),
      supabase.from("ict_contracts").select("id,contract_no,title,customer_id,status,start_date,end_date").order("created_at",{ascending:false}),
      supabase.from("ict_customers").select("id,name,company_name,status").order("name"),
      supabase.from("ict_delivery_projects").select("id,project_no,project_name,customer_id,status").order("created_at",{ascending:false}),
      supabase.from("ict_hr_employees").select("id,employee_code,full_name,status").eq("status","active").order("full_name"),
      supabase.from("ict_service_visits").select("*").order("scheduled_start",{ascending:false}).limit(200),
      supabase.from("ict_preventive_maintenance_plans").select("*").order("next_visit_date").limit(200)
    ]);

    const err=s.error||t.error||c.error||cu.error||p.error||e.error||v.error||pm.error;

    if(err){
      setMsg(err.message);
      return;
    }

    setSnap(s.data||null);
    setTickets(t.data||[]);
    setContracts(c.data||[]);
    setCustomers(cu.data||[]);
    setProjects(p.data||[]);
    setEmployees(e.data||[]);
    setVisits(v.data||[]);
    setPlans(pm.data||[]);
  }

  async function applySla(ticketId){
    const {data,error}=await supabase.rpc("ict_apply_ticket_sla",{p_ticket_id:ticketId});
    if(error)setMsg(error.message);
    else{
      setMsg(data?.sla_applied?"تم تطبيق SLA على التذكرة.":"لم يتم تطبيق SLA لعدم وجود عقد أو سياسة مطابقة.");
      load();
    }
  }

  async function refreshSla(){
    const {data,error}=await supabase.rpc("ict_refresh_sla_status");
    if(error)setMsg(error.message);
    else{
      setMsg(`تم تحديث حالة SLA لـ ${data||0} تذكرة.`);
      load();
    }
  }

  async function addVisit(e){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();

    const payload={
      ...visit,
      ticket_id:visit.ticket_id||null,
      project_id:visit.project_id||null,
      contract_id:visit.contract_id||null,
      engineer_id:visit.engineer_id||null,
      scheduled_start:visit.scheduled_start||null,
      scheduled_end:visit.scheduled_end||null,
      created_by:user?.id||null
    };

    const {error}=await supabase.from("ict_service_visits").insert(payload);

    if(error)setMsg(error.message);
    else{
      setMsg("تم إنشاء الزيارة الميدانية.");
      setVisit({
        ticket_id:"",
        customer_id:"",
        project_id:"",
        contract_id:"",
        engineer_id:"",
        visit_type:"corrective",
        scheduled_start:"",
        scheduled_end:"",
        location:"",
        work_performed:"",
        findings:"",
        recommendations:""
      });
      load();
    }
  }

  async function completeVisit(row){
    const {error}=await supabase
      .from("ict_service_visits")
      .update({
        status:"completed",
        actual_end:new Date().toISOString(),
        updated_at:new Date().toISOString()
      })
      .eq("id",row.id);

    if(error)setMsg(error.message);
    else{
      setMsg("تم إغلاق الزيارة.");
      load();
    }
  }

  async function addPlan(e){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();

    const {error}=await supabase.from("ict_preventive_maintenance_plans").insert({
      ...plan,
      project_id:plan.project_id||null,
      contract_id:plan.contract_id||null,
      assigned_engineer_id:plan.assigned_engineer_id||null,
      created_by:user?.id||null
    });

    if(error)setMsg(error.message);
    else{
      setMsg("تم حفظ خطة الصيانة الوقائية.");
      setPlan({
        customer_id:"",
        project_id:"",
        contract_id:"",
        plan_name:"",
        frequency:"quarterly",
        next_visit_date:today,
        assigned_engineer_id:"",
        scope:""
      });
      load();
    }
  }

  return <div dir="rtl" className="erp-page">
    <div className="mx-auto max-w-[1500px]">
      <section className="erp-page-header">
        <div>
          <span className="erp-eyebrow">SERVICE MANAGEMENT</span>
          <h1 className="erp-page-title">إدارة الخدمات وSLA والصيانة الميدانية</h1>
          <p className="erp-page-subtitle">
            ربط الدعم بالعقود وSLA، الزيارات الميدانية، والصيانة الوقائية.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshSla} className="erp-btn-primary">
            <FaShieldHalved/>
            تحديث SLA
          </button>
          <button onClick={load} className="erp-btn-secondary">
            <FaRotate/>
            تحديث
          </button>
        </div>
      </section>

      {msg&&
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">
          {msg}
        </div>
      }

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <K t="Open Tickets" v={snap?.open_tickets}/>
        <K t="Urgent Tickets" v={snap?.urgent_tickets}/>
        <K t="SLA On Track" v={snap?.sla_on_track}/>
        <K t="SLA Breached" v={snap?.sla_breached}/>
        <K t="Resolved" v={snap?.resolved_tickets}/>
        <K t="Visits Today" v={snap?.visits_today}/>
        <K t="PM Due 30 Days" v={snap?.pm_due_30_days}/>
        <K t="Parts Cost" v={snap?.service_parts_cost} moneyValue/>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["dashboard","لوحة الخدمة"],
          ["sla","SLA والتذاكر"],
          ["visits","الزيارات الميدانية"],
          ["pm","الصيانة الوقائية"]
        ].map(([k,l])=>
          <button
            key={k}
            onClick={()=>setTab(k)}
            className={
              tab===k
              ?"rounded-xl bg-[#ff7417] px-4 py-2 font-black text-white"
              :"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"
            }
          >
            {l}
          </button>
        )}
      </div>

      {tab==="dashboard"&&
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="erp-card p-6">
            <h2 className="text-lg font-black text-[#0f2747]">SLA Operations</h2>
            <Info t="تذاكر ضمن SLA" v={snap?.sla_on_track}/>
            <Info t="تذاكر متجاوزة SLA" v={snap?.sla_breached} danger/>
            <Info t="تذاكر عاجلة مفتوحة" v={snap?.urgent_tickets} danger/>
          </section>

          <section className="erp-card p-6">
            <h2 className="text-lg font-black text-[#0f2747]">Field Service</h2>
            <Info t="زيارات اليوم" v={snap?.visits_today}/>
            <Info t="PM مستحق خلال 30 يوم" v={snap?.pm_due_30_days}/>
            <Info t="تكلفة قطع الخدمة" v={money(snap?.service_parts_cost)+" SAR"}/>
          </section>
        </div>
      }

      {tab==="sla"&&
        <section className="erp-card mt-6 overflow-x-auto p-6">
          <div className="mb-5 flex items-center gap-3">
            <FaHeadset className="text-[#345a82]"/>
            <h2 className="text-lg font-black">التذاكر وSLA</h2>
          </div>

          <table className="w-full min-w-[1100px]">
            <thead>
              <tr>
                <th className="p-3">التذكرة</th>
                <th>الموضوع</th>
                <th>الأولوية</th>
                <th>Severity</th>
                <th>العقد</th>
                <th>Response Due</th>
                <th>Resolution Due</th>
                <th>SLA</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t=>
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-black text-[#345a82]">{t.ticket_no}</td>
                  <td>{t.subject}</td>
                  <td>{t.priority}</td>
                  <td>{t.severity||"—"}</td>
                  <td>{contracts.find(c=>c.id===t.contract_id)?.contract_no||"—"}</td>
                  <td>{t.response_due_at?new Date(t.response_due_at).toLocaleString("ar-SA"):"—"}</td>
                  <td>{t.resolution_due_at?new Date(t.resolution_due_at).toLocaleString("ar-SA"):"—"}</td>
                  <td><SlaBadge value={t.sla_status}/></td>
                  <td>
                    <button
                      onClick={()=>applySla(t.id)}
                      className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white"
                    >
                      تطبيق SLA
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      }

      {tab==="visits"&&
        <div className="mt-6 grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
          <form onSubmit={addVisit} className="erp-card p-6">
            <h2 className="text-lg font-black">
              <FaScrewdriverWrench className="inline ml-2"/>
              زيارة ميدانية
            </h2>

            <Select label="العميل" value={visit.customer_id} onChange={v=>setVisit(x=>({...x,customer_id:v}))}>
              <option value="">اختر العميل</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}
            </Select>

            <Select label="التذكرة" value={visit.ticket_id} onChange={v=>setVisit(x=>({...x,ticket_id:v}))}>
              <option value="">بدون تذكرة</option>
              {tickets.map(t=><option key={t.id} value={t.id}>{t.ticket_no} — {t.subject}</option>)}
            </Select>

            <Select label="المشروع" value={visit.project_id} onChange={v=>setVisit(x=>({...x,project_id:v}))}>
              <option value="">بدون مشروع</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.project_no} — {p.project_name}</option>)}
            </Select>

            <Select label="العقد" value={visit.contract_id} onChange={v=>setVisit(x=>({...x,contract_id:v}))}>
              <option value="">بدون عقد</option>
              {contracts.map(c=><option key={c.id} value={c.id}>{c.contract_no} — {c.title}</option>)}
            </Select>

            <Select label="المهندس" value={visit.engineer_id} onChange={v=>setVisit(x=>({...x,engineer_id:v}))}>
              <option value="">غير محدد</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.employee_code||""} — {e.full_name}</option>)}
            </Select>

            <Select label="نوع الزيارة" value={visit.visit_type} onChange={v=>setVisit(x=>({...x,visit_type:v}))}>
              <option value="corrective">Corrective</option>
              <option value="preventive">Preventive</option>
              <option value="inspection">Inspection</option>
              <option value="installation">Installation</option>
              <option value="survey">Survey</option>
              <option value="other">Other</option>
            </Select>

            <Field label="موعد البداية" type="datetime-local" value={visit.scheduled_start} onChange={v=>setVisit(x=>({...x,scheduled_start:v}))}/>
            <Field label="موعد النهاية" type="datetime-local" value={visit.scheduled_end} onChange={v=>setVisit(x=>({...x,scheduled_end:v}))}/>
            <Field label="الموقع" value={visit.location} onChange={v=>setVisit(x=>({...x,location:v}))}/>

            <button className="erp-btn-primary mt-5">
              <FaPlus/>
              إنشاء الزيارة
            </button>
          </form>

          <section className="erp-card overflow-x-auto p-6">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr>
                  <th className="p-3">Visit</th>
                  <th>العميل</th>
                  <th>المهندس</th>
                  <th>النوع</th>
                  <th>الموعد</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v=>
                  <tr key={v.id} className="border-t">
                    <td className="p-3 font-black text-[#345a82]">{v.visit_no}</td>
                    <td>{customers.find(c=>c.id===v.customer_id)?.company_name||customers.find(c=>c.id===v.customer_id)?.name||"—"}</td>
                    <td>{employees.find(e=>e.id===v.engineer_id)?.full_name||"—"}</td>
                    <td>{v.visit_type}</td>
                    <td>{v.scheduled_start?new Date(v.scheduled_start).toLocaleString("ar-SA"):"—"}</td>
                    <td>{v.status}</td>
                    <td>
                      {v.status!=="completed"&&v.status!=="cancelled"
                        ?<button
                          onClick={()=>completeVisit(v)}
                          className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700"
                        >
                          إغلاق
                        </button>
                        :"—"
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      }

      {tab==="pm"&&
        <div className="mt-6 grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
          <form onSubmit={addPlan} className="erp-card p-6">
            <h2 className="text-lg font-black">
              <FaCalendarCheck className="inline ml-2"/>
              خطة صيانة وقائية
            </h2>

            <Select label="العميل" value={plan.customer_id} onChange={v=>setPlan(x=>({...x,customer_id:v}))}>
              <option value="">اختر العميل</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}
            </Select>

            <Field label="اسم الخطة" value={plan.plan_name} onChange={v=>setPlan(x=>({...x,plan_name:v}))}/>

            <Select label="التكرار" value={plan.frequency} onChange={v=>setPlan(x=>({...x,frequency:v}))}>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="semi_annual">نصف سنوي</option>
              <option value="annual">سنوي</option>
            </Select>

            <Field label="الزيارة القادمة" type="date" value={plan.next_visit_date} onChange={v=>setPlan(x=>({...x,next_visit_date:v}))}/>

            <Select label="العقد" value={plan.contract_id} onChange={v=>setPlan(x=>({...x,contract_id:v}))}>
              <option value="">بدون عقد</option>
              {contracts.map(c=><option key={c.id} value={c.id}>{c.contract_no} — {c.title}</option>)}
            </Select>

            <Select label="المهندس" value={plan.assigned_engineer_id} onChange={v=>setPlan(x=>({...x,assigned_engineer_id:v}))}>
              <option value="">غير محدد</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>

            <Field label="النطاق" value={plan.scope} onChange={v=>setPlan(x=>({...x,scope:v}))}/>

            <button className="erp-btn-primary mt-5">
              <FaPlus/>
              حفظ الخطة
            </button>
          </form>

          <section className="erp-card overflow-x-auto p-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="p-3">Plan</th>
                  <th>العميل</th>
                  <th>الخطة</th>
                  <th>التكرار</th>
                  <th>الزيارة القادمة</th>
                  <th>المهندس</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(p=>
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-black text-[#345a82]">{p.plan_no}</td>
                    <td>{customers.find(c=>c.id===p.customer_id)?.company_name||customers.find(c=>c.id===p.customer_id)?.name||"—"}</td>
                    <td>{p.plan_name}</td>
                    <td>{p.frequency}</td>
                    <td>{p.next_visit_date}</td>
                    <td>{employees.find(e=>e.id===p.assigned_engineer_id)?.full_name||"—"}</td>
                    <td>{p.status}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      }
    </div>
  </div>
}

function K({t,v,moneyValue=false}){
  return <article className="erp-card p-5">
    <p className="text-xs font-bold text-slate-400">{t}</p>
    <p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">
      {moneyValue?money(v):Number(v||0).toLocaleString("en-US")}
    </p>
    {moneyValue&&<p className="text-[10px] text-slate-300">SAR</p>}
  </article>
}

function Info({t,v,danger=false}){
  return <div className={[
    "mt-4 flex items-center justify-between rounded-xl border p-4",
    danger?"border-red-100 bg-red-50/50":"border-slate-100 bg-[#fbfcfd]"
  ].join(" ")}>
    <b>{t}</b>
    <strong className={danger?"text-red-600":"text-[#0f2747]"}>{v??0}</strong>
  </div>
}

function SlaBadge({value}){
  const cls=value==="met"
    ?"bg-green-50 text-green-700"
    :value==="on_track"
    ?"bg-blue-50 text-blue-700"
    :value==="response_breached"||value==="resolution_breached"
    ?"bg-red-50 text-red-600"
    :"bg-slate-100 text-slate-500";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>
    {value||"not_applied"}
  </span>
}

function Field({label,value,onChange,type="text"}){
  return <label className="mt-4 block">
    <b className="mb-2 block">{label}</b>
    <input
      type={type}
      value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full rounded-xl border p-3"
    />
  </label>
}

function Select({label,value,onChange,children}){
  return <label className="mt-4 block">
    <b className="mb-2 block">{label}</b>
    <select
      value={value}
      onChange={e=>onChange(e.target.value)}
      className="w-full rounded-xl border p-3"
    >
      {children}
    </select>
  </label>
}
