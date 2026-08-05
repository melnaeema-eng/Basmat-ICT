import { useState } from "react";
import { supabase } from "../../lib/supabase";
import SectionWaves from "../../components/SectionWaves/SectionWaves";

const initialForm = {
  full_name: "",
  company: "",
  phone: "",
  email: "",
  consultation_type: "",
  subject: "",
  details: "",
};

const consultationTypes = [
  { value: "information-technology", label: "تقنية المعلومات" },
  { value: "networks", label: "الشبكات والبنية التحتية" },
  { value: "cyber-security", label: "الأمن السيبراني" },
  { value: "data-centers", label: "مراكز البيانات" },
  { value: "telecommunications", label: "الاتصالات" },
  { value: "elv", label: "أنظمة ELV والمباني الذكية" },
  { value: "engineering-review", label: "مراجعة مستندات هندسية" },
  { value: "general", label: "استشارة عامة" },
];

export default function Consultation() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function createRequestNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-8);

    return `CON-${year}-${timestamp}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessData(null);

    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.consultation_type ||
      !form.subject.trim() ||
      !form.details.trim()
    ) {
      setErrorMessage("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    const requestNumber = createRequestNumber();

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("ict_consultation_requests")
        .insert({
          request_no: requestNumber,
          full_name: form.full_name.trim(),
          company: form.company.trim() || null,
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          consultation_type: form.consultation_type,
          subject: form.subject.trim(),
          details: form.details.trim(),
          is_free_first_consultation: true,
          status: "new",
        });

      if (error) {
        throw error;
      }

      setForm(initialForm);
      setSuccessData({
        requestNumber,
      });
    } catch (error) {
      console.error("خطأ في إرسال طلب الاستشارة:", error);

      if (error.code === "23505") {
        setErrorMessage(
          "تشير سجلاتنا إلى أن هذا البريد أو رقم الجوال استفاد من الاستشارة المجانية سابقًا."
        );
      } else {
        setErrorMessage(
          error.message || "تعذر إرسال الطلب. حاول مرة أخرى."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl">
      <section className="relative overflow-hidden bg-[#03152f] pb-36 pt-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(37,99,235,0.28),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.18),transparent_38%)]" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:52px_52px]" />
        </div>

        <div className="company-container relative text-center">
          <span className="inline-flex rounded-full bg-[#ff7417] px-6 py-3 text-sm font-black text-white">
            🎁 الاستشارة الأولى مجانية
          </span>

          <h1 className="mt-6 text-4xl font-black md:text-6xl">
            احجز استشارة مجانية
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-blue-100">
            احصل على استشارة أولية مجانية لمدة تصل إلى 30 دقيقة
            مع أحد مهندسينا لمناقشة احتياجات مشروعك وتقديم
            التوصيات الأولية.
          </p>
        </div>

        <SectionWaves
          position="bottom"
          color="#ffffff"
          secondaryColor="rgba(59,130,246,0.22)"
          height="h-36"
        />
      </section>

      <section className="bg-white py-24">
        <div className="company-container">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-6">
              <div className="rounded-3xl bg-[#071d49] p-8 text-white shadow-xl">
                <h2 className="text-2xl font-black">
                  ماذا تشمل الاستشارة؟
                </h2>

                <ul className="mt-6 space-y-4 leading-8 text-blue-100">
                  <li>✓ مناقشة احتياجات المشروع.</li>
                  <li>✓ تقييم أولي للحلول المناسبة.</li>
                  <li>✓ تحديد المخاطر والنقاط المهمة.</li>
                  <li>✓ توصيات هندسية وتقنية أولية.</li>
                  <li>✓ مدة تصل إلى 30 دقيقة.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-orange-200 bg-orange-50 p-7 text-orange-950">
                <h3 className="text-xl font-black">
                  شروط الاستشارة المجانية
                </h3>

                <p className="mt-4 leading-8">
                  تقدم الاستشارة المجانية مرة واحدة لكل عميل أو جهة،
                  وتشمل التقييم الأولي والتوصيات العامة فقط.
                </p>
              </div>
            </div>

            {successData ? (
              <SuccessMessage
                requestNumber={successData.requestNumber}
                onNewRequest={() => setSuccessData(null)}
              />
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm md:p-10"
              >
                <h2 className="text-3xl font-black text-[#071d49]">
                  بيانات طلب الاستشارة
                </h2>

                <p className="mt-3 leading-8 text-slate-600">
                  املأ البيانات التالية وسيتواصل معك فريقنا لتحديد
                  الموعد المناسب.
                </p>

                {errorMessage && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <FormField label="الاسم الكامل" required>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(event) =>
                        updateField("full_name", event.target.value)
                      }
                      placeholder="اكتب الاسم الكامل"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="اسم الشركة أو الجهة">
                    <input
                      type="text"
                      value={form.company}
                      onChange={(event) =>
                        updateField("company", event.target.value)
                      }
                      placeholder="اسم الشركة"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="رقم الجوال" required>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      placeholder="+966"
                      dir="ltr"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="البريد الإلكتروني" required>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="name@company.com"
                      dir="ltr"
                      className="form-input"
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="نوع الاستشارة" required>
                      <select
                        value={form.consultation_type}
                        onChange={(event) =>
                          updateField(
                            "consultation_type",
                            event.target.value
                          )
                        }
                        className="form-input"
                      >
                        <option value="">اختر نوع الاستشارة</option>

                        {consultationTypes.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="md:col-span-2">
                    <FormField label="موضوع الاستشارة" required>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(event) =>
                          updateField("subject", event.target.value)
                        }
                        placeholder="اكتب عنوانًا مختصرًا للاستشارة"
                        className="form-input"
                      />
                    </FormField>
                  </div>

                  <div className="md:col-span-2">
                    <FormField label="تفاصيل الاستشارة" required>
                      <textarea
                        rows={7}
                        value={form.details}
                        onChange={(event) =>
                          updateField("details", event.target.value)
                        }
                        placeholder="اشرح المشروع أو المشكلة والتوصيات التي تحتاجها"
                        className="form-input resize-none"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
                  سيتم إضافة رفع الملفات الهندسية والمخططات في خطوة
                  مستقلة بعد التأكد من عمل النموذج.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-8 w-full rounded-2xl bg-[#ff7417] px-9 py-4 text-lg font-black text-white transition hover:bg-[#ff812d] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {submitting
                    ? "جارٍ إرسال الطلب..."
                    : "احجز الاستشارة المجانية"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SuccessMessage({ requestNumber, onNewRequest }) {
  return (
    <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-sm md:p-12">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
        ✓
      </div>

      <h2 className="mt-6 text-3xl font-black text-green-900">
        تم استلام طلب الاستشارة
      </h2>

      <p className="mt-4 text-lg leading-8 text-green-800">
        سيتواصل معك أحد مهندسينا خلال يوم عمل لتحديد الموعد.
      </p>

      <div className="mx-auto mt-7 max-w-md rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-500">
          رقم الطلب
        </p>

        <p
          dir="ltr"
          className="mt-2 text-2xl font-black text-[#071d49]"
        >
          {requestNumber}
        </p>
      </div>

      <button
        type="button"
        onClick={onNewRequest}
        className="mt-8 rounded-2xl bg-[#071d49] px-8 py-4 font-black text-white transition hover:bg-[#123878]"
      >
        العودة للنموذج
      </button>
    </div>
  );
}

function FormField({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-2 block font-bold text-slate-700">
        {label}

        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}