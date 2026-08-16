import {
  FaEnvelope,
  FaLinkedin,
  FaLocationDot,
  FaPhone,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc] text-slate-600">
      <div className="company-container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Basmat ICT" className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-1" />
            <div>
              <p className="font-black text-[#0f2747]">بصمة النوابغ</p>
              <p className="text-[10px] font-black tracking-wider text-slate-400">BASMAT ALNAWABIGH ICT</p>
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
            حلول الاتصالات وتقنية المعلومات والبنية التحتية الرقمية ومراكز البيانات
            والشبكات والأنظمة الذكية والاستشارات الهندسية.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black text-[#0f2747]">خدمات رئيسية</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>ICT Infrastructure</li>
            <li>Data Centers</li>
            <li>Enterprise Networks</li>
            <li>ELV & Smart Systems</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black text-[#0f2747]">روابط</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="#about" className="hover:text-[#0f2747]">عن الشركة</a></li>
            <li><a href="#services" className="hover:text-[#0f2747]">الخدمات</a></li>
            <li><a href="#projects" className="hover:text-[#0f2747]">المشاريع</a></li>
            <li><a href="#technology" className="hover:text-[#0f2747]">التقنيات</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-black text-[#0f2747]">التواصل</h3>
          <div className="mt-4 space-y-3 text-sm">
            <p className="flex items-center gap-3"><FaPhone className="text-slate-400" /><a href="tel:+966550073576" dir="ltr">+966 55 007 3576</a></p>
            <p className="flex items-center gap-3"><FaEnvelope className="text-slate-400" />info@basmat-alnawabig.com.sa</p>
            <p className="flex items-center gap-3"><FaLocationDot className="text-slate-400" />الرياض، المملكة العربية السعودية</p>
            <a href="#" className="inline-flex items-center gap-2 font-black text-[#345a82]"><FaLinkedin /> LinkedIn</a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Basmat ICT. All Rights Reserved.
      </div>
    </footer>
  );
}
