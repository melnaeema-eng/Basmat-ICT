import { useEffect, useState } from "react";
import { FaFloppyDisk } from "react-icons/fa6";

import { supabase } from "../../lib/supabase";

const defaultSettings = {
  company_name_ar: "بصمة النوابغ",
  company_name_en: "Basmat Alnawabigh ICT",
  phone: "+966550073576",
  whatsapp: "+966550073576",
  email: "info@basmat-alnawabig.com.sa",
  website: "https://basmat-alnawabig.com.sa",
  address: "الرياض، المملكة العربية السعودية",
  consultation_minutes: 30,
  free_consultation_enabled: true,
  nda_enabled: true,
  max_upload_mb: 50,
  rfq_notification_email:
    "info@basmat-alnawabig.com.sa",
  consultation_notification_email:
    "info@basmat-alnawabig.com.sa",
};

export default function AdminSettings() {
  const [settings, setSettings] =
    useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("ict_site_settings")
        .select("settings")
        .eq("setting_key", "main")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر تحميل الإعدادات.",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateField(name, value) {
    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase
        .from("ict_site_settings")
        .upsert(
          {
            setting_key: "main",
            settings,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "setting_key",
          }
        );

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: "تم حفظ إعدادات الشركة.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "تعذر حفظ الإعدادات.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-black text-[#071d49]">
          إعدادات الشركة
        </h1>
        <p className="mt-3 text-slate-600">
          إدارة بيانات التواصل وإعدادات RFQ والاستشارات.
        </p>

        {message.text && (
          <div
            className={[
              "mt-6 rounded-2xl border p-5",
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <form
          onSubmit={saveSettings}
          className="mt-8 space-y-8"
        >
          <Section title="بيانات الشركة">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="اسم الشركة بالعربية"
                value={settings.company_name_ar}
                onChange={(value) =>
                  updateField(
                    "company_name_ar",
                    value
                  )
                }
              />
              <Field
                label="اسم الشركة بالإنجليزية"
                value={settings.company_name_en}
                dir="ltr"
                onChange={(value) =>
                  updateField(
                    "company_name_en",
                    value
                  )
                }
              />
              <Field
                label="الهاتف"
                value={settings.phone}
                dir="ltr"
                onChange={(value) =>
                  updateField("phone", value)
                }
              />
              <Field
                label="واتساب"
                value={settings.whatsapp}
                dir="ltr"
                onChange={(value) =>
                  updateField("whatsapp", value)
                }
              />
              <Field
                label="البريد"
                value={settings.email}
                type="email"
                dir="ltr"
                onChange={(value) =>
                  updateField("email", value)
                }
              />
              <Field
                label="الموقع الإلكتروني"
                value={settings.website}
                dir="ltr"
                onChange={(value) =>
                  updateField("website", value)
                }
              />
              <div className="md:col-span-2">
                <Field
                  label="العنوان"
                  value={settings.address}
                  onChange={(value) =>
                    updateField("address", value)
                  }
                />
              </div>
            </div>
          </Section>

          <Section title="إعدادات طلب عرض السعر">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="بريد إشعارات RFQ"
                value={
                  settings.rfq_notification_email
                }
                type="email"
                dir="ltr"
                onChange={(value) =>
                  updateField(
                    "rfq_notification_email",
                    value
                  )
                }
              />
              <Field
                label="الحد الأقصى للملف (MB)"
                value={settings.max_upload_mb}
                type="number"
                onChange={(value) =>
                  updateField(
                    "max_upload_mb",
                    Number(value)
                  )
                }
              />
              <Checkbox
                label="تفعيل خيار NDA"
                checked={settings.nda_enabled}
                onChange={(value) =>
                  updateField(
                    "nda_enabled",
                    value
                  )
                }
              />
            </div>
          </Section>

          <Section title="إعدادات الاستشارات">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="مدة الاستشارة المجانية بالدقائق"
                value={
                  settings.consultation_minutes
                }
                type="number"
                onChange={(value) =>
                  updateField(
                    "consultation_minutes",
                    Number(value)
                  )
                }
              />
              <Field
                label="بريد إشعارات الاستشارات"
                value={
                  settings.consultation_notification_email
                }
                type="email"
                dir="ltr"
                onChange={(value) =>
                  updateField(
                    "consultation_notification_email",
                    value
                  )
                }
              />
              <Checkbox
                label="تفعيل الاستشارة المجانية"
                checked={
                  settings.free_consultation_enabled
                }
                onChange={(value) =>
                  updateField(
                    "free_consultation_enabled",
                    value
                  )
                }
              />
            </div>
          </Section>

          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-7 py-4 font-black text-white disabled:opacity-60"
          >
            <FaFloppyDisk />
            {saving
              ? "جارٍ الحفظ..."
              : "حفظ الإعدادات"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#071d49]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
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

function Checkbox({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5"
      />
      <span className="font-bold text-slate-700">
        {label}
      </span>
    </label>
  );
}
