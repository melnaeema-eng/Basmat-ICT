import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      try {
        const body = await req.json();
        const quotationId =
          body?.quotation_id;

        if (!quotationId) {
          return Response.json(
            {
              error:
                "quotation_id is required",
            },
            { status: 400 }
          );
        }

        const {
          data: isAdmin,
          error: adminError,
        } = await ctx.supabase.rpc(
          "is_ict_admin"
        );

        if (
          adminError ||
          !isAdmin
        ) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 403 }
          );
        }

        const {
          data: quotation,
          error: quoteError,
        } = await ctx.supabase
          .from("ict_quotations")
          .select("*")
          .eq("id", quotationId)
          .single();

        if (
          quoteError ||
          !quotation
        ) {
          return Response.json(
            {
              error:
                quoteError?.message ||
                "Quotation not found",
            },
            { status: 404 }
          );
        }

        if (!quotation.customer_email) {
          return Response.json(
            {
              error:
                "Customer email is missing",
            },
            { status: 400 }
          );
        }

        const apiKey =
          Deno.env.get(
            "RESEND_API_KEY"
          );

        const fromAddress =
          Deno.env.get("MAIL_FROM");

        if (
          !apiKey ||
          !fromAddress
        ) {
          return Response.json(
            {
              error:
                "RESEND_API_KEY or MAIL_FROM is not configured",
            },
            { status: 500 }
          );
        }

        const items = Array.isArray(
          quotation.items
        )
          ? quotation.items
          : [];

        const itemRows = items
          .map(
            (item: any, index: number) => `
              <tr>
                <td style="padding:8px;border:1px solid #ddd">${index + 1}</td>
                <td style="padding:8px;border:1px solid #ddd">${escapeHtml(item.description || "")}</td>
                <td style="padding:8px;border:1px solid #ddd">${Number(item.quantity || 0)}</td>
                <td style="padding:8px;border:1px solid #ddd">${formatMoney(item.unit_price)}</td>
                <td style="padding:8px;border:1px solid #ddd">${formatMoney(
                  Number(item.quantity || 0) *
                  Number(item.unit_price || 0)
                )}</td>
              </tr>
            `
          )
          .join("");

        const html = `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:auto">
            <h2 style="color:#071d49">بصمة النوابغ لتقنية المعلومات والاتصالات</h2>
            <h3>عرض سعر رقم ${escapeHtml(quotation.quotation_no)}</h3>

            <p>السيد/السيدة: <strong>${escapeHtml(quotation.customer_name)}</strong></p>
            ${quotation.company_name ? `<p>الشركة: <strong>${escapeHtml(quotation.company_name)}</strong></p>` : ""}
            <p>${escapeHtml(quotation.subject || "")}</p>

            <table style="width:100%;border-collapse:collapse;margin-top:20px">
              <thead>
                <tr style="background:#071d49;color:white">
                  <th style="padding:8px;border:1px solid #ddd">#</th>
                  <th style="padding:8px;border:1px solid #ddd">الوصف</th>
                  <th style="padding:8px;border:1px solid #ddd">الكمية</th>
                  <th style="padding:8px;border:1px solid #ddd">سعر الوحدة</th>
                  <th style="padding:8px;border:1px solid #ddd">الإجمالي</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div style="margin-top:20px">
              <p>المجموع قبل الضريبة: <strong>${formatMoney(quotation.subtotal)} ${quotation.currency}</strong></p>
              <p>الضريبة: <strong>${formatMoney(quotation.tax_amount)} ${quotation.currency}</strong></p>
              <p style="font-size:20px">الإجمالي: <strong>${formatMoney(quotation.total_amount)} ${quotation.currency}</strong></p>
            </div>

            ${quotation.notes ? `<p><strong>ملاحظات:</strong><br>${escapeHtml(quotation.notes)}</p>` : ""}
            ${quotation.terms ? `<p><strong>الشروط:</strong><br>${escapeHtml(quotation.terms)}</p>` : ""}

            <p style="margin-top:30px;color:#666">
              بصمة النوابغ - Basmat Alnawabigh ICT
            </p>
          </div>
        `;

        const emailResponse =
          await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${apiKey}`,
                "Idempotency-Key":
                  `quotation-${quotation.id}-${quotation.updated_at}`,
              },
              body: JSON.stringify({
                from: fromAddress,
                to: [
                  quotation.customer_email,
                ],
                subject:
                  `عرض سعر ${quotation.quotation_no} - بصمة النوابغ`,
                html,
              }),
            }
          );

        const emailData =
          await emailResponse.json();

        if (!emailResponse.ok) {
          return Response.json(
            {
              error:
                emailData?.message ||
                "Email provider error",
            },
            { status: 502 }
          );
        }

        const {
          error: updateError,
        } = await ctx.supabase
          .from("ict_quotations")
          .update({
            status: "sent",
            sent_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", quotation.id);

        if (updateError) {
          console.error(updateError);
        }

        return Response.json({
          message:
            "تم إرسال عرض السعر إلى العميل.",
          email_id: emailData?.id,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unexpected error",
          },
          { status: 500 }
        );
      }
    }
  ),
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}
