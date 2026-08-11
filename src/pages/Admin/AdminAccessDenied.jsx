import { Link } from "react-router-dom";
import { FaBan, FaHouse } from "react-icons/fa6";

export default function AdminAccessDenied() {
  return (
    <div dir="rtl" className="px-4 py-14 md:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <FaBan className="mx-auto text-5xl text-red-500" />
        <h1 className="mt-5 text-3xl font-black text-[#071d49]">غير مصرح بالدخول</h1>
        <p className="mt-3 leading-7 text-slate-600">
          حسابك لا يملك الصلاحية المطلوبة لفتح هذه الصفحة. إذا كنت تحتاج الوصول، راجع مسؤول النظام.
        </p>
        <Link
          to="/admin"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#123878] px-6 py-3 font-black text-white"
        >
          <FaHouse /> العودة إلى لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
