import { useEffect, useState } from "react";
import { FaArrowDown,FaArrowUp,FaBuildingColumns,FaPlus,FaRotate,FaScaleBalanced,FaWallet } from "react-icons/fa6";
import { supabase } from "../../lib/supabase";
const money=v=>Number(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});

export default function AdminTreasury(){
 const [position,setPosition]=useState(null),[accounts,setAccounts]=useState([]),[bills,setBills]=useState([]),[suppliers,setSuppliers]=useState([]),[tab,setTab]=useState("overview"),[msg,setMsg]=useState("");
 const [account,setAccount]=useState({account_name:"",bank_name:"",iban:"",opening_balance:"",account_type:"bank"});
 const [bill,setBill]=useState({supplier_id:"",supplier_invoice_no:"",bill_date:new Date().toISOString().slice(0,10),due_date:"",subtotal:"",tax_amount:""});
 useEffect(()=>{load()},[]);
 async function load(){
  const [p,a,b,s]=await Promise.all([
   supabase.rpc("ict_treasury_position"),
   supabase.from("ict_treasury_accounts").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_supplier_bills").select("*").order("created_at",{ascending:false}),
   supabase.from("ict_suppliers").select("id,supplier_no,name,status").order("name")
  ]);
  const e=p.error||a.error||b.error||s.error;
  if(e)setMsg(e.message); else {setPosition(p.data);setAccounts(a.data||[]);setBills(b.data||[]);setSuppliers(s.data||[]);}
 }
 async function addAccount(e){e.preventDefault();const opening=Number(account.opening_balance||0);
  const {error}=await supabase.from("ict_treasury_accounts").insert({...account,opening_balance:opening,current_balance:opening,status:"active"});
  if(error)setMsg(error.message);else{setMsg("تمت إضافة الحساب.");setAccount({account_name:"",bank_name:"",iban:"",opening_balance:"",account_type:"bank"});load()}
 }
 async function addBill(e){e.preventDefault();const subtotal=Number(bill.subtotal||0),tax=Number(bill.tax_amount||0),total=subtotal+tax;
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("ict_supplier_bills").insert({...bill,due_date:bill.due_date||null,subtotal,tax_amount:tax,total_amount:total,amount_paid:0,balance_due:total,status:"open",created_by:user?.id||null});
  if(error)setMsg(error.message);else{setMsg("تم تسجيل فاتورة المورد.");setBill({supplier_id:"",supplier_invoice_no:"",bill_date:new Date().toISOString().slice(0,10),due_date:"",subtotal:"",tax_amount:""});load()}
 }
 async function cashMove(type){
  if(!accounts.length){setMsg("أضف حساب خزينة أولًا.");return;}
  const no=window.prompt("رقم الحساب مثل BANK-0001"); if(!no)return;
  const acc=accounts.find(a=>a.account_no.toLowerCase()===no.toLowerCase()); if(!acc){setMsg("الحساب غير موجود.");return;}
  const amount=window.prompt("المبلغ"); if(!amount)return;
  const category=window.prompt("التصنيف","general")||"general";
  const {error}=await supabase.rpc("ict_treasury_move",{p_account_id:acc.id,p_transaction_type:type,p_category:category,p_amount:Number(amount),p_transaction_date:new Date().toISOString().slice(0,10),p_reference_type:null,p_reference_id:null,p_reference_no:null,p_description:null});
  if(error)setMsg(error.message);else{setMsg("تمت حركة الخزينة.");load()}
 }
 async function payBill(row){
  if(!accounts.length){setMsg("أضف حساب خزينة أولًا.");return;}
  const no=window.prompt("رقم حساب السداد"); if(!no)return;
  const acc=accounts.find(a=>a.account_no.toLowerCase()===no.toLowerCase()); if(!acc){setMsg("الحساب غير موجود.");return;}
  const amount=window.prompt("المبلغ",String(row.balance_due)); if(!amount)return;
  const {error}=await supabase.rpc("ict_pay_supplier_bill",{p_bill_id:row.id,p_account_id:acc.id,p_amount:Number(amount),p_payment_date:new Date().toISOString().slice(0,10),p_reference_no:null});
  if(error)setMsg(error.message);else{setMsg("تم سداد فاتورة المورد.");load()}
 }
 return <div dir="rtl" className="erp-page"><div className="mx-auto max-w-[1500px]">
  <section className="erp-page-header"><div><span className="erp-eyebrow">TREASURY & WORKING CAPITAL</span><h1 className="erp-page-title">الخزينة والذمم والتحصيل</h1><p className="erp-page-subtitle">Cash Position، AR/AP Aging، البنوك والموردون والسيولة.</p></div><button onClick={load} className="erp-btn-secondary"><FaRotate/>تحديث</button></section>
  {msg&&<div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">{msg}</div>}
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   <K t="Cash Position" v={position?.cash_position} i={<FaWallet/>}/><K t="Accounts Receivable" v={position?.accounts_receivable} i={<FaArrowUp/>}/><K t="Accounts Payable" v={position?.accounts_payable} i={<FaArrowDown/>}/><K t="Net Working Cash" v={position?.net_working_cash} i={<FaScaleBalanced/>}/>
   <K t="Overdue AR" v={position?.overdue_ar}/><K t="Overdue AP" v={position?.overdue_ap}/><K t="AR 0-30" v={position?.ar_0_30}/><K t="AP 0-30" v={position?.ap_0_30}/>
  </div>
  <div className="mt-6 flex flex-wrap gap-2">{[["overview","نظرة عامة"],["accounts","حسابات الخزينة"],["ap","ذمم الموردين"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?"rounded-xl bg-[#0f2747] px-4 py-2 font-black text-white":"rounded-xl border bg-white px-4 py-2 font-black text-slate-500"}>{l}</button>)}</div>
  {tab==="overview"&&<div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="erp-card p-6"><h2 className="text-lg font-black">AR Aging</h2><R t="Overdue" v={position?.overdue_ar}/><R t="0-30 Days" v={position?.ar_0_30}/><R t="31-60 Days" v={position?.ar_31_60}/><R t="61+ Days" v={position?.ar_61_plus}/></section><section className="erp-card p-6"><h2 className="text-lg font-black">AP Aging</h2><R t="Overdue" v={position?.overdue_ap}/><R t="0-30 Days" v={position?.ap_0_30}/><R t="31-60 Days" v={position?.ap_31_60}/><R t="61+ Days" v={position?.ap_61_plus}/></section></div>}
  {tab==="accounts"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addAccount} className="erp-card p-6"><h2 className="text-lg font-black">حساب خزينة جديد</h2>{[["account_name","اسم الحساب","text"],["bank_name","البنك","text"],["iban","IBAN","text"],["opening_balance","الرصيد الافتتاحي","number"]].map(([k,l,t])=><F key={k} l={l} t={t} v={account[k]} c={v=>setAccount(x=>({...x,[k]:v}))}/>)}<label className="mt-4 block"><b className="mb-2 block">النوع</b><select className="w-full rounded-xl border p-3" value={account.account_type} onChange={e=>setAccount(x=>({...x,account_type:e.target.value}))}><option value="bank">Bank</option><option value="cash">Cash</option><option value="wallet">Wallet</option></select></label><button className="erp-btn-primary mt-5"><FaPlus/>إضافة</button></form><section className="erp-card overflow-x-auto p-6"><div className="flex flex-wrap gap-2"><button onClick={()=>cashMove("deposit")} className="erp-btn-primary">إيداع</button><button onClick={()=>cashMove("withdrawal")} className="erp-btn-secondary">سحب</button></div><table className="mt-4 w-full min-w-[700px]"><thead><tr><th className="p-3">الرقم</th><th>الحساب</th><th>البنك</th><th>IBAN</th><th>الرصيد</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{a.account_no}</td><td>{a.account_name}</td><td>{a.bank_name||"—"}</td><td>{a.iban||"—"}</td><td dir="ltr">{money(a.current_balance)}</td></tr>)}</tbody></table></section></div>}
  {tab==="ap"&&<div className="mt-6 grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={addBill} className="erp-card p-6"><h2 className="text-lg font-black">فاتورة مورد</h2><label className="mt-4 block"><b className="mb-2 block">المورد</b><select className="w-full rounded-xl border p-3" value={bill.supplier_id} onChange={e=>setBill(x=>({...x,supplier_id:e.target.value}))}><option value="">اختر المورد</option>{suppliers.filter(s=>s.status==="active").map(s=><option key={s.id} value={s.id}>{s.supplier_no} — {s.name}</option>)}</select></label>{[["supplier_invoice_no","رقم فاتورة المورد","text"],["bill_date","تاريخ الفاتورة","date"],["due_date","تاريخ الاستحقاق","date"],["subtotal","Subtotal","number"],["tax_amount","VAT","number"]].map(([k,l,t])=><F key={k} l={l} t={t} v={bill[k]} c={v=>setBill(x=>({...x,[k]:v}))}/>)}<button className="erp-btn-primary mt-5">حفظ الفاتورة</button></form><section className="erp-card overflow-x-auto p-6"><table className="w-full min-w-[850px]"><thead><tr><th className="p-3">الرقم</th><th>المورد</th><th>الاستحقاق</th><th>الإجمالي</th><th>المتبقي</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{bills.map(b=><tr key={b.id} className="border-t"><td className="p-3 font-black text-[#345a82]">{b.bill_no}</td><td>{suppliers.find(s=>s.id===b.supplier_id)?.name||"—"}</td><td>{b.due_date||"—"}</td><td>{money(b.total_amount)}</td><td className="font-black">{money(b.balance_due)}</td><td>{b.status}</td><td>{b.balance_due>0?<button onClick={()=>payBill(b)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">سداد</button>:"—"}</td></tr>)}</tbody></table></section></div>}
 </div></div>
}
function K({t,v,i}){return <article className="erp-card p-5"><div className="flex justify-between"><div><p className="text-xs font-bold text-slate-400">{t}</p><p dir="ltr" className="mt-2 text-right text-xl font-black text-[#0f2747]">{money(v)}</p><p className="text-[10px] text-slate-300">SAR</p></div>{i&&<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{i}</div>}</div></article>}
function R({t,v}){return <div className="mt-4 flex justify-between rounded-xl border border-slate-100 bg-[#fbfcfd] p-4"><b>{t}</b><strong dir="ltr">{money(v)} SAR</strong></div>}
function F({l,v,c,t="text"}){return <label className="mt-4 block"><b className="mb-2 block">{l}</b><input type={t} value={v} onChange={e=>c(e.target.value)} className="w-full rounded-xl border p-3"/></label>}
