import { useMemo, useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const num = (value) => Number(value || 0);
const money = (value) =>
  num(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const statusLabels = {
  draft: ["Draft", "مسودة"],
  issued: ["Issued", "صادرة"],
  partially_paid: ["Partially Paid", "مدفوعة جزئيًا"],
  paid: ["Paid", "مدفوعة"],
  overdue: ["Overdue", "متأخرة"],
  cancelled: ["Cancelled", "ملغاة"],
  canceled: ["Cancelled", "ملغاة"],
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function InvoicePrintView({
  invoice,
  payments = [],
  project = null,
  customer = null,
  onClose,
}) {
  const printRef = useRef(null);
  const [customerRecord, setCustomerRecord] = useState(null);
  const [customerError, setCustomerError] = useState("");
  useEffect(() => {
    let active = true;
    setCustomerRecord(null);
    setCustomerError("");
    if (!invoice?.customer_id) return;
    supabase.from("ict_customers").select("*").eq("id", invoice.customer_id).maybeSingle()
      .then(({ data, error }) => {
        if (active) {
          setCustomerRecord(data || null);
          setCustomerError(error?.message || "");
        }
      });
    return () => { active = false; };
  }, [invoice?.customer_id]);
  const receivedPayments = useMemo(
    () =>
      (payments || []).filter(
        (payment) =>
          payment.invoice_id === invoice?.id &&
          String(payment.status || "").toLowerCase() === "received"
      ),
    [payments, invoice?.id]
  );

  if (!invoice) return null;

  const client = customer || customerRecord || {};
  const pick = (...values) => values.find(v => v !== null && v !== undefined && String(v).trim() !== "") || "—";
  const clientValue = (...keys) => pick(...keys.map(k => client[k]), ...keys.map(k => invoice[k]));
  const currency = invoice.currency || "SAR";
  const paidFromPayments = receivedPayments.reduce(
    (sum, payment) => sum + num(payment.amount),
    0
  );
  const paid = num(invoice.amount_paid) || paidFromPayments;
  const total = num(invoice.total_amount);
  const balance =
    invoice.balance_due !== null && invoice.balance_due !== undefined
      ? num(invoice.balance_due)
      : Math.max(total - paid, 0);
  const subtotal =
    invoice.subtotal !== null && invoice.subtotal !== undefined
      ? num(invoice.subtotal)
      : null;
  const taxAmount =
    invoice.tax_amount !== null && invoice.tax_amount !== undefined
      ? num(invoice.tax_amount)
      : subtotal !== null
      ? Math.max(total - subtotal, 0)
      : null;
  const taxRate =
    invoice.tax_rate !== null && invoice.tax_rate !== undefined
      ? num(invoice.tax_rate)
      : 15;
  const status = statusLabels[String(invoice.status || "").toLowerCase()] || [
    invoice.status || "—",
    invoice.status || "—",
  ];


  function printInvoice() {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      window.alert("Please allow pop-ups to print the invoice / يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    const headAssets = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base href="${window.location.origin}/" />
<title>${invoice.invoice_no || "Invoice"}</title>
${headAssets}
<style>
  @page { size: A4 portrait; margin: 10mm; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111827 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body { font-family: Arial, Tahoma, sans-serif !important; }
  .invoice-print-root {
    width: 100% !important;
    max-width: 190mm !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 auto !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }
  .invoice-print-root * { box-sizing: border-box !important; }
  .invoice-print-root header,
  .invoice-print-root tr,
  .invoice-print-root .inv-keep {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .invoice-print-root table {
    width: 100% !important;
    break-inside: auto !important;
    page-break-inside: auto !important;
  }
  .invoice-print-root thead { display: table-header-group !important; }
  .invoice-print-root tfoot { display: table-footer-group !important; }
  .invoice-print-root img { max-width: 100% !important; }
  .invoice-no-print { display: none !important; }
</style>
</head>
<body>
${content.outerHTML}
<script>
  window.addEventListener("load", function () {
    setTimeout(function () {
      window.focus();
      window.print();
    }, 400);
  });
  window.addEventListener("afterprint", function () { window.close(); });
<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <div className="invoice-modal fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3 md:p-8">
      <style>{`
        .invoice-print-root { font-family: Arial, Tahoma, sans-serif; }
        .invoice-print-root * { box-sizing: border-box; }
        .invoice-print-root .inv-label-ar { direction: rtl; }
      `}</style>

      <div className="invoice-no-print mx-auto mb-3 flex max-w-[210mm] justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white px-5 py-2.5 font-black text-slate-700 shadow"
        >
          إغلاق
        </button>
        <button
          type="button"
          onClick={printInvoice}
          className="rounded-xl bg-[#123878] px-5 py-2.5 font-black text-white shadow"
        >
          طباعة / PDF
        </button>
      </div>

      <section ref={printRef} className="invoice-print-root mx-auto min-h-[277mm] max-w-[210mm] rounded-2xl bg-white p-8 shadow-2xl md:p-10">
        <header className="flex items-start justify-between gap-6 border-b-4 border-[#123878] pb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Basmat Alnawabigh" className="h-20 w-20 object-contain" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#071d49]">BASMAT ALNAWABIGH</h1>
              <p dir="rtl" className="mt-1 text-sm font-bold text-slate-600">بصمة النوابغ للاتصالات وتقنية المعلومات</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Riyadh, Saudi Arabia · info@ict.basmat-alnawabig.com.sa</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-black tracking-wide text-[#123878]">INVOICE</div>
            <div dir="rtl" className="text-lg font-black text-[#ff7417]">فاتورة</div>
            <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-black text-slate-800">
              {invoice.invoice_no || "—"}
            </div>
          </div>
        </header>

        {customerError && <p className="inv-section mt-4 text-xs text-red-700">Customer details could not be loaded: {customerError}</p>}
        <div className="inv-section mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoBox title="SELLER" titleAr="بيانات البائع">
            <InfoRow label="Name" labelAr="الاسم" value="Basmat Alnawabigh / بصمة النوابغ" />
            <InfoRow label="VAT No." labelAr="الرقم الضريبي" value="314712238300003" ltr />
            <InfoRow label="C.R." labelAr="السجل التجاري" value="7053976143" ltr />
            <InfoRow label="Email" labelAr="البريد الإلكتروني" value="info@ict.basmat-alnawabig.com.sa" ltr />
            <InfoRow label="Phone" labelAr="الهاتف" value="+966 53 880 7359 / +966 55 007 3576" ltr />
            <InfoRow label="Address" labelAr="العنوان" value="Riyadh, Saudi Arabia" />
            <InfoRow label="Website" labelAr="الموقع" value="ict.basmat-alnawabig.com.sa" ltr />
          </InfoBox>
          <InfoBox title="CUSTOMER" titleAr="بيانات العميل">
            <InfoRow label="Name" labelAr="الاسم" value={clientValue("company_name", "name", "customer_name")} />
            <InfoRow label="VAT No." labelAr="الرقم الضريبي" value={clientValue("vat_number", "tax_number", "vat_no", "tax_id")} ltr />
            <InfoRow label="C.R." labelAr="السجل التجاري" value={clientValue("cr_number", "commercial_registration", "commercial_registration_number")} ltr />
            <InfoRow label="Email" labelAr="البريد الإلكتروني" value={clientValue("email", "contact_email")} ltr />
            <InfoRow label="Phone" labelAr="الهاتف" value={clientValue("phone", "contact_phone", "mobile")} ltr />
            <InfoRow label="Address" labelAr="العنوان" value={clientValue("address", "billing_address", "registered_address")} />
          </InfoBox>
        </div>

        <div className="inv-section mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoBox title="INVOICE DETAILS" titleAr="بيانات الفاتورة">
            <InfoRow label="Issue Date" labelAr="تاريخ الإصدار" value={formatDate(invoice.issue_date)} />
            <InfoRow label="Due Date" labelAr="تاريخ الاستحقاق" value={formatDate(invoice.due_date)} />
            <InfoRow label="Status" labelAr="الحالة" value={`${status[0]} / ${status[1]}`} />
            <InfoRow label="Currency" labelAr="العملة" value={currency} />
          </InfoBox>

          <InfoBox title="PROJECT" titleAr="المشروع">
            <InfoRow label="Project No." labelAr="رقم المشروع" value={project?.project_no || invoice.project_no || "—"} />
            <InfoRow label="Project Name" labelAr="اسم المشروع" value={project?.project_name || invoice.project_name || "—"} />
            <InfoRow label="Contract No." labelAr="رقم العقد" value={invoice.contract_no || "—"} />
            <InfoRow label="Reference" labelAr="المرجع" value={invoice.reference_no || "—"} />
          </InfoBox>
        </div>

        <div className="inv-section mt-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1fr_auto] items-center bg-[#123878] px-5 py-3 text-white">
            <div>
              <div className="text-sm font-black">AMOUNT SUMMARY</div>
              <div dir="rtl" className="text-xs font-bold opacity-90">ملخص المبالغ</div>
            </div>
            <div className="text-xs font-bold">{currency}</div>
          </div>

          <div className="divide-y divide-slate-200">
            {subtotal !== null && (
              <AmountRow label="Subtotal" labelAr="الإجمالي قبل الضريبة" value={subtotal} currency={currency} />
            )}
            {taxAmount !== null && (
              <AmountRow label={`VAT (${taxRate}%)`} labelAr={`ضريبة القيمة المضافة (${taxRate}%)`} value={taxAmount} currency={currency} />
            )}
            <AmountRow label="Invoice Total" labelAr="إجمالي الفاتورة" value={total} currency={currency} strong />
            <AmountRow label="Paid Amount" labelAr="المبلغ المحصل" value={paid} currency={currency} />
            <AmountRow label="Balance Due" labelAr="الرصيد المتبقي" value={balance} currency={currency} highlight />
          </div>
        </div>

        {receivedPayments.length > 0 && (
          <div className="inv-section mt-6">
            <div className="mb-3 flex items-end justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="font-black text-[#071d49]">PAYMENT HISTORY</h2>
                <p dir="rtl" className="text-xs font-bold text-slate-500">سجل الدفعات</p>
              </div>
              <span className="text-xs text-slate-500">{receivedPayments.length} payment(s)</span>
            </div>
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-200 p-2 text-left">Date / التاريخ</th>
                  <th className="border border-slate-200 p-2 text-left">Method / الطريقة</th>
                  <th className="border border-slate-200 p-2 text-left">Reference / المرجع</th>
                  <th className="border border-slate-200 p-2 text-right">Amount / المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {receivedPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border border-slate-200 p-2">{formatDate(payment.payment_date)}</td>
                    <td className="border border-slate-200 p-2">{payment.method || "—"}</td>
                    <td className="border border-slate-200 p-2 break-words">{payment.reference_no || "—"}</td>
                    <td dir="ltr" className="border border-slate-200 p-2 text-right font-bold">{money(payment.amount)} {payment.currency || currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.notes && (
          <div className="inv-section mt-6 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-black text-[#071d49]">NOTES / ملاحظات</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{invoice.notes}</p>
          </div>
        )}

        <div className="inv-section mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoBox title="BANK DETAILS" titleAr="البيانات البنكية">
            <InfoRow label="Bank" labelAr="البنك" value="Al Rajhi Bank / مصرف الراجحي" />
            <InfoRow label="Account Name" labelAr="اسم الحساب" value="Basmat Alnawabigh / بصمة النوابغ" />
            <InfoRow label="IBAN" labelAr="آيبان" value="SA98800002262080197371903" ltr />
          </InfoBox>

          <InfoBox title="COMPANY REGISTRATION" titleAr="بيانات الشركة">
            <InfoRow label="C.R." labelAr="السجل التجاري" value="7053976143" ltr />
            <InfoRow label="VAT No." labelAr="الرقم الضريبي" value="314712238300003" ltr />
            <InfoRow label="Website" labelAr="الموقع" value="ict.basmat-alnawabig.com.sa" ltr />
          </InfoBox>
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-[10px] leading-5 text-slate-500">
          This invoice is generated electronically by Basmat Alnawabigh ICT Portal.
          <br />
          هذه الفاتورة صادرة إلكترونيًا من بوابة بصمة النوابغ لتقنية المعلومات.
        </footer>
      </section>
    </div>
  );
}

function InfoBox({ title, titleAr, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 border-b border-slate-100 pb-2">
        <div className="text-xs font-black tracking-wide text-[#123878]">{title}</div>
        <div dir="rtl" className="text-xs font-bold text-slate-500">{titleAr}</div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, labelAr, value, ltr = false }) {
  return (
    <div className="grid grid-cols-[42%_58%] gap-2 text-xs leading-5 break-words">
      <div className="text-slate-500">
        <span>{label}</span>
        <span dir="rtl" className="inv-label-ar block">{labelAr}</span>
      </div>
      <div dir={ltr ? "ltr" : undefined} className={`font-bold text-slate-800 ${ltr ? "text-right" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function AmountRow({ label, labelAr, value, currency, strong = false, highlight = false }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] items-center px-5 py-3 ${highlight ? "bg-orange-50" : ""}`}>
      <div>
        <div className={`${strong || highlight ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>{label}</div>
        <div dir="rtl" className="text-xs font-bold text-slate-500">{labelAr}</div>
      </div>
      <div dir="ltr" className={`min-w-[150px] text-right ${highlight ? "text-xl font-black text-[#ff7417]" : strong ? "text-lg font-black text-[#071d49]" : "font-black text-slate-800"}`}>
        {money(value)} {currency}
      </div>
    </div>
  );
}
