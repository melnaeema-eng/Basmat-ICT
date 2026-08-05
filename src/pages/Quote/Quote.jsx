import { useState } from "react";
import { supabase } from "../../lib/supabase";
import SectionWaves from "../../components/SectionWaves/SectionWaves";

const initialForm = {
  full_name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  project_type: "",
  project_value: "",
  expected_start_date: "",
  project_description: "",
};

const projectTypes = [
  { value: "data-center", label: "مراكز البيانات" },
  { value: "ict", label: "تقنية المعلومات" },
  { value: "cyber-security", label: "الأمن السيبراني" },
  { value: "network-infrastructure", label: "الشبكات والبنية التحتية" },
  { value: "elv", label: "أنظمة ELV والمباني الذكية" },
  { value: "fiber-optic", label: "الألياف الضوئية" },
  { value: "osp", label: "شبكات OSP" },
  { value: "cloud", label: "الحوسبة السحابية" },
  { value: "engineering-consultancy", label: "الاستشارات الهندسية" },
  { value: "other", label: "أخرى" },
];

const projectValues = [
  "أقل من 100 ألف ريال",
  "من 100 إلى 500 ألف ريال",
  "من 500 ألف إلى مليون ريال",
  "أكثر من مليون ريال",
  "غير محدد",
];

export default function Quote() {
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

    return `RFQ-${year}-${timestamp}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessData(null);

    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.project_type ||
      !form.project_description.trim()
    ) {
      setErrorMessage("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    const requestNumber = createRequestNumber();

    try {
      setSubmitting(true);

const { error } = await supabase
  .from("ict_rfq_requests")
  .insert({
    request_no: requestNumber,
    full_name: form.full_name.trim(),
    company: form.company.trim() || null,
    phone: form.phone.trim(),
    email: form.email.trim(),
    city: form.city.trim() || null,
    project_type: form.project_type,
    project_value: form.project_value || null,
    expected_start_date:
      form.expected_start_date || null,
    project_description:
      form.project_description.trim(),
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
      console.error("خطأ في إرسال طلب عرض السعر:", error);

      setErrorMessage(
        error.message ||
          "تعذر إرسال طلب عرض السعر. حاول مرة أخرى."
      );
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
          <span className="font-bold tracking-[0.25em] text-cyan-300">
            REQUEST FOR QUOTATION
          </span>

          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            اطلب عرض سعر
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-blue-100">
            أرسل تفاصيل مشروعك، وسيتولى فريق بصمة النوابغ
            مراجعة المتطلبات والتواصل معك لإعداد العرض الفني
            والمالي المناسب.
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
          <div className="mx-auto max-w-5xl">
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
                <div>
                  <span className="font-bold text-blue-700">
                    RFQ FORM
                  </span>

                  <h2 className="mt-3 text-3xl font-black text-[#071d49]">
                    معلومات طلب عرض السعر
                  </h2>

                  <p className="mt-3 leading-8 text-slate-600">
                    الحقول التي تحمل علامة النجمة مطلوبة لإرسال الطلب.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-9 grid gap-6 md:grid-cols-2">
                  <FormField label="الاسم الكامل" required>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(event) =>
                        updateField(
                          "full_name",
                          event.target.value
                        )
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
                        updateField(
                          "company",
                          event.target.value
                        )
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
                        updateField(
                          "phone",
                          event.target.value
                        )
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
                        updateField(
                          "email",
                          event.target.value
                        )
                      }
                      placeholder="name@company.com"
                      dir="ltr"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="المدينة">
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) =>
                        updateField(
                          "city",
                          event.target.value
                        )
                      }
                      placeholder="الرياض"
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="نوع المشروع" required>
                    <select
                      value={form.project_type}
                      onChange={(event) =>
                        updateField(
                          "project_type",
                          event.target.value
                        )
                      }
                      className="form-input"
                    >
                      <option value="">اختر نوع المشروع</option>

                      {projectTypes.map((item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="القيمة التقديرية للمشروع">
                    <select
                      value={form.project_value}
                      onChange={(event) =>
                        updateField(
                          "project_value",
                          event.target.value
                        )
                      }
                      className="form-input"
                    >
                      <option value="">
                        اختر القيمة التقديرية
                      </option>

                      {projectValues.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="تاريخ البدء المتوقع">
                    <input
                      type="date"
                      value={form.expected_start_date}
                      onChange={(event) =>
                        updateField(
                          "expected_start_date",
                          event.target.value
                        )
                      }
                      className="form-input"
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="وصف المشروع" required>
                      <textarea
                        rows={7}
                        value={form.project_description}
                        onChange={(event) =>
                          updateField(
                            "project_description",
                            event.target.value
                          )
                        }
                        placeholder="اكتب نطاق المشروع والمتطلبات الأساسية"
                        className="form-input resize-none"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
                  سيتم إضافة رفع المرفقات الهندسية مثل BOQ،
                  Shop Drawing، Material Submittal، RFI، MIR،
                  WIR وSAT في الخطوة التالية.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-8 w-full rounded-2xl bg-[#ff7417] px-9 py-4 text-lg font-black text-white transition hover:bg-[#ff812d] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {submitting
                    ? "جارٍ إرسال الطلب..."
                    : "إرسال طلب عرض السعر"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SuccessMessage({
  requestNumber,
  onNewRequest,
}) {
  return (
    <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-sm md:p-12">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
        ✓
      </div>

      <h2 className="mt-6 text-3xl font-black text-green-900">
        تم استلام طلبك بنجاح
      </h2>

      <p className="mt-4 text-lg leading-8 text-green-800">
        سيقوم فريقنا بمراجعة متطلبات المشروع والتواصل معك.
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
        إرسال طلب جديد
      </button>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}) {
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