import {useEffect,useState} from "react";
import {FaBoxesStacked,FaBuilding,FaComputer,FaMoneyCheckDollar,FaPlus,FaRotate,FaUsers} from "react-icons/fa6";
import {supabase} from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=new Date().toISOString().slice(0,10);

export default function AdminOperationsResources({ mode = "all" }){
 const defaultTab=mode==="assets"?"assets":mode==="attendance"?"people":mode==="payroll"?"payroll":"inventory";
 const [snap,setSnap]=useState({}),[wh,setWh]=useState([]),[items,setItems]=useState([]),[balances,setBalances]=useState([]),[assets,setAssets]=useState([]),[employees,setEmployees]=useState([]),[attendance,setAttendance]=useState([]),[leaves,setLeaves]=useState([]),[runs,setRuns]=useState([]),[tab,setTab]=useState(defaultTab),[msg,setMsg]=useState("");
 const [warehouse,setWarehouse]=useState({name:"",location:""}),[item,setItem]=useState({name:"",sku:"",category:"",unit:"pcs",item_type:"stock",standard_cost:"0",reorder_level:"0",serial_tracking:false});
 const [movement,setMovement]=useState({warehouse_id:"",item_id:"",transaction_type:"receipt",quantity:"1",unit_cost:"0",reference_no:""});
 const [asset,setAsset]=useState({asset_name:"",category:"",serial_no:"",purchase_date:today,purchase_cost:"0",status:"available"});
 const [att,setAtt]=useState({employee_id:"",attendance_date:today,status:"present",overtime_hours:"0"});
 const [leave,setLeave]=useState({employee_id:"",leave_type:"annual",start_date:today,end_date:today,days:"1",reason:""});
 const [comp,setComp]=useState({employee_id:"",basic_salary:"0",housing_allowance:"0",transport_allowance:"0",other_allowances:"0",social_insurance_employee:"0",other_deductions:"0"});
 const [run,setRun]=useState({period_start:today.slice(0,8)+"01",period_end:today});
 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   try{
    await load();
   }catch(error){
    if(!cancelled)setMsg(error?.message||"حدث خطأ أثناء تحميل البيانات.");
   }
  })();
  return()=>{cancelled=true};
 },[mode]);
 async function load(){

  if(mode==="inventory"){
   const [w,i,b]=await Promise.all([
    supabase.from("ict_warehouses").select("*").order("name"),
    supabase.from("ict_inventory_items").select("*").order("name"),
    supabase.from("ict_inventory_balances").select("*")
   ]);
   const err=w.error||i.error||b.error;
   if(err)return setMsg(err.message);

   const warehouses=w.data||[];
   const inventoryItems=i.data||[];
   const inventoryBalances=b.data||[];
   const stockValue=inventoryBalances.reduce((sum,row)=>{
    const item=inventoryItems.find(x=>x.id===row.item_id);
    return sum+(Number(row.quantity_on_hand||0)*Number(item?.standard_cost||0));
   },0);
   const lowStock=inventoryBalances.filter(row=>{
    const item=inventoryItems.find(x=>x.id===row.item_id);
    return Number(row.quantity_on_hand||0)<=Number(item?.reorder_level||0);
   }).length;

   setWh(warehouses);
   setItems(inventoryItems);
   setBalances(inventoryBalances);
   setSnap({
    warehouses:warehouses.filter(x=>x.status==="active").length,
    inventory_items:inventoryItems.length,
    stock_value:stockValue,
    low_stock_items:lowStock
   });
   return;
  }

  if(mode==="assets"){
   const {data,error}=await supabase.from("ict_assets").select("*").order("created_at",{ascending:false});
   if(error)return setMsg(error.message);
   const list=data||[];
   setAssets(list);
   setSnap({
    assets:list.filter(x=>x.status!=="disposed").length,
    assigned_assets:list.filter(x=>x.status==="assigned").length
   });
   return;
  }

  if(mode==="attendance"){
   const [e,at,l]=await Promise.all([
    supabase.from("ict_hr_employees").select("id,employee_code,full_name,status").eq("status","active").order("full_name"),
    supabase.from("ict_hr_attendance").select("*").eq("attendance_date",today),
    supabase.from("ict_hr_leave_requests").select("*").order("created_at",{ascending:false}).limit(100)
   ]);
   const err=e.error||at.error||l.error;
   if(err)return setMsg(err.message);

   const employeeRows=e.data||[];
   const attendanceRows=at.data||[];
   const leaveRows=l.data||[];

   setEmployees(employeeRows);
   setAttendance(attendanceRows);
   setLeaves(leaveRows);
   setSnap({
    active_employees:employeeRows.length,
    present_today:attendanceRows.filter(x=>["present","late","remote"].includes(x.status)).length,
    on_leave_today:leaveRows.filter(x=>x.status==="approved"&&x.start_date<=today&&x.end_date>=today).length
   });
   return;
  }

  if(mode==="payroll"){
   const [e,r]=await Promise.all([
    supabase.from("ict_hr_employees").select("id,employee_code,full_name,status").eq("status","active").order("full_name"),
    supabase.from("ict_payroll_runs").select("*").order("created_at",{ascending:false})
   ]);
   const err=e.error||r.error;
   if(err)return setMsg(err.message);

   const employeeRows=e.data||[];
   const payrollRows=r.data||[];
   setEmployees(employeeRows);
   setRuns(payrollRows);
   setSnap({
    active_employees:employeeRows.length,
    payroll_value:payrollRows
      .filter(x=>["calculated","approved","posted"].includes(x.status))
      .reduce((sum,x)=>sum+Number(x.net_total||0),0)
   });
   return;
  }
 }
 async function add(table,payload,ok){const {error}=await supabase.from(table).insert(payload);if(error)setMsg(error.message);else{setMsg(ok);load()}}
 async function postMovement(e){e.preventDefault();const {error}=await supabase.rpc("ict_post_inventory_transaction",{p_warehouse_id:movement.warehouse_id,p_item_id:movement.item_id,p_type:movement.transaction_type,p_quantity:Number(movement.quantity),p_unit_cost:Number(movement.unit_cost||0),p_project_id:null,p_goods_receipt_id:null,p_reference_no:movement.reference_no||null,p_notes:null});if(error)setMsg(error.message);else{setMsg("تم ترحيل حركة المخزون.");load()}}
 async function calc(id){const {data,error}=await supabase.rpc("ict_calculate_payroll",{p_run_id:id});if(error)setMsg(error.message);else{setMsg(`تم احتساب رواتب ${data?.employees||0} موظف.`);load()}}
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">{mode==="inventory"?"INVENTORY & WAREHOUSES":mode==="assets"?"ASSET & CUSTODY MANAGEMENT":mode==="attendance"?"ATTENDANCE & LEAVE":mode==="payroll"?"HR & PAYROLL":"OPERATIONS"}</span><h1 className="erp-page-title">{mode==="inventory"?"المخزون والمستودعات":mode==="assets"?"الأصول والعهد":mode==="attendance"?"الحضور والإجازات":mode==="payroll"?"الموارد البشرية والرواتب":"العمليات"}</h1><p className="erp-page-subtitle">{mode==="inventory"?"إدارة المستودعات والأصناف والأرصدة وحركات المخزون.":mode==="assets"?"إدارة الأصول والعهد وربطها بالموظفين والمشاريع.":mode==="attendance"?"إدارة الحضور والإجازات والغياب والعمل عن بعد.":mode==="payroll"?"إدارة التعويضات والبدلات والخصومات ودورات الرواتب.":"إدارة العمليات."}</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{mode==="inventory"&&<><K t="المستودعات" v={snap.warehouses}/><K t="أصناف المخزون" v={snap.inventory_items}/><K t="قيمة المخزون" v={snap.stock_value} m/><K t="Low Stock" v={snap.low_stock_items}/></>}{mode==="assets"&&<><K t="الأصول" v={snap.assets}/><K t="العهد النشطة" v={snap.assigned_assets}/></>}{mode==="attendance"&&<><K t="الموظفون" v={snap.active_employees}/><K t="الحضور اليوم" v={snap.present_today}/><K t="إجازة اليوم" v={snap.on_leave_today}/></>}{mode==="payroll"&&<><K t="الموظفون" v={snap.active_employees}/><K t="Payroll Value" v={snap.payroll_value} m/></>}</div>
    {tab==="inventory"&&<div className="mt-6 grid gap-6 xl:grid-cols-3">
   <form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_warehouses",warehouse,"تم إنشاء المستودع.")}}><H i={<FaBuilding/>} t="مستودع جديد"/><F l="الاسم" v={warehouse.name} c={v=>setWarehouse(x=>({...x,name:v}))}/><F l="الموقع" v={warehouse.location} c={v=>setWarehouse(x=>({...x,location:v}))}/><button className="erp-btn-primary mt-5"><FaPlus/>إضافة</button></form>
   <form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_inventory_items",{...item,standard_cost:Number(item.standard_cost),reorder_level:Number(item.reorder_level)},"تم إنشاء الصنف.")}}><H i={<FaBoxesStacked/>} t="صنف مخزون"/><F l="اسم الصنف" v={item.name} c={v=>setItem(x=>({...x,name:v}))}/><F l="SKU" v={item.sku} c={v=>setItem(x=>({...x,sku:v}))}/><F l="التكلفة القياسية" type="number" v={item.standard_cost} c={v=>setItem(x=>({...x,standard_cost:v}))}/><F l="حد إعادة الطلب" type="number" v={item.reorder_level} c={v=>setItem(x=>({...x,reorder_level:v}))}/><button className="erp-btn-primary mt-5"><FaPlus/>إضافة</button></form>
   <form className="erp-card p-6" onSubmit={postMovement}><H i={<FaBoxesStacked/>} t="حركة مخزون"/><S l="المستودع" v={movement.warehouse_id} c={v=>setMovement(x=>({...x,warehouse_id:v}))}>{wh.map(x=><option key={x.id} value={x.id}>{x.warehouse_no} — {x.name}</option>)}</S><S l="الصنف" v={movement.item_id} c={v=>setMovement(x=>({...x,item_id:v}))}>{items.map(x=><option key={x.id} value={x.id}>{x.item_no} — {x.name}</option>)}</S><S l="الحركة" v={movement.transaction_type} c={v=>setMovement(x=>({...x,transaction_type:v}))}><option value="receipt">Receipt</option><option value="issue">Issue</option><option value="return">Return</option><option value="adjustment_in">Adjustment In</option><option value="adjustment_out">Adjustment Out</option></S><F l="الكمية" type="number" v={movement.quantity} c={v=>setMovement(x=>({...x,quantity:v}))}/><F l="التكلفة" type="number" v={movement.unit_cost} c={v=>setMovement(x=>({...x,unit_cost:v}))}/><button className="erp-btn-primary mt-5">ترحيل الحركة</button></form>
   <section className="erp-card p-6 xl:col-span-3 overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr><th className="p-3">المستودع</th><th>الصنف</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>القيمة</th></tr></thead><tbody>{balances.map(b=>{const i=items.find(x=>x.id===b.item_id);return <tr key={b.id} className="border-t"><td className="p-3">{wh.find(x=>x.id===b.warehouse_id)?.name||"—"}</td><td>{i?.name||"—"}</td><td>{b.quantity_on_hand}</td><td>{b.quantity_reserved}</td><td className="font-black">{Number(b.quantity_on_hand)-Number(b.quantity_reserved)}</td><td>{money(Number(b.quantity_on_hand)*Number(i?.standard_cost||0))}</td></tr>})}</tbody></table></section>
  </div>}

  {tab==="assets"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_assets",{...asset,purchase_cost:Number(asset.purchase_cost)},"تم تسجيل الأصل.")}}><H i={<FaComputer/>} t="أصل جديد"/><F l="اسم الأصل" v={asset.asset_name} c={v=>setAsset(x=>({...x,asset_name:v}))}/><F l="الفئة" v={asset.category} c={v=>setAsset(x=>({...x,category:v}))}/><F l="Serial Number" v={asset.serial_no} c={v=>setAsset(x=>({...x,serial_no:v}))}/><F l="تاريخ الشراء" type="date" v={asset.purchase_date} c={v=>setAsset(x=>({...x,purchase_date:v}))}/><F l="التكلفة" type="number" v={asset.purchase_cost} c={v=>setAsset(x=>({...x,purchase_cost:v}))}/><button className="erp-btn-primary mt-5">تسجيل الأصل</button></form><section className="erp-card p-6 overflow-x-auto"><table className="w-full min-w-[800px]"><thead><tr><th className="p-3">Asset</th><th>الاسم</th><th>Serial</th><th>التكلفة</th><th>الحالة</th></tr></thead><tbody>{assets.map(a=><tr key={a.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{a.asset_no}</td><td>{a.asset_name}</td><td>{a.serial_no||"—"}</td><td>{money(a.purchase_cost)}</td><td>{a.status}</td></tr>)}</tbody></table></section></div>}

  {tab==="people"&&<div className="mt-6 grid gap-6 xl:grid-cols-2"><form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_hr_attendance",{...att,overtime_hours:Number(att.overtime_hours)},"تم تسجيل الحضور.")}}><H i={<FaUsers/>} t="الحضور"/><ES employees={employees} v={att.employee_id} c={v=>setAtt(x=>({...x,employee_id:v}))}/><F l="التاريخ" type="date" v={att.attendance_date} c={v=>setAtt(x=>({...x,attendance_date:v}))}/><S l="الحالة" v={att.status} c={v=>setAtt(x=>({...x,status:v}))}><option value="present">Present</option><option value="late">Late</option><option value="remote">Remote</option><option value="absent">Absent</option></S><F l="Overtime Hours" type="number" v={att.overtime_hours} c={v=>setAtt(x=>({...x,overtime_hours:v}))}/><button className="erp-btn-primary mt-5">حفظ</button></form><form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_hr_leave_requests",{...leave,days:Number(leave.days)},"تم تسجيل طلب الإجازة.")}}><H i={<FaUsers/>} t="طلب إجازة"/><ES employees={employees} v={leave.employee_id} c={v=>setLeave(x=>({...x,employee_id:v}))}/><S l="النوع" v={leave.leave_type} c={v=>setLeave(x=>({...x,leave_type:v}))}><option value="annual">Annual</option><option value="sick">Sick</option><option value="emergency">Emergency</option><option value="unpaid">Unpaid</option></S><F l="من" type="date" v={leave.start_date} c={v=>setLeave(x=>({...x,start_date:v}))}/><F l="إلى" type="date" v={leave.end_date} c={v=>setLeave(x=>({...x,end_date:v}))}/><F l="الأيام" type="number" v={leave.days} c={v=>setLeave(x=>({...x,days:v}))}/><button className="erp-btn-primary mt-5">إرسال الطلب</button></form></div>}

  {tab==="payroll"&&<div className="mt-6 grid gap-6 xl:grid-cols-3"><form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_hr_compensation",{...comp,basic_salary:Number(comp.basic_salary),housing_allowance:Number(comp.housing_allowance),transport_allowance:Number(comp.transport_allowance),other_allowances:Number(comp.other_allowances),social_insurance_employee:Number(comp.social_insurance_employee),other_deductions:Number(comp.other_deductions)},"تم حفظ التعويضات.")}}><H i={<FaMoneyCheckDollar/>} t="تعويضات الموظف"/><ES employees={employees} v={comp.employee_id} c={v=>setComp(x=>({...x,employee_id:v}))}/><F l="Basic" type="number" v={comp.basic_salary} c={v=>setComp(x=>({...x,basic_salary:v}))}/><F l="Housing" type="number" v={comp.housing_allowance} c={v=>setComp(x=>({...x,housing_allowance:v}))}/><F l="Transport" type="number" v={comp.transport_allowance} c={v=>setComp(x=>({...x,transport_allowance:v}))}/><F l="Other Allowances" type="number" v={comp.other_allowances} c={v=>setComp(x=>({...x,other_allowances:v}))}/><F l="Deductions" type="number" v={comp.other_deductions} c={v=>setComp(x=>({...x,other_deductions:v}))}/><button className="erp-btn-primary mt-5">حفظ</button></form><form className="erp-card p-6" onSubmit={e=>{e.preventDefault();add("ict_payroll_runs",run,"تم إنشاء دورة الرواتب.")}}><H i={<FaMoneyCheckDollar/>} t="Payroll Run"/><F l="بداية الفترة" type="date" v={run.period_start} c={v=>setRun(x=>({...x,period_start:v}))}/><F l="نهاية الفترة" type="date" v={run.period_end} c={v=>setRun(x=>({...x,period_end:v}))}/><button className="erp-btn-primary mt-5">إنشاء الدورة</button></form><section className="erp-card p-6 overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr><th className="p-3">Run</th><th>Net</th><th>Status</th><th></th></tr></thead><tbody>{runs.map(r=><tr key={r.id} className="border-t"><td className="p-3 font-black">{r.run_no}</td><td>{money(r.net_total)}</td><td>{r.status}</td><td><button onClick={()=>calc(r.id)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">احتساب</button></td></tr>)}</tbody></table></section></div>}
 </div></div>
}
function K({t,v,m=false}){return <article className="erp-card p-5"><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{m?money(v):Number(v||0).toLocaleString()}</p>{m&&<small className="text-slate-300">SAR</small>}</article>}
function H({i,t}){return <h2 className="flex items-center gap-2 text-lg font-black">{i}{t}</h2>}
function F({l,v,c,type="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input required type={type} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
function S({l,v,c,children}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><select required value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"><option value="">اختر</option>{children}</select></label>}
function ES({employees,v,c}){return <S l="الموظف" v={v} c={c}>{employees.map(e=><option key={e.id} value={e.id}>{e.employee_code||""} — {e.full_name}</option>)}</S>}
