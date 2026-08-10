import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nda_id } = await req.json();

    if (!nda_id) {
      throw new Error("nda_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const mailFrom = Deno.env.get("MAIL_FROM") || "info@basmat-alnawabig.com.sa";
    const siteUrl = Deno.env.get("SITE_URL") || "https://ict.basmat-alnawabig.com.sa";

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: nda, error } = await admin
      .from("ict_nda_requests")
      .select("id,nda_no,request_no,recipient_email,recipient_name,status")
      .eq("id", nda_id)
      .single();

    if (error) throw error;

    const link = `${siteUrl}/portal/nda/${nda.id}`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [nda.recipient_email],
        subject: `NDA - ${nda.request_no || nda.nda_no}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
            <h2>بصمة النوابغ لتقنية المعلومات والاتصالات</h2>
            <p>مرحبًا ${nda.recipient_name || ""}</p>
            <p>بناءً على طلبك، تم تجهيز اتفاقية عدم الإفصاح (NDA) المرتبطة بالطلب <strong>${nda.request_no || ""}</strong>.</p>
            <p>
              <a href="${link}" style="display:inline-block;background:#ff7417;color:white;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">
                مراجعة وقبول NDA
              </a>
            </p>
            <p>يمكنك أيضًا متابعة الاتفاقية من بوابة العملاء.</p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message || "Resend request failed");
    }

    await admin
      .from("ict_nda_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", nda_id);

    return new Response(
      JSON.stringify({ success: true, message: "NDA email sent", data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
