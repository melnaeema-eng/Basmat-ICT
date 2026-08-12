import { useState } from "react";
import {
  FaEnvelope,
  FaLocationDot,
  FaPhone,
  FaWhatsapp,
} from "react-icons/fa6";

import SectionWaves from "../../components/SectionWaves/SectionWaves";
import { supabase } from "../../lib/supabase";

const initialForm = {
  full_name: "",
  company: "",
  phone: "",
  email: "",
  service: "",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.service ||
      !form.message.trim()
    ) {
      setErrorMessage("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("ict_contact_messages")
        .insert({
          full_name: form.full_name.trim(),
          company: form.company.trim() || null,
          phone: form.phone.trim(),
          email: form.email.trim(),
          service: form.service,
          message: form.message.trim(),
          status: "new",
        });

      if (error) {
        throw error;
      }

      setForm(initialForm);
      setSuccessMessage(
        "تم إرسال طلبك بنجاح، وسيتواصل معك فريقنا قريبًا."
      );
    } catch (error) {
      console.error("خطأ في إرسال الطلب:", error);

      setErrorMessage(
        error.message || "تعذر إرسال الطلب. حاول مرة أخرى."
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
            CONTACT US
          </span>

          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            تواصل معنا
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-blue-100">
            يسعدنا مناقشة احتياجات مشاريع تقنية المعلومات،
            الاتصالات، الأمن السيبراني، مراكز البيانات
            والاستشارات الهندسية.
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
        <div className="company-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <ContactCard
              icon={<FaPhone />}
              title="الهاتف"
              value="+966 55 007 3576"
href="tel:+966550073576"
            />

            <ContactCard
              icon={<FaWhatsapp />}
              title="واتساب"
              value="+966 55 007 3576"
href="https://wa.me/966550073576?text=السلام عليكم، أرغب في الاستفسار عن خدمات بصمة النوابغ لتقنية المعلومات والاتصالات."
            />

            <ContactCard
              icon={<FaEnvelope />}
              title="البريد الإلكتروني"
              value="info@basmat-alnawabig.com.sa"
              href="mailto:info@basmat-alnawabig.com.sa"
            />

            <ContactCard
              icon={<FaLocationDot />}
              title="الموقع"
              value="الرياض، المملكة العربية السعودية"
            />
<div className="grid gap-4 pt-2">
  <a
    href="tel:+966550073576"
    className="flex items-center justify-center gap-3 rounded-2xl bg-[#ff7417] px-6 py-4 text-lg font-black text-white transition hover:bg-[#ff812d]"
  >
    <FaPhone />
    اتصل الآن
  </a>

  <a
    href="https://wa.me/966550073576?text=السلام عليكم، أرغب في الاستفسار عن خدمات بصمة النوابغ لتقنية المعلومات والاتصالات."
    target="_blank"
    rel="noreferrer"
    className="flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-6 py-4 text-lg font-black text-white transition hover:opacity-90"
  >
    <FaWhatsapp />
    راسلنا عبر واتساب
  </a>
</div>
            <div className="rounded-3xl bg-[#071d49] p-8 text-white shadow-xl">
              <h2 className="text-2xl font-black">
                ساعات العمل
              </h2>

              <div className="mt-6 space-y-3 text-blue-100">
                <p>الأحد – الخميس: 8:00 صباحًا – 5:00 مساءً</p>
                <p>الجمعة والسبت: مغلق</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm md:p-10"
          >
            <h2 className="text-3xl font-black text-[#071d49]">
              أرسل لنا رسالة
            </h2>

            <p className="mt-3 text-slate-600">
              املأ النموذج وسيتواصل معك فريقنا في أقرب وقت.
            </p>

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                {successMessage}
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
                  placeholder="اكتب اسمك"
                  className="form-input"
                />
              </FormField>

              <FormField label="اسم الشركة">
                <input
                  type="text"
                  value={form.company}
                  onChange={(event) =>
                    updateField("company", event.target.value)
                  }
                  placeholder="اسم الشركة أو الجهة"
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
                <FormField label="نوع الخدمة" required>
                  <select
                    value={form.service}
                    onChange={(event) =>
                      updateField("service", event.target.value)
                    }
                    className="form-input"
                  >
                    <option value="">اختر الخدمة</option>
                    <option value="it">تقنية المعلومات</option>
                    <option value="network">
                      الشبكات والبنية التحتية
                    </option>
                    <option value="cyber-security">
                      الأمن السيبراني
                    </option>
                    <option value="data-centers">
                      مراكز البيانات
                    </option>
                    <option value="cloud">
                      الحوسبة السحابية
                    </option>
                    <option value="elv">
                      أنظمة ELV والمباني الذكية
                    </option>
                    <option value="consulting">
                      الاستشارات الهندسية
                    </option>
                    <option value="quotation">
                      طلب عرض سعر
                    </option>
                  </select>
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField label="تفاصيل الطلب" required>
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={(event) =>
                      updateField("message", event.target.value)
                    }
                    placeholder="اكتب تفاصيل المشروع أو الطلب"
                    className="form-input resize-none"
                  />
                </FormField>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full rounded-2xl bg-[#ff7417] px-8 py-4 text-lg font-black text-white transition hover:bg-[#ff812d] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ContactCard({ icon, title, value, href }) {
  const content = (
    <div className="flex items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-[#123878]">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-500">
          {title}
        </p>

        <p
          dir={
            title === "الهاتف" || title === "واتساب"
              ? "ltr"
              : undefined
          }
          className={[
            "mt-1 break-words text-lg font-black text-[#071d49]",
            title === "الهاتف" || title === "واتساب"
              ? "text-right [unicode-bidi:isolate]"
              : "",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );

  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      {content}
    </a>
  ) : (
    content
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