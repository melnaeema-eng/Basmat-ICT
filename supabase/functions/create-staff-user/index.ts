import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedRoles = new Set(["manager", "sales", "engineer", "support"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTemporaryPassword() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  return `B!${token}9a`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "يجب تسجيل الدخول كمدير." }, 401);
    }

    const token = authHeader.slice(7);
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "جلسة الإدارة غير صالحة." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: caller } = await adminClient
      .from("ict_admin_users")
      .select("user_id,role,is_active")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!caller?.is_active || caller.role !== "admin") {
      return json({ error: "هذه العملية متاحة للـ Administrator فقط." }, 403);
    }

    const body = await req.json();
    const fullName = String(body?.full_name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "").trim().toLowerCase();

    if (!fullName || !email || !allowedRoles.has(role)) {
      return json({ error: "الاسم والبريد والدور مطلوبة، والدور يجب أن يكون Manager أو Sales أو Engineer أو Support." }, 400);
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, staff_role: role },
    });

    if (createError || !created.user) {
      const message = createError?.message || "تعذر إنشاء حساب الموظف.";
      return json({ error: message }, 400);
    }

    const { error: profileError } = await adminClient
      .from("ict_admin_users")
      .insert({
        user_id: created.user.id,
        full_name: fullName,
        email,
        role,
        is_active: true,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }

    return json({
      success: true,
      user_id: created.user.id,
      email,
      role,
      temporary_password: temporaryPassword,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع." }, 500);
  }
});
