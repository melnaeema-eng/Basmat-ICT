import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaEnvelope,
  FaFloppyDisk,
  FaPlus,
  FaPrint,
  FaTrash,
} from "react-icons/fa6";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";

const emptyItem = {
  description: "",
  quantity: 1,
  unit_price: 0,
};

function createQuotationNumber() {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString().slice(-7);
  return `QT-${year}-${suffix}`;
}

export default function AdminQuotationEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rfqId = searchParams.get("rfq");

  const [form, setForm] = useState({
    quotation_no: createQuotationNumber(),
    rfq_id: rfqId || "",
    customer_name: "",
    company_name: "",
    customer_email: "",
    customer_phone: "",
    subject: "",
    currency: "SAR",
    tax_rate: 15,
    validity_days: 15,
    notes: "",
    terms:
      "الأسعار سارية خلال مدة صلاحية العرض. التنفيذ حسب نطاق العمل المتفق عليه.",
    status: "draft",
  });

  const [items, setItems] = useState([
    { ...emptyItem },
  ]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    if (id) {
      loadQuotation(id);
    } else if (rfqId) {
      loadRFQ(rfqId);
    }
  }, [id, rfqId]);

  async function loadRFQ(requestId) {
    const { data, error } = await supabase
      .from("ict_rfq_requests")
      .select(
        "id, request_no, full_name, company, email, phone, project_type, project_description"
      )
      .eq("id", requestId)
      .single();

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setForm((current) => ({
      ...current,
      rfq_id: data.id,
      customer_name: data.full_name || "",
      company_name: data.company || "",
      customer_email: data.email || "",
      customer_phone: data.phone || "",
      subject: `عرض سعر - ${
        data.project_type || data.request_no
      }`,
      notes:
        data.project_description || "",
    }));
  }

  async function loadQuotation(quotationId) {
    const { data, error } = await supabase
      .from("ict_quotations")
      .select("*")
      .eq("id", quotationId)
      .single();

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setForm({
      quotation_no: data.quotation_no,
      rfq_id: data.rfq_id || "",
      customer_name: data.customer_name || "",
      company_name: data.company_name || "",
      customer_email: data.customer_email || "",
      customer_phone: data.customer_phone || "",
      subject: data.subject || "",
      currency: data.currency || "SAR",
      tax_rate: Number(data.tax_rate || 15),
      validity_days: Number(
        data.validity_days || 15
      ),
      notes: data.notes || "",
      terms: data.terms || "",
      status: data.status || "draft",
    });

    setItems(
      Array.isArray(data.items) && data.items.length
        ? data.items
        : [{ ...emptyItem }]
    );
  }

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.unit_price || 0),
        0
      ),
    [items]
  );

  const taxAmount =
    subtotal *
    (Number(form.tax_rate || 0) / 100);

  const totalAmount = subtotal + taxAmount;

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateItem(index, name, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { ...emptyItem },
    ]);
  }

  function removeItem(index) {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter(
            (_, itemIndex) =>
              itemIndex !== index
          )
    );
  }

  async function saveQuotation() {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (!form.customer_name.trim()) {
        throw new Error("اسم العميل مطلوب.");
      }

      if (
        !items.some(
          (item) =>
            item.description.trim() &&
            Number(item.quantity) > 0
        )
      ) {
        throw new Error(
          "أضف بندًا واحدًا على الأقل."
        );
      }

      const { data: authData } =
        await supabase.auth.getUser();

      const payload = {
        ...form,
        rfq_id: form.rfq_id || null,
        customer_name:
          form.customer_name.trim(),
        company_name:
          form.company_name.trim() || null,
        customer_email:
          form.customer_email.trim() || null,
        customer_phone:
          form.customer_phone.trim() || null,
        subject: form.subject.trim() || null,
        tax_rate: Number(form.tax_rate || 0),
        validity_days: Number(
          form.validity_days || 15
        ),
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: items.map((item) => ({
          description:
            item.description.trim(),
          quantity: Number(
            item.quantity || 0
          ),
          unit_price: Number(
            item.unit_price || 0
          ),
        })),
        notes: form.notes.trim() || null,
        terms: form.terms.trim() || null,
        created_by:
          authData.user?.id || null,
        updated_at:
          new Date().toISOString(),
      };

      let result;

      if (id) {
        result = await supabase
          .from("ict_quotations")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("ict_quotations")
          .insert(payload)
          .select("id")
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setMessage({
        type: "success",
        text: "تم حفظ عرض السعر.",
      });

      if (!id) {
        navigate(
          `/admin/quotations/${result.data.id}`,
          { replace: true }
        );
      }

      return result.data.id;
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر حفظ عرض السعر.",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendEmail() {
    setSending(true);
    setMessage({ type: "", text: "" });

    try {
      const savedId =
        id || (await saveQuotation());

      if (!savedId) {
        return;
      }

      if (!form.customer_email.trim()) {
        throw new Error(
          "بريد العميل مطلوب للإرسال."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "send-quotation-email",
          {
            body: {
              quotation_id: savedId,
            },
          }
        );

      if (error) throw error;

      setForm((current) => ({
        ...current,
        status: "sent",
      }));

      setMessage({
        type: "success",
        text:
          data?.message ||
          "تم إرسال عرض السعر إلى العميل.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر إرسال البريد.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="px-4 py-10 md:px-8"
    >
      <style>{`
        @media print {
          aside, header, .no-print {
            display: none !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            background: white !important;
          }

          .quotation-paper {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#071d49]">
              {id
                ? "تعديل عرض السعر"
                : "إنشاء عرض سعر"}
            </h1>
            <p className="mt-3 text-slate-600">
              احفظ العرض ثم اطبعه أو احفظه PDF من نافذة الطباعة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveQuotation}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#123878] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              <FaFloppyDisk />
              {saving
                ? "جارٍ الحفظ..."
                : "حفظ"}
            </button>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-black text-white"
            >
              <FaPrint />
              طباعة / حفظ PDF
            </button>

            <button
              type="button"
              onClick={sendEmail}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-5 py-3 font-black text-white disabled:opacity-60"
            >
              <FaEnvelope />
              {sending
                ? "جارٍ الإرسال..."
                : "إرسال بالبريد"}
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={[
              "no-print mt-6 rounded-2xl border p-5",
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <div className="quotation-paper mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-7">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="بصمة النوابغ"
                className="h-20 w-20 rounded-full object-contain"
              />

              <div>
                <h2 className="text-2xl font-black text-[#071d49]">
                  بصمة النوابغ
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  لتقنية المعلومات والاتصالات
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  BASMAT ALNAWABIGH ICT
                </p>
              </div>
            </div>

            <div className="text-left">
              <p className="text-sm font-bold text-slate-500">
                QUOTATION
              </p>

              <input
                value={form.quotation_no}
                onChange={(event) =>
                  updateField(
                    "quotation_no",
                    event.target.value
                  )
                }
                dir="ltr"
                className="mt-2 border-0 bg-transparent text-left text-xl font-black text-[#071d49] outline-none"
              />

              <p className="mt-2 text-sm text-slate-500">
                {new Intl.DateTimeFormat(
                  "ar-SA",
                  {
                    dateStyle: "medium",
                  }
                ).format(new Date())}
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <Input
              label="اسم العميل"
              value={form.customer_name}
              onChange={(value) =>
                updateField(
                  "customer_name",
                  value
                )
              }
            />

            <Input
              label="الشركة"
              value={form.company_name}
              onChange={(value) =>
                updateField(
                  "company_name",
                  value
                )
              }
            />

            <Input
              label="البريد"
              value={form.customer_email}
              dir="ltr"
              onChange={(value) =>
                updateField(
                  "customer_email",
                  value
                )
              }
            />

            <Input
              label="الجوال"
              value={form.customer_phone}
              dir="ltr"
              onChange={(value) =>
                updateField(
                  "customer_phone",
                  value
                )
              }
            />

            <div className="md:col-span-2">
              <Input
                label="موضوع العرض"
                value={form.subject}
                onChange={(value) =>
                  updateField(
                    "subject",
                    value
                  )
                }
              />
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="bg-[#071d49] text-white">
                  <th className="p-3">#</th>
                  <th className="p-3">
                    الوصف
                  </th>
                  <th className="p-3">
                    الكمية
                  </th>
                  <th className="p-3">
                    سعر الوحدة
                  </th>
                  <th className="p-3">
                    الإجمالي
                  </th>
                  <th className="no-print p-3">
                    حذف
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-200"
                  >
                    <td className="p-3">
                      {index + 1}
                    </td>

                    <td className="p-3">
                      <input
                        value={
                          item.description
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 p-2 outline-none"
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        className="w-24 rounded-lg border border-slate-200 p-2"
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.unit_price
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unit_price",
                            event.target.value
                          )
                        }
                        className="w-32 rounded-lg border border-slate-200 p-2"
                      />
                    </td>

                    <td
                      dir="ltr"
                      className="p-3 font-black"
                    >
                      {formatMoney(
                        Number(
                          item.quantity || 0
                        ) *
                          Number(
                            item.unit_price ||
                              0
                          )
                      )}
                    </td>

                    <td className="no-print p-3">
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(index)
                        }
                        className="rounded-lg bg-red-50 p-3 text-red-600"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              onClick={addItem}
              className="no-print mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-3 font-black text-blue-800"
            >
              <FaPlus />
              إضافة بند
            </button>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <label>
                <span className="mb-2 block font-bold text-slate-700">
                  ملاحظات
                </span>
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                  className="form-input resize-none"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block font-bold text-slate-700">
                  الشروط
                </span>
                <textarea
                  rows={5}
                  value={form.terms}
                  onChange={(event) =>
                    updateField(
                      "terms",
                      event.target.value
                    )
                  }
                  className="form-input resize-none"
                />
              </label>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6">
              <SummaryRow
                label="المجموع قبل الضريبة"
                value={`${formatMoney(
                  subtotal
                )} ${form.currency}`}
              />

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="font-bold text-slate-600">
                  الضريبة
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={form.tax_rate}
                    onChange={(event) =>
                      updateField(
                        "tax_rate",
                        event.target.value
                      )
                    }
                    className="w-20 rounded-lg border border-slate-200 p-2 text-left"
                  />
                  <span>%</span>
                </div>
              </div>

              <SummaryRow
                label="قيمة الضريبة"
                value={`${formatMoney(
                  taxAmount
                )} ${form.currency}`}
              />

              <div className="mt-5 border-t border-slate-300 pt-5">
                <SummaryRow
                  label="الإجمالي"
                  value={`${formatMoney(
                    totalAmount
                  )} ${form.currency}`}
                  strong
                />
              </div>

              <div className="no-print mt-6 grid gap-4">
                <Input
                  label="مدة صلاحية العرض (يوم)"
                  type="number"
                  value={
                    form.validity_days
                  }
                  onChange={(value) =>
                    updateField(
                      "validity_days",
                      value
                    )
                  }
                />

                <label>
                  <span className="mb-2 block font-bold text-slate-700">
                    حالة العرض
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className="form-input"
                  >
                    <option value="draft">
                      مسودة
                    </option>
                    <option value="sent">
                      تم الإرسال
                    </option>
                    <option value="accepted">
                      مقبول
                    </option>
                    <option value="rejected">
                      مرفوض
                    </option>
                    <option value="expired">
                      منتهي
                    </option>
                    <option value="cancelled">
                      ملغي
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center">
  <img
    src="/logo.png"
    alt="بصمة النوابغ"
    className="mx-auto h-16 w-16 object-contain"
  />

  <p className="mt-3 text-sm font-bold text-slate-500">
    بصمة النوابغ لتقنية المعلومات والاتصالات
  </p>
</div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  dir,
}) {
  return (
    <label>
      <span className="mb-2 block font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "text-xl font-black text-[#071d49]"
            : "font-bold text-slate-600"
        }
      >
        {label}
      </span>

      <span
        dir="ltr"
        className={
          strong
            ? "text-2xl font-black text-[#071d49]"
            : "font-black text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
