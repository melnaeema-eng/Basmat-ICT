import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import SectionWaves from "../../components/SectionWaves/SectionWaves";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import {
  FaFile,
  FaFileArrowUp,
  FaTrash,
} from "react-icons/fa6";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const allowedExtensions = [
  "pdf",
  "dwg",
  "dxf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "jpg",
  "jpeg",
  "png",
];

const documentTypes = [
  { value: "shop-drawing", label: "Shop Drawing" },
  { value: "material-submittal", label: "Material Submittal" },
  { value: "method-statement", label: "Method Statement" },
  { value: "rfi", label: "RFI" },
  { value: "mir", label: "MIR" },
  { value: "wir", label: "WIR" },
  { value: "fat", label: "FAT" },
  { value: "sat", label: "SAT" },
  { value: "itp", label: "ITP" },
  { value: "boq", label: "BOQ" },
  { value: "specification", label: "Specification" },
  { value: "as-built", label: "As-Built Drawing" },
  { value: "site-photos", label: "Site Photos" },
  { value: "other", label: "أخرى" },
];
const initialForm = {
  full_name: "",
  company: "",
  phone: "",
  email: "",
  consultation_type: "",
  subject: "",
  details: "",
  document_type: "",
  nda_required: false,
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
   const fileInputRef = useRef(null);
   const { profile } = useCustomerAuth();

const [selectedFiles, setSelectedFiles] = useState([]);
const [dragging, setDragging] = useState(false);
const [uploadProgress, setUploadProgress] = useState(""); 
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!profile) return;

    setForm((current) => ({
      ...current,
      full_name: current.full_name || profile.full_name || profile.customer?.name || "",
      company: current.company || profile.customer?.company_name || "",
      phone: current.phone || profile.customer?.phone || "",
      email: current.email || profile.email || profile.customer?.email || "",
    }));
  }, [profile]);
  

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
function getFileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function validateFile(file) {
  const extension = getFileExtension(file.name);

  if (!allowedExtensions.includes(extension)) {
    return `نوع الملف غير مسموح: ${file.name}`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `حجم الملف أكبر من 50MB: ${file.name}`;
  }

  return "";
}

function addFiles(fileList) {
  setErrorMessage("");

  const incomingFiles = Array.from(fileList);

  for (const file of incomingFiles) {
    const validationError = validateFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
  }

  setSelectedFiles((current) => {
    const existing = new Set(
      current.map(
        (file) =>
          `${file.name}-${file.size}-${file.lastModified}`
      )
    );

    const newFiles = incomingFiles.filter(
      (file) =>
        !existing.has(
          `${file.name}-${file.size}-${file.lastModified}`
        )
    );

    return [...current, ...newFiles];
  });
}

function handleFileChange(event) {
  addFiles(event.target.files);
  event.target.value = "";
}

function handleDrop(event) {
  event.preventDefault();
  setDragging(false);

  if (event.dataTransfer.files?.length) {
    addFiles(event.dataTransfer.files);
  }
}

function removeFile(indexToRemove) {
  setSelectedFiles((current) =>
    current.filter((_, index) => index !== indexToRemove)
  );
}

function sanitizeFileName(fileName) {
  const extension = getFileExtension(fileName);

  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `${baseName || "document"}.${extension}`;
}

