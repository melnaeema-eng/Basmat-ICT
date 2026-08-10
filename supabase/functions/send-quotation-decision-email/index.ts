import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quotation_id, approval_id } = await req.json();
    if (!quotation_id || !approval_id) throw new Error("quotation_id and approval_id are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const mailFrom = Deno.env.get("MAIL_FROM") || "info@basmat-alnawabig.com.sa";
    const notificationEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "info@basmat-alnawabig.com.sa";

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const [quotationResult, approvalResult] = await Promise.all([
      admin.from("ict_quotations")
        .select("id,quotation_no,customer_name,company_name,customer_email,subject,total_amount,currency,status")
        .eq("id", quotation_id).single(),
      admin.from("ict_quotation_approvals")
        .select("id,decision,signer_name,signer_email,rejection_reason,signed_at")
        .eq("id", approval_id).single(),
    ]);

    if (quotationResult.error) throw quotationResult.error;
    if (approvalResult.error) throw approvalResult.error;

    const q = quotationResult.data;
    const a = approvalResult.data;
    const accepted = a.decision === "accepted";
    const subject = accepted ? `تم قبول عرض السعر ${q.quotation_no}` : `تم رفض عرض السعر ${q.quotation_no}`;
    const customer = q.company_name || q.customer_name || q.customer_email || "العميل";
    const actionText = accepted
      ? "العرض جاهز للمراجعة والتحويل إلى مشروع من لوحة الإدارة."
      : `سبب الرفض: ${a.rejection_reason || "غير مذكور"}`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mailFrom,
        to: [notificationEmail],
        subject,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9">
          <h2>${subject}</h2>
          <p><strong>العميل:</strong> ${customer}</p>
          <p><strong>موضوع العرض:</strong> ${q.subject || "-"}</p>
          <p><strong>قيمة العرض:</strong> ${Number(q.total_amount || 0).toLocaleString()} ${q.currency || "SAR"}</p>
          <p><strong>صاحب القرار:</strong> ${a.signer_name || "-"}</p>
          <p><strong>التاريخ:</strong> ${a.signed_at || "-"}</p>
          <p>${actionText}</p>
          <p>يمكن متابعة الإجراء من لوحة إدارة بصمة النوابغ.</p>
        </div>`,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result?.message || "Resend request failed");

    return new Response(JSON.stringify({ success: true, message: "Admin decision email sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
