import { useEffect, useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBoxesStacked,
  FaBuilding,
  FaCircleCheck,
  FaClipboardList,
  FaLaptop,
  FaPlus,
  FaRotate,
  FaWarehouse,
} from "react-icons/fa6";
import { supabase } from "../../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const warehouseEmpty = {
  name: "",
  city: "",
  location: "",
  manager_employee_id: "",
};

const itemEmpty = {
  sku: "",
  name: "",
  category: "",
  unit: "pcs",
  warehouse_id: "",
  supplier_id: "",
  reorder_level: "",
  average_cost: "",
  serial_tracked: false,
};

const assetEmpty = {
  asset_name: "",
  category: "",
  serial_number: "",
  manufacturer: "",
  model: "",
  supplier_id: "",
  purchase_order_id: "",
  purchase_date: "",
  purchase_cost: "",
  warranty_end_date: "",
  warehouse_id: "",
};

const moveEmpty = {
  item_id: "",
  transaction_type: "receipt",
  quantity: "",
  unit_cost: "",
  project_id: "",
  purchase_order_id: "",
  reference_no: "",
};

export default function AdminInventoryAssets() {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pos, setPos] = useState([]);

  const [warehouseForm, setWarehouseForm] = useState(warehouseEmpty);
  const [itemForm, setItemForm] = useState(itemEmpty);
  const [assetForm, setAssetForm] = useState(assetEmpty);
  const [moveForm, setMoveForm] = useState(moveEmpty);

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [
      whRes,
      itemRes,
      txRes,
      assetRes,
      assignmentRes,
      supplierRes,
      projectRes,
      employeeRes,
      poRes,
    ] = await Promise.all([
      supabase.from("ict_warehouses").select("*").order("created_at", { ascending: false }),
      supabase.from("ict_inventory_items").select("*").order("created_at", { ascending: false }),
      supabase.from("ict_stock_transactions").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("ict_assets").select("*").order("created_at", { ascending: false }),
      supabase.from("ict_asset_assignments").select("*").order("assigned_at", { ascending: false }).limit(150),
      supabase.from("ict_suppliers").select("id,supplier_no,name,status").order("name"),
      supabase.from("ict_delivery_projects").select("id,project_no,project_name").order("created_at", { ascending: false }),
      supabase.from("ict_hr_employees").select("id,employee_code,full_name,status").eq("status", "active").order("full_name"),
      supabase.from("ict_purchase_orders").select("id,po_no,vendor_name,amount,status").order("created_at", { ascending: false }).limit(150),
    ]);

    const error =
      whRes.error ||
      itemRes.error ||
      txRes.error ||
      assetRes.error ||
      assignmentRes.error ||
      supplierRes.error ||
      projectRes.error ||
      employeeRes.error ||
      poRes.error;

    if (error) {
      setMessage(error.message);
    } else {
      setWarehouses(whRes.data || []);
      setItems(itemRes.data || []);
      setTransactions(txRes.data || []);
      setAssets(assetRes.data || []);
      setAssignments(assignmentRes.data || []);
      setSuppliers(supplierRes.data || []);
      setProjects(projectRes.data || []);
      setEmployees(employeeRes.data || []);
      setPos(poRes.data || []);
    }

    setLoading(false);
  }

  async function addWarehouse(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("ict_warehouses").insert({
      name: warehouseForm.name.trim(),
      city: warehouseForm.city.trim() || null,
      location: warehouseForm.location.trim() || null,
      manager_employee_id: warehouseForm.manager_employee_id || null,
      status: "active",
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تمت إضافة المستودع.");
      setWarehouseForm(warehouseEmpty);
      await load();
    }
    setBusy(false);
  }

  async function addItem(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("ict_inventory_items").insert({
      sku: itemForm.sku.trim() || null,
      name: itemForm.name.trim(),
      category: itemForm.category.trim() || null,
      unit: itemForm.unit || "pcs",
      warehouse_id: itemForm.warehouse_id || null,
      supplier_id: itemForm.supplier_id || null,
      reorder_level: Number(itemForm.reorder_level || 0),
      average_cost: Number(itemForm.average_cost || 0),
      serial_tracked: Boolean(itemForm.serial_tracked),
      status: "active",
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تمت إضافة الصنف.");
      setItemForm(itemEmpty);
      await load();
    }
    setBusy(false);
  }

  async function moveStock(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("ict_stock_move", {
      p_item_id: moveForm.item_id,
      p_transaction_type: moveForm.transaction_type,
      p_quantity: Number(moveForm.quantity || 0),
      p_unit_cost: Number(moveForm.unit_cost || 0),
      p_project_id: moveForm.project_id || null,
      p_purchase_order_id: moveForm.purchase_order_id || null,
      p_reference_no: moveForm.reference_no || null,
      p_notes: null,
    });

    if (error) setMessage(error.message);
    else {
      setMessage("تم تسجيل حركة المخزون.");
      setMoveForm(moveEmpty);
      await load();
    }
    setBusy(false);
  }

  async function addAsset(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("ict_assets").insert({
      asset_name: assetForm.asset_name.trim(),
      category: assetForm.category.trim() || null,
      serial_number: assetForm.serial_number.trim() || null,
      manufacturer: assetForm.manufacturer.trim() || null,
      model: assetForm.model.trim() || null,
      supplier_id: assetForm.supplier_id || null,
      purchase_order_id: assetForm.purchase_order_id || null,
      purchase_date: assetForm.purchase_date || null,
      purchase_cost: Number(assetForm.purchase_cost || 0),
      warranty_end_date: assetForm.warranty_end_date || null,
      warehouse_id: assetForm.warehouse_id || null,
      status: "available",
      condition: "good",
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تم تسجيل الأصل.");
      setAssetForm(assetEmpty);
      await load();
    }
    setBusy(false);
  }

  async function assignAsset(asset) {
    const type = window.prompt(
      'اكتب "employee" لتسليم موظف أو "project" لتسليم مشروع'
    );
    if (!type) return;

    if (type === "employee") {
      const employeeCode = window.prompt("اكتب رقم الموظف EMP-xxxx");
      if (!employeeCode) return;
      const employee = employees.find(
        (e) => (e.employee_code || "").toLowerCase() === employeeCode.toLowerCase()
      );
      if (!employee) {
        setMessage("لم يتم العثور على الموظف.");
        return;
      }

      setBusy(true);
      const { error } = await supabase.rpc("ict_assign_asset", {
        p_asset_id: asset.id,
        p_employee_id: employee.id,
        p_project_id: null,
        p_condition_out: asset.condition || "good",
        p_notes: null,
      });
      if (error) setMessage(error.message);
      else {
        setMessage("تم تسليم الأصل للموظف.");
        await load();
      }
      setBusy(false);
      return;
    }

    if (type === "project") {
      const projectNo = window.prompt("اكتب رقم المشروع");
      if (!projectNo) return;
      const project = projects.find(
        (p) => (p.project_no || "").toLowerCase() === projectNo.toLowerCase()
      );
      if (!project) {
        setMessage("لم يتم العثور على المشروع.");
        return;
      }

      setBusy(true);
      const { error } = await supabase.rpc("ict_assign_asset", {
        p_asset_id: asset.id,
        p_employee_id: null,
        p_project_id: project.id,
        p_condition_out: asset.condition || "good",
        p_notes: null,
      });
      if (error) setMessage(error.message);
      else {
        setMessage("تم تسليم الأصل للمشروع.");
        await load();
      }
      setBusy(false);
    }
  }

  async function returnAssignment(row) {
    const condition = window.prompt(
      "حالة الأصل عند الإعادة: new / good / fair / poor / damaged",
      "good"
    );
    if (!condition) return;

    setBusy(true);
    const { error } = await supabase.rpc("ict_return_asset", {
      p_assignment_id: row.id,
      p_condition_return: condition,
      p_notes: null,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("تمت إعادة الأصل.");
      await load();
    }
    setBusy(false);
  }

  const maps = useMemo(
    () => ({
      wh: Object.fromEntries(warehouses.map((r) => [r.id, r.name])),
      supplier: Object.fromEntries(suppliers.map((r) => [r.id, r.name])),
      project: Object.fromEntries(
        projects.map((r) => [r.id, r.project_name || r.project_no || r.id])
      ),
      employee: Object.fromEntries(
        employees.map((r) => [r.id, `${r.employee_code || ""} ${r.full_name}`.trim()])
      ),
      item: Object.fromEntries(items.map((r) => [r.id, r.name])),
      asset: Object.fromEntries(assets.map((r) => [r.id, `${r.asset_no} — ${r.asset_name}`])),
    }),
    [warehouses, suppliers, projects, employees, items, assets]
  );

  const stats = useMemo(() => {
    const lowStock = items.filter(
      (i) =>
        Number(i.reorder_level || 0) > 0 &&
        Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)
    ).length;

    const stockValue = items.reduce(
      (sum, i) =>
        sum +
        Number(i.quantity_on_hand || 0) *
          Number(i.average_cost || 0),
      0
    );

    const assetValue = assets
      .filter((a) => a.status !== "retired" && a.status !== "lost")
      .reduce((sum, a) => sum + Number(a.purchase_cost || 0), 0);

    const assigned = assets.filter(
      (a) => a.status === "assigned" || a.status === "in_project"
    ).length;

    return {
      items: items.length,
      lowStock,
      stockValue,
      assets: assets.length,
      assetValue,
      assigned,
    };
  }, [items, assets]);

  return (
    <div dir="rtl" className="erp-page">
      <div className="mx-auto max-w-[1500px]">
        <section className="erp-page-header">
          <div>
            <span className="erp-eyebrow">INVENTORY & ASSET CONTROL</span>
            <h1 className="erp-page-title">المخزون والأصول والعُهد</h1>
            <p className="erp-page-subtitle">
              المستودعات والأصناف وحركات المخزون والأصول وتسليمها للموظفين والمشاريع.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="erp-btn-secondary">
            <FaRotate />
            تحديث
          </button>
        </section>

        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric title="الأصناف" value={stats.items} icon={<FaBoxesStacked />} />
          <Metric title="تحت حد الطلب" value={stats.lowStock} icon={<FaArrowDown />} />
          <Metric title="قيمة المخزون" value={money(stats.stockValue)} suffix="SAR" icon={<FaWarehouse />} />
          <Metric title="الأصول" value={stats.assets} icon={<FaLaptop />} />
          <Metric title="قيمة الأصول" value={money(stats.assetValue)} suffix="SAR" icon={<FaBuilding />} />
          <Metric title="عهد / مشاريع" value={stats.assigned} icon={<FaClipboardList />} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["overview", "نظرة عامة"],
            ["warehouse", "المستودعات"],
            ["items", "الأصناف"],
            ["stock", "حركة المخزون"],
            ["assets", "الأصول"],
            ["assignments", "العُهد والتسليم"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "rounded-xl px-4 py-2 text-sm font-black",
                tab === key
                  ? "bg-[#0f2747] text-white"
                  : "border border-slate-200 bg-white text-slate-500",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="erp-card p-6">
              <Title icon={<FaArrowDown />} title="تنبيه إعادة الطلب" />
              <div className="mt-5 space-y-2">
                {items.filter(
                  (i) =>
                    Number(i.reorder_level || 0) > 0 &&
                    Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)
                ).length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    لا توجد أصناف تحت حد إعادة الطلب.
                  </p>
                ) : (
                  items
                    .filter(
                      (i) =>
                        Number(i.reorder_level || 0) > 0 &&
                        Number(i.quantity_on_hand || 0) <= Number(i.reorder_level || 0)
                    )
                    .map((i) => (
                      <div key={i.id} className="flex justify-between rounded-xl border border-red-100 bg-red-50/50 p-3">
                        <span className="font-bold text-slate-700">{i.item_no} — {i.name}</span>
                        <span className="font-black text-red-700">{i.quantity_on_hand} / {i.reorder_level}</span>
                      </div>
                    ))
                )}
              </div>
            </section>

            <section className="erp-card p-6">
              <Title icon={<FaClipboardList />} title="العُهد المفتوحة" />
              <div className="mt-5 space-y-2">
                {assignments.filter((a) => !a.returned_at).slice(0, 10).map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-100 bg-[#fbfcfd] p-3">
                    <p className="font-black text-[#0f2747]">{maps.asset[a.asset_id] || a.asset_id}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.employee_id
                        ? maps.employee[a.employee_id]
                        : maps.project[a.project_id] || "مشروع"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "warehouse" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <form onSubmit={addWarehouse} className="erp-card p-6">
              <Title icon={<FaWarehouse />} title="إضافة مستودع" />
              <div className="mt-5 grid gap-4">
                <Input label="اسم المستودع" value={warehouseForm.name} onChange={(v) => setWarehouseForm((f) => ({ ...f, name: v }))} required />
                <Input label="المدينة" value={warehouseForm.city} onChange={(v) => setWarehouseForm((f) => ({ ...f, city: v }))} />
                <Input label="الموقع" value={warehouseForm.location} onChange={(v) => setWarehouseForm((f) => ({ ...f, location: v }))} />
                <Select label="مسؤول المستودع" value={warehouseForm.manager_employee_id} onChange={(v) => setWarehouseForm((f) => ({ ...f, manager_employee_id: v }))}>
                  <option value="">غير محدد</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </Select>
              </div>
              <button disabled={busy} className="erp-btn-primary mt-5"><FaPlus /> إضافة</button>
            </form>

            <SimpleTable
              title="المستودعات"
              headers={["الرقم","الاسم","المدينة","المسؤول","الحالة"]}
              rows={warehouses.map((w) => [
                w.warehouse_no,
                w.name,
                w.city || "—",
                maps.employee[w.manager_employee_id] || "—",
                w.status,
              ])}
            />
          </div>
        )}

        {tab === "items" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={addItem} className="erp-card p-6">
              <Title icon={<FaBoxesStacked />} title="إضافة صنف" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input label="اسم الصنف" value={itemForm.name} onChange={(v) => setItemForm((f) => ({ ...f, name: v }))} required />
                <Input label="SKU" value={itemForm.sku} onChange={(v) => setItemForm((f) => ({ ...f, sku: v }))} />
                <Input label="التصنيف" value={itemForm.category} onChange={(v) => setItemForm((f) => ({ ...f, category: v }))} />
                <Input label="الوحدة" value={itemForm.unit} onChange={(v) => setItemForm((f) => ({ ...f, unit: v }))} />
                <Select label="المستودع" value={itemForm.warehouse_id} onChange={(v) => setItemForm((f) => ({ ...f, warehouse_id: v }))}>
                  <option value="">غير محدد</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_no} — {w.name}</option>)}
                </Select>
                <Select label="المورد" value={itemForm.supplier_id} onChange={(v) => setItemForm((f) => ({ ...f, supplier_id: v }))}>
                  <option value="">غير محدد</option>
                  {suppliers.filter((s) => s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.supplier_no} — {s.name}</option>)}
                </Select>
                <Input label="حد إعادة الطلب" type="number" value={itemForm.reorder_level} onChange={(v) => setItemForm((f) => ({ ...f, reorder_level: v }))} />
                <Input label="تكلفة ابتدائية" type="number" value={itemForm.average_cost} onChange={(v) => setItemForm((f) => ({ ...f, average_cost: v }))} />
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm font-black text-slate-600">
                <input type="checkbox" checked={itemForm.serial_tracked} onChange={(e) => setItemForm((f) => ({ ...f, serial_tracked: e.target.checked }))} />
                تتبع Serial Number
              </label>
              <button disabled={busy} className="erp-btn-primary mt-5"><FaPlus /> إضافة الصنف</button>
            </form>

            <div className="erp-card overflow-x-auto p-6">
              <Title icon={<FaBoxesStacked />} title="بطاقة الأصناف" />
              <table className="mt-5 w-full min-w-[900px] text-right">
                <thead><tr><th className="p-3">الصنف</th><th className="p-3">SKU</th><th className="p-3">المستودع</th><th className="p-3">الرصيد</th><th className="p-3">حد الطلب</th><th className="p-3">متوسط التكلفة</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="p-3"><p className="font-black text-slate-700">{i.item_no} — {i.name}</p><p className="mt-1 text-xs text-slate-400">{i.category || "—"}</p></td>
                      <td className="p-3">{i.sku || "—"}</td>
                      <td className="p-3">{maps.wh[i.warehouse_id] || "—"}</td>
                      <td className="p-3 font-black">{i.quantity_on_hand} {i.unit}</td>
                      <td className="p-3">{i.reorder_level}</td>
                      <td dir="ltr" className="p-3 text-right">{money(i.average_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "stock" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={moveStock} className="erp-card p-6">
              <Title icon={<FaArrowUp />} title="حركة مخزون" />
              <div className="mt-5 grid gap-4">
                <Select label="الصنف" value={moveForm.item_id} onChange={(v) => setMoveForm((f) => ({ ...f, item_id: v }))}>
                  <option value="">اختر الصنف</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.item_no} — {i.name}</option>)}
                </Select>
                <Select label="نوع الحركة" value={moveForm.transaction_type} onChange={(v) => setMoveForm((f) => ({ ...f, transaction_type: v }))}>
                  <option value="receipt">استلام</option>
                  <option value="issue">صرف</option>
                  <option value="adjustment_in">تسوية زيادة</option>
                  <option value="adjustment_out">تسوية نقص</option>
                </Select>
                <Input label="الكمية" type="number" value={moveForm.quantity} onChange={(v) => setMoveForm((f) => ({ ...f, quantity: v }))} required />
                <Input label="تكلفة الوحدة" type="number" value={moveForm.unit_cost} onChange={(v) => setMoveForm((f) => ({ ...f, unit_cost: v }))} />
                <Select label="المشروع" value={moveForm.project_id} onChange={(v) => setMoveForm((f) => ({ ...f, project_id: v }))}>
                  <option value="">بدون مشروع</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_no || ""} — {p.project_name || ""}</option>)}
                </Select>
                <Select label="أمر الشراء" value={moveForm.purchase_order_id} onChange={(v) => setMoveForm((f) => ({ ...f, purchase_order_id: v }))}>
                  <option value="">بدون PO</option>
                  {pos.map((p) => <option key={p.id} value={p.id}>{p.po_no} — {p.vendor_name}</option>)}
                </Select>
                <Input label="المرجع" value={moveForm.reference_no} onChange={(v) => setMoveForm((f) => ({ ...f, reference_no: v }))} />
              </div>
              <button disabled={busy} className="erp-btn-primary mt-5">تسجيل الحركة</button>
            </form>

            <div className="erp-card overflow-x-auto p-6">
              <Title icon={<FaClipboardList />} title="آخر حركات المخزون" />
              <table className="mt-5 w-full min-w-[850px] text-right">
                <thead><tr><th className="p-3">الحركة</th><th className="p-3">الصنف</th><th className="p-3">النوع</th><th className="p-3">الكمية</th><th className="p-3">المشروع</th><th className="p-3">التاريخ</th></tr></thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="p-3 font-black text-[#345a82]">{t.transaction_no}</td>
                      <td className="p-3">{maps.item[t.item_id] || t.item_id}</td>
                      <td className="p-3">{t.transaction_type}</td>
                      <td className="p-3 font-black">{t.quantity}</td>
                      <td className="p-3">{maps.project[t.project_id] || "—"}</td>
                      <td className="p-3">{new Date(t.created_at).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "assets" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={addAsset} className="erp-card p-6">
              <Title icon={<FaLaptop />} title="تسجيل أصل" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Input label="اسم الأصل" value={assetForm.asset_name} onChange={(v) => setAssetForm((f) => ({ ...f, asset_name: v }))} required />
                <Input label="التصنيف" value={assetForm.category} onChange={(v) => setAssetForm((f) => ({ ...f, category: v }))} />
                <Input label="Serial Number" value={assetForm.serial_number} onChange={(v) => setAssetForm((f) => ({ ...f, serial_number: v }))} />
                <Input label="الشركة المصنعة" value={assetForm.manufacturer} onChange={(v) => setAssetForm((f) => ({ ...f, manufacturer: v }))} />
                <Input label="الموديل" value={assetForm.model} onChange={(v) => setAssetForm((f) => ({ ...f, model: v }))} />
                <Input label="تكلفة الشراء" type="number" value={assetForm.purchase_cost} onChange={(v) => setAssetForm((f) => ({ ...f, purchase_cost: v }))} />
                <Input label="تاريخ الشراء" type="date" value={assetForm.purchase_date} onChange={(v) => setAssetForm((f) => ({ ...f, purchase_date: v }))} />
                <Input label="نهاية الضمان" type="date" value={assetForm.warranty_end_date} onChange={(v) => setAssetForm((f) => ({ ...f, warranty_end_date: v }))} />
                <Select label="المورد" value={assetForm.supplier_id} onChange={(v) => setAssetForm((f) => ({ ...f, supplier_id: v }))}>
                  <option value="">غير محدد</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_no} — {s.name}</option>)}
                </Select>
                <Select label="أمر الشراء" value={assetForm.purchase_order_id} onChange={(v) => setAssetForm((f) => ({ ...f, purchase_order_id: v }))}>
                  <option value="">بدون PO</option>
                  {pos.map((p) => <option key={p.id} value={p.id}>{p.po_no} — {p.vendor_name}</option>)}
                </Select>
                <Select label="المستودع" value={assetForm.warehouse_id} onChange={(v) => setAssetForm((f) => ({ ...f, warehouse_id: v }))}>
                  <option value="">غير محدد</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_no} — {w.name}</option>)}
                </Select>
              </div>
              <button disabled={busy} className="erp-btn-primary mt-5"><FaPlus /> تسجيل الأصل</button>
            </form>

            <div className="erp-card overflow-x-auto p-6">
              <Title icon={<FaLaptop />} title="سجل الأصول" />
              <table className="mt-5 w-full min-w-[950px] text-right">
                <thead><tr><th className="p-3">الأصل</th><th className="p-3">Serial</th><th className="p-3">القيمة</th><th className="p-3">الحالة</th><th className="p-3">المستودع</th><th className="p-3">الإجراء</th></tr></thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3"><p className="font-black text-slate-700">{a.asset_no} — {a.asset_name}</p><p className="mt-1 text-xs text-slate-400">{a.manufacturer || ""} {a.model || ""}</p></td>
                      <td className="p-3">{a.serial_number || "—"}</td>
                      <td dir="ltr" className="p-3 text-right">{money(a.purchase_cost)}</td>
                      <td className="p-3">{a.status}</td>
                      <td className="p-3">{maps.wh[a.warehouse_id] || "—"}</td>
                      <td className="p-3">
                        {a.status === "available" ? (
                          <button type="button" disabled={busy} onClick={() => assignAsset(a)} className="rounded-lg bg-[#0f2747] px-3 py-2 text-xs font-black text-white">تسليم</button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">مسند</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "assignments" && (
          <section className="erp-card mt-6 overflow-x-auto p-6">
            <Title icon={<FaClipboardList />} title="سجل العُهد والتسليم" />
            <table className="mt-5 w-full min-w-[1000px] text-right">
              <thead><tr><th className="p-3">الأصل</th><th className="p-3">الموظف / المشروع</th><th className="p-3">تاريخ التسليم</th><th className="p-3">الحالة عند التسليم</th><th className="p-3">تاريخ الإعادة</th><th className="p-3">الإجراء</th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="p-3 font-black text-[#0f2747]">{maps.asset[a.asset_id] || a.asset_id}</td>
                    <td className="p-3">{a.employee_id ? maps.employee[a.employee_id] : maps.project[a.project_id] || "مشروع"}</td>
                    <td className="p-3">{new Date(a.assigned_at).toLocaleString("ar-SA")}</td>
                    <td className="p-3">{a.condition_out || "—"}</td>
                    <td className="p-3">{a.returned_at ? new Date(a.returned_at).toLocaleString("ar-SA") : "—"}</td>
                    <td className="p-3">
                      {!a.returned_at ? (
                        <button type="button" disabled={busy} onClick={() => returnAssignment(a)} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700"><FaCircleCheck className="ml-1 inline" /> إعادة</button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">مغلق</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value, suffix, icon }) {
  return (
    <article className="erp-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{title}</p>
          <p dir="ltr" className="mt-2 text-right text-2xl font-black text-[#0f2747]">{value}</p>
          {suffix && <p className="mt-1 text-[10px] font-black text-slate-300">{suffix}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{icon}</div>
      </div>
    </article>
  );
}

function Title({ icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f6fa] text-[#345a82]">{icon}</div>
      <h2 className="text-lg font-black text-[#0f2747]">{title}</h2>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none" />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none">
        {children}
      </select>
    </label>
  );
}

function SimpleTable({ title, headers, rows }) {
  return (
    <section className="erp-card overflow-x-auto p-6">
      <Title icon={<FaClipboardList />} title={title} />
      <table className="mt-5 w-full min-w-[750px] text-right">
        <thead><tr>{headers.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              {row.map((cell, i) => <td key={i} className="p-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