async function uploadFiles(requestNumber) {
  const attachments = [];

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const file = selectedFiles[index];

    setUploadProgress(
      `جارٍ رفع الملف ${index + 1} من ${selectedFiles.length}`
    );

    const safeName = sanitizeFileName(file.name);
    const uniqueName = `${Date.now()}-${index}-${safeName}`;

    const storagePath = [
      "consultation",
      requestNumber,
      form.document_type || "general",
      uniqueName,
    ].join("/");

    const { error } = await supabase.storage
      .from("engineering-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(
        `تعذر رفع الملف ${file.name}: ${error.message}`
      );
    }

    attachments.push({
      original_name: file.name,
      storage_path: storagePath,
      document_type: form.document_type || "general",
      mime_type: file.type || null,
      size: file.size,
    });
  }

  return attachments;
}
  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessData(null);

    if (!profile?.customer_id) {
      setErrorMessage("يجب تسجيل الدخول بحساب العميل قبل إرسال الاستشارة.");
      return;
    }

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
if (selectedFiles.length > 0 && !form.document_type) {
  setErrorMessage(
    "يرجى اختيار نوع المستند قبل إرسال المرفقات."
  );
  return;
}
    try {
      setSubmitting(true);

      let attachments = [];

      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(requestNumber);
      }

      setUploadProgress("جارٍ حفظ طلب الاستشارة...");

      const { data: requestData, error } = await supabase
        .from("ict_consultation_requests")
        .insert({
          customer_id: profile.customer_id,
            document_type: form.document_type || null,
attachments,
nda_required: form.nda_required,
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
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      if (form.nda_required && requestData?.id) {
        const { data: ndaId, error: ndaError } = await supabase.rpc(
          "create_customer_nda",
          { p_source_type: "consultation", p_source_id: requestData.id }
        );

        if (ndaError) throw ndaError;

        const { error: mailError } = await supabase.functions.invoke(
          "send-nda-email",
          { body: { nda_id: ndaId } }
        );

        if (mailError) {
          console.warn("تم حفظ NDA لكن تعذر إرسال البريد:", mailError);
        }
      }

      setForm(initialForm);
      setSelectedFiles([]);
      
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
      setUploadProgress("");
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

                <div className="mt-10 border-t border-slate-200 pt-10">
                  <h3 className="text-2xl font-black text-[#071d49]">
                    المرفقات الهندسية
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    يمكنك إرفاق المخططات والمستندات التي تساعد المهندس
                    على فهم موضوع الاستشارة.
                  </p>

                  <div className="mt-6">
                    <FormField label="نوع المستند">
                      <select
                        value={form.document_type}
                        onChange={(event) =>
                          updateField(
                            "document_type",
                            event.target.value
                          )
                        }
                        className="form-input"
                      >
                        <option value="">اختر نوع المستند</option>

                        {documentTypes.map((item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-6 cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
                      dragging
                        ? "border-blue-500 bg-blue-100"
                        : "border-blue-300 bg-blue-50 hover:border-blue-500"
                    }`}
                  >
                    <FaFileArrowUp className="mx-auto text-5xl text-blue-700" />

                    <p className="mt-5 text-xl font-black text-[#071d49]">
                      اسحب الملفات هنا أو اضغط للاختيار
                    </p>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      PDF، DWG، DOCX، XLSX، ZIP، RAR والصور
                      <br />
                      الحد الأقصى 50MB لكل ملف
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-6 space-y-3">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}`}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <FaFile className="shrink-0 text-xl text-blue-700" />

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">
                                {file.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label={`حذف ${file.name}`}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <input
                    type="checkbox"
                    checked={form.nda_required}
                    onChange={(event) =>
                      updateField(
                        "nda_required",
                        event.target.checked
                      )
                    }
                    className="mt-1 h-5 w-5"
                  />

                  <span className="leading-7 text-orange-950">
                    أحتاج إلى توقيع اتفاقية سرية المعلومات (NDA)
                    قبل مراجعة المستندات أو مناقشة تفاصيل المشروع.
                  </span>
                </label>

                {form.nda_required && (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 leading-7 text-blue-900">
                    سيتواصل معك فريق بصمة النوابغ لإرسال اتفاقية NDA
                    قبل بدء المراجعة التفصيلية للمستندات.
                  </div>
                )}

                {uploadProgress && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">
                    {uploadProgress}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-8 w-full rounded-2xl bg-[#ff7417] px-9 py-4 text-lg font-black text-white transition hover:bg-[#ff812d] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {submitting
                    ? "جارٍ رفع الملفات وإرسال الطلب..."
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

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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