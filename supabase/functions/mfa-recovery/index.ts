import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "Authentication required." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const mailFrom = Deno.env.get("MAIL_FROM") || "info@basmat-alnawabig.com.sa";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ ok: false, error: "Invalid session." }, 401);
    }

    const user = userData.user;
    const email = (user.email || "").trim().toLowerCase();
    if (!email) {
      return json({ ok: false, error: "No email is registered for this account." }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("ict_admin_users")
      .select("user_id,email,is_active,role,full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.is_active) {
      return json({ ok: false, error: "This account is not an active admin account." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "request") {
      if (!resendKey) {
        return json({ ok: false, error: "RESEND_API_KEY is not configured." }, 500);
      }

      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

      const { count: recentCount } = await admin
        .from("ict_mfa_recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneMinuteAgo);

      if ((recentCount || 0) > 0) {
        return json({ ok: false, error: "انتظر دقيقة قبل طلب رمز جديد." }, 429);
      }

      const { count: hourlyCount } = await admin
        .from("ict_mfa_recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);

      if ((hourlyCount || 0) >= 5) {
        return json({ ok: false, error: "تم تجاوز الحد المسموح لطلبات الاسترداد. حاول لاحقًا." }, 429);
      }

      await admin
        .from("ict_mfa_recovery_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("used_at", null)
        .is("revoked_at", null);

      const otp = secureOtp();
      const codeHash = await sha256(otp);
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

      const { error: insertError } = await admin
        .from("ict_mfa_recovery_codes")
        .insert({
          user_id: user.id,
          email,
          code_hash: codeHash,
          expires_at: expiresAt,
          max_attempts: 5,
        });

      if (insertError) throw insertError;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [email],
          subject: "Basmat ICT — MFA Recovery Code",
          html: `
            <div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <h2 style="color:#071d49">استرداد المصادقة الثنائية</h2>
              <p>تم طلب إعادة ضبط 2FA لحساب إدارة Basmat ICT.</p>
              <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f8fafc;border-radius:12px">
                ${otp}
              </div>
              <p>الرمز صالح لمدة 10 دقائق ولمرة واحدة فقط.</p>
              <p style="color:#b91c1c;font-weight:700">إذا لم تطلب هذا الإجراء، تجاهل الرسالة ولا تشارك الرمز مع أي شخص.</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const detail = await emailResponse.text();
        throw new Error(`Email send failed: ${detail}`);
      }

      await log(admin, user, "MFA_RECOVERY_CODE_SENT", "تم إرسال رمز استرداد MFA إلى البريد المسجل.");

      return json({
        ok: true,
        masked_email: maskEmail(email),
        expires_in_seconds: 600,
      });
    }

    if (action === "verify") {
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) {
        return json({ ok: false, error: "أدخل رمزًا صحيحًا من 6 أرقام." }, 400);
      }

      const { data: recovery, error: recoveryError } = await admin
        .from("ict_mfa_recovery_codes")
        .select("*")
        .eq("user_id", user.id)
        .is("used_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recoveryError || !recovery) {
        return json({ ok: false, error: "لا يوجد طلب استرداد نشط." }, 400);
      }

      if (new Date(recovery.expires_at).getTime() < Date.now()) {
        await admin
          .from("ict_mfa_recovery_codes")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", recovery.id);

        return json({ ok: false, error: "انتهت صلاحية رمز الاسترداد. اطلب رمزًا جديدًا." }, 400);
      }

      if ((recovery.attempt_count || 0) >= (recovery.max_attempts || 5)) {
        await admin
          .from("ict_mfa_recovery_codes")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", recovery.id);

        return json({ ok: false, error: "تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا." }, 429);
      }

      const providedHash = await sha256(code);

      if (!timingSafeEqual(providedHash, recovery.code_hash)) {
        await admin
          .from("ict_mfa_recovery_codes")
          .update({ attempt_count: (recovery.attempt_count || 0) + 1 })
          .eq("id", recovery.id);

        return json({ ok: false, error: "رمز الاسترداد غير صحيح." }, 400);
      }

      // Delete every TOTP factor linked to the current admin account.
      // Deleting a verified factor logs out all active sessions by Supabase design.
      const { data: factorsData, error: factorsError } =
        await admin.auth.admin.mfa.listFactors({ userId: user.id });

      if (factorsError) throw factorsError;

      const factors = Array.isArray(factorsData?.factors)
        ? factorsData.factors
        : [];

      const totpFactors = factors.filter(
        (factor) => factor.factor_type === "totp"
      );

      if (totpFactors.length === 0) {
        return json({
          ok: false,
          error: "لم يتم العثور على عامل Authenticator قديم لإعادة ضبطه.",
        }, 409);
      }

      for (const factor of totpFactors) {
        const { error: deleteError } =
          await admin.auth.admin.mfa.deleteFactor({
            id: factor.id,
            userId: user.id,
          });

        if (deleteError) {
          throw new Error(
            `تعذر حذف عامل MFA ${factor.id}: ${deleteError.message}`
          );
        }
      }

      // Critical verification: do not report success until Supabase confirms
      // that no TOTP factor remains on the account.
      const { data: afterDeleteData, error: afterDeleteError } =
        await admin.auth.admin.mfa.listFactors({ userId: user.id });

      if (afterDeleteError) throw afterDeleteError;

      const remainingFactors = Array.isArray(afterDeleteData?.factors)
        ? afterDeleteData.factors
        : [];

      const remainingTotp = remainingFactors.filter(
        (factor) => factor.factor_type === "totp"
      );

      if (remainingTotp.length > 0) {
        throw new Error(
          `MFA reset verification failed: ${remainingTotp.length} TOTP factor(s) still exist.`
        );
      }

      await admin
        .from("ict_mfa_recovery_codes")
        .update({
          used_at: new Date().toISOString(),
          attempt_count: (recovery.attempt_count || 0) + 1,
        })
        .eq("id", recovery.id);

      await log(
        admin,
        user,
        "MFA_RESET_VIA_EMAIL",
        `تمت إعادة ضبط MFA عبر البريد وحذف ${totpFactors.length} عامل TOTP، وتم التحقق أن العدد المتبقي = 0.`
      );

      return json({
        ok: true,
        reset: true,
        factors_removed: totpFactors.length,
        remaining_totp: 0,
        relogin_required: true,
      });
    }

    return json({ ok: false, error: "Invalid action." }, 400);
  } catch (error) {
    console.error("mfa-recovery error:", error);
    return json({ ok: false, error: error?.message || String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function secureOtp() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

async function log(
  admin: ReturnType<typeof createClient>,
  user: { id: string; email?: string | null },
  action: string,
  details: string
) {
  await admin.from("ict_activity_log").insert({
    user_id: user.id,
    user_email: user.email || null,
    action,
    module: "Security / MFA",
    details,
    metadata: { source: "mfa-recovery" },
  });
}
