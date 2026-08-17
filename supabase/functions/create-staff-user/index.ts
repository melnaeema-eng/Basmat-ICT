import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const allowedRoles = new Set([
  "manager",
  "sales",
  "engineer",
  "support",
  "hr",
  "finance",
  "it",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function generateTemporaryPassword() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);

  const token = Array.from(
    bytes,
    (b) => (b % 36).toString(36)
  ).join("");

  return `B!${token}9a`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL")!;
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader =
      req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return json(
        { error: "يجب تسجيل الدخول كمدير." },
        401
      );
    }

    const token = authHeader.slice(7);

    const authClient = createClient(
      supabaseUrl,
      anonKey
    );

    const {
      data: userData,
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      return json(
        { error: "جلسة الإدارة غير صالحة." },
        401
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: caller } =
      await adminClient
        .from("ict_admin_users")
        .select("user_id,role,is_active")
        .eq("user_id", userData.user.id)
        .maybeSingle();

    if (
      !caller?.is_active ||
      caller.role !== "admin"
    ) {
      return json(
        {
          error:
            "هذه العملية متاحة للـ Administrator فقط.",
        },
        403
      );
    }

    const body = await req.json();
    const action =
      String(body?.action || "upsert_staff");

    async function findAuthUserByEmail(
      email: string
    ) {
      for (let page = 1; page <= 20; page++) {
        const {
          data,
          error,
        } =
          await adminClient.auth.admin.listUsers({
            page,
            perPage: 1000,
          });

        if (error) throw error;

        const match = data.users.find(
          (user) =>
            String(user.email || "")
              .toLowerCase() === email
        );

        if (match) return match;

        if (data.users.length < 1000) {
          return null;
        }
      }

      return null;
    }

    if (action === "lookup") {
      const email = String(
        body?.email || ""
      )
        .trim()
        .toLowerCase();

      if (!email) {
        return json(
          { error: "البريد مطلوب." },
          400
        );
      }

      const { data: portalUser } =
        await adminClient
          .from(
            "ict_customer_portal_users"
          )
          .select(
            "user_id,email,full_name,customer_id"
          )
          .ilike("email", email)
          .maybeSingle();

      const { data: staffUser } =
        await adminClient
          .from("ict_admin_users")
          .select(
            "user_id,email,full_name,role,is_active"
          )
          .ilike("email", email)
          .maybeSingle();

      let authUser = null;

      if (
        !portalUser?.user_id &&
        !staffUser?.user_id
      ) {
        authUser =
          await findAuthUserByEmail(email);
      }

      let customerName = null;

      if (
        portalUser?.customer_id &&
        !portalUser?.full_name
      ) {
        const { data: customer } =
          await adminClient
            .from("ict_customers")
            .select("name")
            .eq(
              "id",
              portalUser.customer_id
            )
            .maybeSingle();

        customerName =
          customer?.name || null;
      }

      const userId =
        portalUser?.user_id ||
        staffUser?.user_id ||
        authUser?.id ||
        null;

      const fullName =
        staffUser?.full_name ||
        portalUser?.full_name ||
        customerName ||
        authUser?.user_metadata
          ?.full_name ||
        authUser?.user_metadata?.name ||
        "";

      return json({
        success: true,
        existing_user: Boolean(userId),
        user_id: userId,
        full_name: fullName,
        customer_user:
          Boolean(portalUser?.user_id),
        staff_user:
          Boolean(staffUser?.user_id),
        current_role:
          staffUser?.role || null,
      });
    }

    if (action === "remove_staff") {
      const userId = String(
        body?.user_id || ""
      ).trim();

      if (!userId) {
        return json(
          { error: "user_id مطلوب." },
          400
        );
      }

      const { data: target } =
        await adminClient
          .from("ict_admin_users")
          .select("user_id,role")
          .eq("user_id", userId)
          .maybeSingle();

      if (!target) {
        return json(
          { error: "الموظف غير موجود." },
          404
        );
      }

      if (target.role === "admin") {
        return json(
          {
            error:
              "لا يمكن حذف Administrator بهذه العملية.",
          },
          400
        );
      }

      const { data: customerUser } =
        await adminClient
          .from(
            "ict_customer_portal_users"
          )
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

      const { error: deleteError } =
        await adminClient
          .from("ict_admin_users")
          .delete()
          .eq("user_id", userId);

      if (deleteError) {
        return json(
          { error: deleteError.message },
          400
        );
      }

      return json({
        success: true,
        removed_staff: true,
        customer_user:
          Boolean(customerUser?.user_id),
      });
    }

    const fullName = String(
      body?.full_name || ""
    ).trim();

    const email = String(
      body?.email || ""
    )
      .trim()
      .toLowerCase();

    const role = String(
      body?.role || ""
    )
      .trim()
      .toLowerCase();

    if (
      !fullName ||
      !email ||
      !allowedRoles.has(role)
    ) {
      return json(
        {
          error:
            "الاسم والبريد والدور مطلوبة.",
        },
        400
      );
    }

    const {
      data: portalUser,
      error: portalError,
    } = await adminClient
      .from("ict_customer_portal_users")
      .select("user_id,email")
      .ilike("email", email)
      .maybeSingle();

    if (portalError) {
      return json(
        { error: portalError.message },
        400
      );
    }

    let targetUserId =
      portalUser?.user_id || null;

    let temporaryPassword: string | null =
      null;

    let reusedExistingUser =
      Boolean(targetUserId);

    if (!targetUserId) {
      const authUser =
        await findAuthUserByEmail(email);

      if (authUser) {
        targetUserId = authUser.id;
        reusedExistingUser = true;
      }
    }

    if (!targetUserId) {
      temporaryPassword =
        generateTemporaryPassword();

      const {
        data: created,
        error: createError,
      } =
        await adminClient.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            staff_role: role,
          },
        });

      if (
        createError ||
        !created.user
      ) {
        return json(
          {
            error:
              createError?.message ||
              "تعذر إنشاء حساب الموظف.",
          },
          400
        );
      }

      targetUserId = created.user.id;
    }

    const { data: existingAdmin } =
      await adminClient
        .from("ict_admin_users")
        .select("user_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

    if (existingAdmin) {
      const { error: updateError } =
        await adminClient
          .from("ict_admin_users")
          .update({
            full_name: fullName,
            email,
            role,
            is_active: true,
            is_archived: false,
            archived_at: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("user_id", targetUserId);

      if (updateError) {
        return json(
          { error: updateError.message },
          400
        );
      }
    } else {
      const { error: insertError } =
        await adminClient
          .from("ict_admin_users")
          .insert({
            user_id: targetUserId,
            full_name: fullName,
            email,
            role,
            is_active: true,
            is_archived: false,
          });

      if (insertError) {
        if (!reusedExistingUser) {
          await adminClient.auth.admin.deleteUser(
            targetUserId
          );
        }

        return json(
          { error: insertError.message },
          400
        );
      }
    }

    return json({
      success: true,
      user_id: targetUserId,
      email,
      role,
      existing_user:
        reusedExistingUser,
      temporary_password:
        temporaryPassword,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      },
      500
    );
  }
});
