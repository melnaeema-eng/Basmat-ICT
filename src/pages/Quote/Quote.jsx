import { useRef, useState } from "react";
import {
  FaFile,
  FaFileArrowUp,
  FaTrash,
} from "react-icons/fa6";

import { supabase } from "../../lib/supabase";
import SectionWaves from "../../components/SectionWaves/SectionWaves";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const publicEmailDomains = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
];

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
  { value: "boq", label: "BOQ" },
  { value: "specification", label: "Specification" },
  { value: "rfi", label: "RFI" },
  { value: "mir", label: "MIR" },
  { value: "wir", label: "WIR" },
  { value: "fat", label: "FAT" },
  { value: "sat", label: "SAT" },
  { value: "itp", label: "ITP" },
  { value: "as-built", label: "As-Built Drawing" },
  { value: "site-photos", label: "Site Photos" },
  { value: "other", label: "Other" },
];

const projectTypes = [
  { value: "data-center", label: "مراكز البيانات" },
  { value: "ict", label: "تقنية المعلومات" },
  { value: "cyber-security", label: "الأمن السيبراني" },
  {
    value: "network-infrastructure",
    label: "الشبكات والبنية التحتية",
  },
  {
    value: "elv",
    label: "أنظمة ELV والمباني الذكية",
  },
  { value: "fiber-optic", label: "الألياف الضوئية" },
  { value: "osp", label: "شبكات OSP" },
  { value: "cloud", label: "الحوسبة السحابية" },
  {
    value: "engineering-consultancy",
    label: "الاستشارات الهندسية",
  },
  { value: "other", label: "أخرى" },
];

const projectValues = [
  "أقل من 100 ألف ريال",
  "من 100 إلى 500 ألف ريال",
  "من 500 ألف إلى مليون ريال",
  "أكثر من مليون ريال",
  "غير محدد",
];

const initialForm = {
  customer_type: "individual",
  full_name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  project_type: "",
  project_value: "",
  expected_start_date: "",
  project_description: "",
  document_type: "",
  nda_required: false,
};

