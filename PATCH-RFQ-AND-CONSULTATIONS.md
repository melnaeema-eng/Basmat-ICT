# خطوة دمج CRM داخل صفحات RFQ والاستشارات

Sprint 3 يضيف المكون:

```text
src/components/admin/RequestWorkflowPanel.jsx
```

لأن ملفات AdminRFQs.jsx و AdminConsultations.jsx قد تكون عدلتها أثناء Sprint 1/2، لم يتم استبدالهما حتى لا نفقد واجهتك الحالية.

## داخل AdminRFQs.jsx

أضف:

```jsx
import RequestWorkflowPanel from "../../components/admin/RequestWorkflowPanel";
```

ثم داخل كل بطاقة طلب، بعد بيانات الطلب:

```jsx
<RequestWorkflowPanel
  requestType="rfq"
  request={request}
  onUpdated={loadRFQs}
/>
```

إذا كان اسم العنصر داخل map هو `rfq` بدل `request`:

```jsx
<RequestWorkflowPanel
  requestType="rfq"
  request={rfq}
  onUpdated={loadRFQs}
/>
```

## داخل AdminConsultations.jsx

أضف:

```jsx
import RequestWorkflowPanel from "../../components/admin/RequestWorkflowPanel";
```

ثم داخل بطاقة الاستشارة:

```jsx
<RequestWorkflowPanel
  requestType="consultation"
  request={request}
  onUpdated={loadConsultations}
/>
```

إذا كان اسم العنصر `consultation` استخدمه بدل `request`.

## مهم

في `.select(...)` داخل الصفحتين تأكد أن الحقول التالية موجودة أو استخدم `.select("*")`:

```text
assigned_to
priority
internal_notes
workflow_updated_at
status
```
