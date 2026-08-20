import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async(req)=>{
 try{
  const auth=req.headers.get("Authorization")||"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resend=Deno.env.get("RESEND_API_KEY");
  const from=Deno.env.get("MAIL_FROM");
  const userClient=createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}}});
  const {data:isAdmin}=await userClient.rpc("is_ict_admin");
  if(!isAdmin)return Response.json({error:"Unauthorized"},{status:403});
  const {announcement_id}=await req.json();
  if(!announcement_id)return Response.json({error:"announcement_id is required"},{status:400});
  if(!resend||!from)return Response.json({error:"RESEND_API_KEY or MAIL_FROM is not configured"},{status:500});
  const admin=createClient(supabaseUrl,service);
  const {data:a,error:ae}=await admin.from("ict_announcements").select("*").eq("id",announcement_id).single();
  if(ae||!a)return Response.json({error:ae?.message||"Announcement not found"},{status:404});
  const {data:rows,error:re}=await admin.from("ict_announcement_recipients").select("id,email").eq("announcement_id",announcement_id).is("email_sent_at",null);
  if(re)throw re;
  let sent=0,skipped=0;
  for(const row of rows||[]){
   if(!row.email){skipped++;continue;}
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[row.email],subject:a.title,html:`<div dir="rtl" style="font-family:Arial,sans-serif"><h2 style="color:#071d49">${esc(a.title)}</h2><p style="line-height:1.8">${esc(a.message)}</p></div>`})});
   if(response.ok){sent++;await admin.from("ict_announcement_recipients").update({email_sent_at:new Date().toISOString()}).eq("id",row.id);} else skipped++;
  }
  return Response.json({ok:true,sent,skipped});
 }catch(error){return Response.json({error:error?.message||String(error)},{status:500});}
});
function esc(v:string){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c));}