export default function Quote() {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);

  function updateField(name, value) {
    setForm((current) => {
      if (name === "customer_type" && value === "individual") {
        return {
          ...current,
          customer_type: value,
          company: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  }

  function isBusinessEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split("@")[1];

    if (!domain) {
      return false;
    }

    return !publicEmailDomains.includes(domain);
  }

  function createRequestNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-8);

    return `RFQ-${year}-${timestamp}`;
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
      const existingKeys = new Set(
        current.map(
          (file) =>
            `${file.name}-${file.size}-${file.lastModified}`
        )
      );

      const newFiles = incomingFiles.filter(
        (file) =>
          !existingKeys.has(
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
        "rfq",
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
    setUploadProgress("");

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

    if (
      form.customer_type === "company" &&
      (!form.company.trim() || !form.city.trim())
    ) {
      setErrorMessage(
        "اسم الشركة والمدينة مطلوبان عند اختيار شركة أو جهة."
      );
      return;
    }

    if (
      form.customer_type === "company" &&
      !isBusinessEmail(form.email)
    ) {
      setErrorMessage(
        "يرجى استخدام البريد التجاري الرسمي للشركة، مثل name@company.com."
      );
      return;
    }

    if (selectedFiles.length > 0 && !form.document_type) {
      setErrorMessage(
        "يرجى اختيار نوع المستند قبل رفع المرفقات."
      );
      return;
    }

    const requestNumber = createRequestNumber();

    try {
      setSubmitting(true);

      let attachments = [];

      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(requestNumber);
      }

      setUploadProgress("جارٍ حفظ طلب عرض السعر...");

      const { error } = await supabase
        .from("ict_rfq_requests")
        .insert({
          request_no: requestNumber,
          customer_type: form.customer_type,
          full_name: form.full_name.trim(),
          company: form.company.trim() || null,
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          city: form.city.trim() || null,
          project_type: form.project_type,
          project_value: form.project_value || null,
          expected_start_date:
            form.expected_start_date || null,
          project_description:
            form.project_description.trim(),
          attachments,
          nda_required: form.nda_required,
          status: "new",
        });

      if (error) {
        throw error;
      }

      setForm(initialForm);
      setSelectedFiles([]);
      setSuccessData({
        requestNumber,
      });
    } catch (error) {
      console.error("خطأ في طلب عرض السعر:", error);

      setErrorMessage(
        error.message ||
          "تعذر إرسال طلب عرض السعر. حاول مرة أخرى."
      );
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
          <span className="font-bold tracking-[0.25em] text-cyan-300">
            REQUEST FOR QUOTATION
          </span>

          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            اطلب عرض سعر
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-blue-100">
            أرسل تفاصيل مشروعك والمرفقات الهندسية، وسيتولى
            فريق بصمة النوابغ مراجعة المتطلبات وإعداد العرض
            الفني والمالي المناسب.
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
                <h2 className="text-3xl font-black text-[#071d49]">
                  معلومات طلب عرض السعر
                </h2>

                <p className="mt-3 leading-8 text-slate-600">
                  الحقول التي تحمل علامة النجمة مطلوبة.
                </p>

                {errorMessage && (
                  <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-8">
                  <p className="mb-3 font-bold text-slate-700">
                    نوع مقدم الطلب
                    <span className="mr-1 text-red-500">*</span>
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateField("customer_type", "individual")
                      }
                      className={`rounded-2xl border-2 p-5 text-right transition ${
                        form.customer_type === "individual"
                          ? "border-blue-600 bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <p className="text-lg font-black text-[#071d49]">
                        فرد
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        للأفراد وأصحاب المشاريع الشخصية.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateField("customer_type", "company")
                      }
                      className={`rounded-2xl border-2 p-5 text-right transition ${
                        form.customer_type === "company"
                          ? "border-[#ff7417] bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-orange-300"
                      }`}
                    >
                      <p className="text-lg font-black text-[#071d49]">
                        شركة أو جهة
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        يتطلب اسم الجهة وبريدًا تجاريًا رسميًا.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="mt-9 grid gap-6 md:grid-cols-2">
                  <FormField
                    label={
                      form.customer_type === "company"
                        ? "اسم مسؤول التواصل"
                        : "الاسم الكامل"
                    }
                    required
                  >
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(event) =>
                        updateField(
                          "full_name",
                          event.target.value
                        )
                      }
                      className="form-input"
                    />
                  </FormField>

                  {form.customer_type === "company" && (
                    <FormField
                      label="اسم الشركة أو الجهة"
                      required
                    >
                      <input
                        type="text"
                        value={form.company}
                        onChange={(event) =>
                          updateField(
                            "company",
                            event.target.value
                          )
                        }
                        placeholder="اسم الشركة أو الجهة"
                        className="form-input"
                      />
                    </FormField>
                  )}

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

                  <FormField
                    label={
                      form.customer_type === "company"
                        ? "البريد التجاري الرسمي"
                        : "البريد الإلكتروني"
                    }
                    required
                  >
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder={
                        form.customer_type === "company"
                          ? "name@company.com"
                          : "name@example.com"
                      }
                      dir="ltr"
                      className="form-input"
                    />

                    {form.customer_type === "company" && (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        لا تُقبل عناوين Gmail أو Hotmail أو Yahoo أو Outlook
                        لطلبات الشركات.
                      </p>
                    )}
                  </FormField>

                  <FormField
                    label="المدينة"
                    required={form.customer_type === "company"}
                  >
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
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

                  <FormField label="القيمة التقديرية">
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
                      <option value="">اختر القيمة</option>

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
                        className="form-input resize-none"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-10">
                  <h3 className="text-2xl font-black text-[#071d49]">
                    المرفقات الهندسية
                  </h3>

                  <p className="mt-3 text-slate-600">
                    يمكنك رفع عدة ملفات داعمة للمشروع.
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
                        <option value="">
                          اختر نوع المستند
                        </option>

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
                    أحتاج إلى توقيع اتفاقية سرية المعلومات
                    (NDA) قبل مراجعة المستندات.
                  </span>
                </label>

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
        تم حفظ بيانات الطلب والمرفقات الهندسية بنجاح.
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
        className="mt-8 rounded-2xl bg-[#071d49] px-8 py-4 font-black text-white"
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

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}