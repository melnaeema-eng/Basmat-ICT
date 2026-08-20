import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBuildingColumns,
  FaEnvelope,
  FaFloppyDisk,
  FaGlobe,
  FaLocationDot,
  FaPhone,
  FaPlus,
  FaPrint,
  FaTrash,
  FaWhatsapp,
} from "react-icons/fa6";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import QRCode from "qrcode";
import { supabase } from "../../lib/supabase";

const emptyItem = {
  description: "",
  quantity: 1,
  unit: "",
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
  const consultationId = searchParams.get("consultation");

  const [form, setForm] = useState({
    quotation_no: createQuotationNumber(),
    rfq_id: rfqId || "",
    consultation_id: consultationId || "",
    customer_id: "",
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
    verification_code: "",
    verification_token: "",
  });

  const [items, setItems] = useState([
    { ...emptyItem },
  ]);
  const [saving, setSaving] = useState(false);
  const [verificationQr, setVerificationQr] = useState("");
  const [sending, setSending] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("ict_customers")
      .select("id,name,company_name,email,phone")
      .order("name");

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setCustomers(data || []);
  }

  function selectCustomer(customerId) {
    const customer = customers.find((row) => row.id === customerId);

    setForm((current) => ({
      ...current,
      customer_id: customerId,
      customer_name: customer?.name || "",
      company_name: customer?.company_name || "",
      customer_email: customer?.email || "",
      customer_phone: customer?.phone || "",
    }));
  }

  useEffect(() => {
    if (id) {
      loadQuotation(id);
    } else if (rfqId) {
      loadRFQ(rfqId);
    } else if (consultationId) {
      loadConsultation(consultationId);
    }
  }, [id, rfqId, consultationId]);

  async function loadRFQ(requestId) {
    const { data, error } = await supabase
      .from("ict_rfq_requests")
      .select(
        "id, request_no, customer_id, full_name, company, email, phone, project_type, project_description"
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
      customer_id: data.customer_id || "",
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

  async function loadConsultation(requestId) {
    const { data, error } = await supabase
      .from("ict_consultation_requests")
      .select(
        "id, request_no, customer_id, full_name, company, email, phone, consultation_type, subject, details"
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
      consultation_id: data.id,
      rfq_id: "",
      customer_id: data.customer_id || "",
      customer_name: data.full_name || "",
      company_name: data.company || "",
      customer_email: data.email || "",
      customer_phone: data.phone || "",
      subject: `عرض سعر - ${data.subject || data.consultation_type || data.request_no}`,
      notes: data.details || "",
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
      consultation_id: data.consultation_id || "",
      customer_id: data.customer_id || "",
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
      verification_code: data.verification_code || "",
      verification_token: data.verification_token || "",
    });

    setItems(
      Array.isArray(data.items) && data.items.length
        ? data.items.map((item) => ({
            ...emptyItem,
            ...item,
            unit: item?.unit || "",
          }))
        : [{ ...emptyItem }]
    );
  }

  useEffect(() => {
    let active = true;

    async function buildVerificationQr() {
      if (!form.verification_token) {
        setVerificationQr("");
        return;
      }

      try {
        const verificationUrl =
          `${window.location.origin}/verify-quotation/${form.verification_token}`;
        const dataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (active) setVerificationQr(dataUrl);
      } catch {
        if (active) setVerificationQr("");
      }
    }

    buildVerificationQr();
    return () => {
      active = false;
    };
  }, [form.verification_token]);

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
      if (!form.customer_id) {
        throw new Error("يجب اختيار العميل من CRM قبل حفظ عرض السعر.");
      }

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

      const {
        verification_code: _verificationCode,
        verification_token: _verificationToken,
        ...editableForm
      } = form;

      const payload = {
        ...editableForm,
        rfq_id: form.rfq_id || null,
        consultation_id: form.consultation_id || null,
        customer_id: form.customer_id,
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
          unit: String(item.unit || "").trim(),
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
          .select("id,verification_code,verification_token")
          .single();
      } else {
        result = await supabase
          .from("ict_quotations")
          .insert(payload)
          .select("id,verification_code,verification_token")
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setForm((current) => ({
        ...current,
        verification_code:
          result.data.verification_code || current.verification_code || "",
        verification_token:
          result.data.verification_token || current.verification_token || "",
      }));

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
      if (!form.customer_id) {
        throw new Error("يجب اختيار العميل من CRM قبل إرسال عرض السعر.");
      }

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

      const { error: quotationStatusError } = await supabase
        .from("ict_quotations")
        .update({
          status: "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", savedId);

      if (quotationStatusError) {
        throw quotationStatusError;
      }

      if (form.rfq_id) {
        const { error: rfqStatusError } = await supabase
          .from("ict_rfq_requests")
          .update({
            status: "quoted",
            workflow_updated_at: new Date().toISOString(),
          })
          .eq("id", form.rfq_id);

        if (rfqStatusError) {
          throw rfqStatusError;
        }
      }

      if (form.consultation_id) {
        const { error: consultationStatusError } = await supabase
          .from("ict_consultation_requests")
          .update({
            status: "quoted",
            workflow_updated_at: new Date().toISOString(),
          })
          .eq("id", form.consultation_id);

        if (consultationStatusError) {
          throw consultationStatusError;
        }
      }

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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-paper {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-footer {
            background: #071d49 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-footer * {
            color: #ffffff !important;
          }

          /* Compact company details, notes and terms for Print / PDF */
          .quotation-company {
            padding: 7px 9px !important;
          }

          .quotation-company p,
          .quotation-company span {
            font-size: 8px !important;
            line-height: 1.25 !important;
            margin-top: 1px !important;
            margin-bottom: 0 !important;
          }

          .quotation-company > div {
            margin-top: 3px !important;
          }

          .quotation-notes-terms {
            margin-top: 5mm !important;
            gap: 5px !important;
          }

          .quotation-notes-terms > div {
            padding: 6px 8px !important;
            border-radius: 5px !important;
          }

          .quotation-notes-terms p {
            font-size: 8px !important;
            line-height: 1.3 !important;
            margin-top: 1px !important;
            margin-bottom: 0 !important;
          }

          /* Give maximum PDF space to quotation items */
          .quotation-header {
            padding-bottom: 5px !important;
            gap: 8px !important;
          }

          .quotation-header img {
            width: 38px !important;
            height: 38px !important;
          }

          .quotation-header h2 {
            font-size: 12px !important;
            line-height: 1.1 !important;
          }

          .quotation-header p,
          .quotation-header input {
            font-size: 8px !important;
            line-height: 1.15 !important;
            margin-top: 1px !important;
          }

          .quotation-customer-block {
            margin-top: 4px !important;
            gap: 4px !important;
          }

          .quotation-customer-block label {
            margin: 0 !important;
          }

          .quotation-customer-block input,
          .quotation-customer-block select {
            padding: 4px 6px !important;
            min-height: 0 !important;
            font-size: 8px !important;
            line-height: 1.1 !important;
          }

          .quotation-customer-block span {
            margin-bottom: 1px !important;
            font-size: 7px !important;
            line-height: 1 !important;
          }

          .quotation-items {
            margin-top: 5px !important;
            min-height: 0 !important;
          }

          .quotation-items table {
            font-size: 8px !important;
          }

          .quotation-items-table {
            table-layout: fixed !important;
            width: 100% !important;
          }

          .quotation-items-table .qcol-sn { width: 4% !important; }
          .quotation-items-table .qcol-description { width: 39% !important; }
          .quotation-items-table .qcol-qty { width: 6% !important; }
          .quotation-items-table .qcol-unit { width: 7% !important; }
          .quotation-items-table .qcol-unit-price { width: 11% !important; }
          .quotation-items-table .qcol-total { width: 10% !important; }
          .quotation-items-table .qcol-vat { width: 9% !important; }
          .quotation-items-table .qcol-grand-total { width: 14% !important; }

          .quotation-description {
            min-height: 54px !important;
            white-space: pre-wrap !important;
            overflow-wrap: anywhere !important;
          }

          .quotation-items th {
            padding: 5px !important;
          }

          .quotation-items td {
            padding: 4px !important;
          }

          .quotation-items input {
            padding: 2px !important;
            font-size: 7.5px !important;
            line-height: 1.05 !important;
            border: 0 !important;
            background: transparent !important;
            text-align: center !important;
          }

          .quotation-items textarea {
            padding: 2px !important;
            font-size: 7.5px !important;
            line-height: 1.35 !important;
            border: 0 !important;
            background: transparent !important;
            resize: none !important;
            overflow: visible !important;
            min-height: 42px !important;
            height: auto !important;
            white-space: pre-wrap !important;
            overflow-wrap: anywhere !important;
          }

          .quotation-items-table .qcol-sn { width: 3% !important; }
          .quotation-items-table .qcol-description { width: 43% !important; }
          .quotation-items-table .qcol-qty { width: 5% !important; }
          .quotation-items-table .qcol-unit { width: 5% !important; }
          .quotation-items-table .qcol-unit-price { width: 10% !important; }
          .quotation-items-table .qcol-total { width: 9% !important; }
          .quotation-items-table .qcol-vat { width: 9% !important; }
          .quotation-items-table .qcol-grand-total { width: 16% !important; }

          .quotation-items th {
            white-space: normal !important;
            word-break: normal !important;
            line-height: 1.15 !important;
          }

          .quotation-items td {
            vertical-align: top !important;
          }

          .quotation-summary-block {
            margin-top: 5px !important;
            gap: 5px !important;
          }

          .quotation-summary-block textarea {
            min-height: 36px !important;
            height: 36px !important;
            padding: 4px 6px !important;
            font-size: 8px !important;
            line-height: 1.2 !important;
          }

          .quotation-summary-block label span {
            margin-bottom: 1px !important;
            font-size: 7px !important;
          }

          .quotation-summary-block > div {
            padding: 6px !important;
          }

          /* ===== PRINT: REPEAT BLUE TABLE HEADER ON EVERY PDF PAGE ===== */
          .quotation-items {
            overflow: visible !important;
          }

          .quotation-items table {
            width: 100% !important;
            border-collapse: collapse !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-table-head {
            display: table-header-group !important;
          }

          .quotation-table-head tr,
          .quotation-table-head th {
            background-color: #071d49 !important;
            background: #071d49 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-table-head th {
            font-size: 8px !important;
            font-weight: 900 !important;
            padding: 5px 4px !important;
            border: 1px solid #ffffff !important;
          }

          .quotation-items tbody {
            display: table-row-group !important;
          }

          .quotation-items tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ===== PRINT: TAX RATE AS NORMAL TEXT, NOT LARGE INPUT ===== */
          .print-tax-rate {
            display: inline !important;
            font-size: 8px !important;
            line-height: 1 !important;
            font-weight: 900 !important;
            color: #1e293b !important;
          }

          .quotation-tax-rate {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            min-width: 30px !important;
          }

          /* ===== PRINT: BLUE FOOTER ON EVERY PDF PAGE ===== */
          .quotation-footer {
            display: block !important;
            position: fixed !important;
            left: 8mm !important;
            right: 8mm !important;
            bottom: 5mm !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: #071d49 !important;
            background: #071d49 !important;
            color: #ffffff !important;
            z-index: 9999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-footer,
          .quotation-footer section,
          .quotation-footer div,
          .quotation-footer p,
          .quotation-footer span,
          .quotation-footer strong,
          .quotation-footer svg {
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .quotation-footer > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            background-color: #071d49 !important;
            background: #071d49 !important;
          }

          .quotation-footer section {
            background-color: #071d49 !important;
            background: #071d49 !important;
            padding: 3px 6px !important;
            min-height: 0 !important;
          }

          .quotation-footer section > div,
          .quotation-footer section p {
            margin-top: 1px !important;
            margin-bottom: 0 !important;
            line-height: 1.05 !important;
          }

          .quotation-footer img {
            width: 22px !important;
            height: 22px !important;
            padding: 1px !important;
          }

          .quotation-footer p,
          .quotation-footer span,
          .quotation-footer strong {
            font-size: 6.5px !important;
            line-height: 1.05 !important;
          }

          .quotation-footer svg {
            width: 6px !important;
            height: 6px !important;
          }

          .quotation-footer > div:last-child {
            background-color: #071d49 !important;
            background: #071d49 !important;
            padding: 2px 5px !important;
            font-size: 6px !important;
            line-height: 1 !important;
          }

          /* Tax percentage must match the surrounding values */

          /* Keep summary blocks together when possible */
          .quotation-summary-block,
          .quotation-totals,
          .quotation-notes-terms {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Compact totals and keep simple quotations on one PDF page */
          .quotation-totals {
            padding: 5px 8px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .quotation-totals p,
          .quotation-totals span,
          .quotation-totals strong {
            font-size: 8px !important;
            line-height: 1.15 !important;
          }

          .quotation-totals p {
            margin-top: 2px !important;
            padding-top: 2px !important;
          }

          .quotation-items table {
            break-inside: auto !important;
          }

          .quotation-items tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .quotation-items thead {
            display: table-header-group !important;
          }

          .quotation-items tfoot {
            display: table-footer-group !important;
          }

          /* Compact quotation footer specifically for Print / PDF */
          .quotation-footer {
            position: fixed !important;
            left: 10mm !important;
            right: 10mm !important;
            bottom: 5mm !important;
            margin: 0 !important;
            z-index: 50 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            background: #071d49 !important;
            color: #ffffff !important;
          }

          .quotation-paper {
            padding-bottom: 24mm !important;
          }

          .quotation-footer > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .quotation-footer section {
            padding: 5px 9px !important;
            min-height: 0 !important;
          }

          .quotation-footer section > div,
          .quotation-footer section p {
            margin-top: 2px !important;
            margin-bottom: 0 !important;
            line-height: 1.15 !important;
          }

          .quotation-footer img {
            width: 28px !important;
            height: 28px !important;
            padding: 1px !important;
          }

          .quotation-footer p,
          .quotation-footer span,
          .quotation-footer strong {
            font-size: 7.5px !important;
            line-height: 1.2 !important;
          }

          .quotation-footer svg {
            width: 8px !important;
            height: 8px !important;
          }

          .quotation-footer > div:last-child {
            padding: 2px 6px !important;
            font-size: 6.5px !important;
            line-height: 1 !important;
          }

          .quotation-footer section {
            padding: 3px 7px !important;
          }

          .quotation-footer img {
            width: 24px !important;
            height: 24px !important;
          }

          .quotation-footer p,
          .quotation-footer span,
          .quotation-footer strong {
            font-size: 6.8px !important;
            line-height: 1.08 !important;
          }

          .quotation-footer svg {
            width: 7px !important;
            height: 7px !important;
          }

          @page {
            size: A4;
            margin: 7mm 8mm 24mm 8mm;
          }

          .quotation-paper {
            overflow: visible !important;
            padding-bottom: 0 !important;
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

        <div className="quotation-paper mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="quotation-header flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="بصمة النوابغ"
                className="h-14 w-14 rounded-full object-contain"
              />

              <div>
                <h2 className="text-xl font-black text-[#071d49]">
                  شركة بصمة النوابغ لتقنية المعلومات والاتصالات
                </h2>
                <p className="mt-1 text-xs font-black text-[#9b1733]">
                  SMART SOLUTIONS FOR A CONNECTED WORLD
                </p>
                <p className="mt-1 text-xs font-bold text-blue-700">
                  BASMAT ALNAWABIGH ICT
                </p>
              </div>
            </div>

            <div className="text-left">
              <p className="text-lg font-black text-[#071d49]">QUOTATION</p>
              <p className="text-sm font-black text-[#071d49]">عرض سعر</p>

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

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 py-3 text-xs font-black text-[#071d49]">
            <span dir="ltr">CR: 7053976143</span>
            <span dir="ltr">VAT: 314712238300003</span>
          </div>

          <div className="quotation-customer-block mt-5 grid gap-3 md:grid-cols-2">
            <label className="no-print md:col-span-2">
              <span className="mb-2 block font-bold text-slate-700">
                العميل من CRM *
              </span>
              <select
                value={form.customer_id}
                onChange={(event) => selectCustomer(event.target.value)}
                className="form-input"
              >
                <option value="">اختر العميل قبل حفظ أو إرسال العرض</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name || customer.name}
                    {customer.name && customer.company_name ? ` — ${customer.name}` : ""}
                  </option>
                ))}
              </select>
            </label>

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

          <div className="quotation-items mt-4 overflow-x-auto">
            <table className="quotation-items-table w-full border-collapse text-right">
              <colgroup>
                <col className="qcol-sn" />
                <col className="qcol-description" />
                <col className="qcol-qty" />
                <col className="qcol-unit" />
                <col className="qcol-unit-price" />
                <col className="qcol-total" />
                <col className="qcol-vat" />
                <col className="qcol-grand-total" />
                <col className="qcol-delete no-print" />
              </colgroup>
              <thead className="quotation-table-head">
                <tr className="bg-[#071d49] text-white">
                  <th className="p-2">م<br/><span className="text-[9px]">S.N</span></th>
                  <th className="p-2">البيان<br/><span className="text-[9px]">DESCRIPTION</span></th>
                  <th className="p-2">الكمية<br/><span className="text-[9px]">QTY</span></th>
                  <th className="p-2">الوحدة<br/><span className="text-[9px]">UNIT</span></th>
                  <th className="p-2">سعر الوحدة<br/><span className="text-[9px]">UNIT PRICE (SAR)</span></th>
                  <th className="p-2">الإجمالي<br/><span className="text-[9px]">TOTAL (SAR)</span></th>
                  <th className="p-2">ضريبة القيمة المضافة<br/><span className="text-[9px]">VAT {form.tax_rate}% (SAR)</span></th>
                  <th className="p-2">الإجمالي شامل الضريبة<br/><span className="text-[9px]">TOTAL VAT INCLUDED</span></th>
                  <th className="no-print p-2">حذف</th>
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

                    <td className="p-2 align-top">
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        className="quotation-description w-full resize-y rounded-lg border border-slate-200 p-2 leading-6 outline-none"
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
                        className="w-full min-w-0 rounded-lg border border-slate-200 p-2 text-center"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={item.unit || ""}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unit",
                            event.target.value
                          )
                        }
                        placeholder="مثال: pcs / lot / m"
                        className="w-full min-w-0 rounded-lg border border-slate-200 p-2 text-center outline-none"
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
                        className="w-full min-w-0 rounded-lg border border-slate-200 p-2 text-center"
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

                    <td dir="ltr" className="p-2 font-black">
                      {formatMoney(
                        Number(item.quantity || 0) *
                        Number(item.unit_price || 0) *
                        (Number(form.tax_rate || 0) / 100)
                      )}
                    </td>

                    <td dir="ltr" className="p-2 font-black">
                      {formatMoney(
                        Number(item.quantity || 0) *
                        Number(item.unit_price || 0) *
                        (1 + Number(form.tax_rate || 0) / 100)
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

          <div className="quotation-summary-block mt-5 grid gap-4 lg:grid-cols-2">
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
                  الشروط والأحكام / Terms & Conditions
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

            <div className="quotation-totals rounded-xl bg-slate-50 p-4">
              <SummaryRow
                label="المجموع قبل الضريبة / Total Before VAT"
                value={`${formatMoney(
                  subtotal
                )} ${form.currency}`}
              />

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="font-bold text-slate-600">
                  الضريبة
                </span>

                <div className="quotation-tax-rate">
                  <div className="no-print flex items-center gap-1">
                    <input
                      type="number"
                      value={form.tax_rate}
                      onChange={(event) =>
                        updateField(
                          "tax_rate",
                          event.target.value
                        )
                      }
                      className="w-14 rounded-lg border border-slate-200 p-1.5 text-left text-sm"
                    />
                    <span className="text-sm">%</span>
                  </div>

                  <span
                    dir="ltr"
                    className="print-tax-rate hidden font-black text-slate-800"
                  >
                    {form.tax_rate}%
                  </span>
                </div>
              </div>

              <SummaryRow
                label="ضريبة القيمة المضافة / VAT"
                value={`${formatMoney(
                  taxAmount
                )} ${form.currency}`}
              />

              <div className="mt-5 border-t border-slate-300 pt-5">
                <SummaryRow
                  label="الإجمالي شامل الضريبة / Total Due (Incl. VAT)"
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

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 text-center md:grid-cols-3">
            <div>
              <p className="font-black text-[#071d49]">التحقق من صحة العرض / Verify Quotation</p>
              {form.verification_token && verificationQr ? (
                <>
                  <img
                    src={verificationQr}
                    alt="Quotation verification QR"
                    className="mx-auto mt-3 h-24 w-24 rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <p dir="ltr" className="mt-2 text-xs font-black tracking-wide text-[#071d49]">
                    {form.verification_code}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    امسح QR للتحقق من حالة وصحة عرض السعر
                  </p>
                </>
              ) : (
                <div className="mx-auto mt-5 max-w-48 rounded-lg border border-dashed border-slate-300 p-3 text-[10px] text-slate-500">
                  احفظ عرض السعر لإنشاء رمز التحقق تلقائيًا.
                </div>
              )}
            </div>
            <div><p className="font-black text-[#071d49]">التوقيع / Signature</p><div className="mx-auto mt-8 w-40 border-b border-dotted border-slate-500" /></div>
            <div><p className="font-black text-[#071d49]">اعتماد العميل / Customer Signature & Stamp</p><div className="mx-auto mt-8 w-40 border-b border-dotted border-slate-500" /></div>
          </div>

          <footer
            className="quotation-footer -mx-7 -mb-7 mt-12 overflow-hidden md:-mx-10 md:-mb-10"
            style={{
              backgroundColor: "#071d49",
              color: "#ffffff",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            <div className="grid lg:grid-cols-4">
              <section className="border-b border-white/15 px-4 py-3 lg:border-b-0 lg:border-l">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="بصمة النوابغ"
                    className="h-10 w-10 rounded-full bg-white object-contain p-1"
                  />
                  <div>
                    <p className="text-sm font-black text-white">بصمة النوابغ</p>
                    <p className="mt-0.5 text-[10px] font-bold text-white">لتقنية المعلومات والاتصالات</p>
                    <p className="text-[9px] font-black text-white">BASMAT ALNAWABIGH ICT</p>
                  </div>
                </div>
                <p className="mt-2 flex items-start gap-2 text-[10px] text-white">
                  <FaLocationDot className="mt-1 shrink-0" />
                  <span>الرياض، المملكة العربية السعودية</span>
                </p>
              </section>

              <section className="border-b border-white/15 px-4 py-3 lg:border-b-0 lg:border-l">
                <p className="text-xs font-black text-white">التواصل</p>
                <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-white">
                  <p className="flex items-center gap-3"><FaPhone /><span dir="ltr">+966 55 007 3576</span></p>
                  <p className="flex items-center gap-3"><FaPhone /><span dir="ltr">+966 53 480 7359</span></p>
                  <p className="flex items-center gap-3"><FaEnvelope /><span dir="ltr" className="break-all">info@ict.basmat-alnawabig.com.sa</span></p>
                </div>
              </section>

              <section className="border-b border-white/15 px-4 py-3 lg:border-b-0 lg:border-l">
                <p className="text-xs font-black text-white">الموقع ووسائل التواصل</p>
                <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-white">
                  <p className="flex items-center gap-3"><FaGlobe /><span dir="ltr" className="break-all">ict.basmat-alnawabig.com.sa</span></p>
                  <p className="flex items-center gap-3"><FaWhatsapp /><span dir="ltr">+966 55 007 3576</span></p>
                  <p className="flex items-center gap-3"><FaWhatsapp /><span dir="ltr">+966 53 480 7359</span></p>
                </div>
              </section>

              <section className="px-4 py-3">
                <p className="text-xs font-black text-white">الحساب البنكي / BANK ACCOUNT</p>
                <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-white">
                  <p className="flex items-center gap-3"><FaBuildingColumns /><span>مصرف الراجحي</span></p>
                  <p>اسم الحساب: <strong>بصمة النوابغ</strong></p>
                  <div>
                    <p className="text-xs font-black">IBAN / آيبان</p>
                    <p dir="ltr" className="mt-1 rounded-md border border-white/25 bg-white/10 px-2 py-1.5 text-center text-[9px] font-black">
                      SA98800002262080197371903
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="border-t border-white/20 px-4 py-2 text-center text-[9px] font-bold text-white">
              <span>CR: 7053976143</span>
              <span className="mx-3">•</span>
              <span>VAT: 314712238300003</span>
              <span className="mx-3">•</span>
              <span dir="ltr">ict.basmat-alnawabig.com.sa</span>
            </div>
          </footer>
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