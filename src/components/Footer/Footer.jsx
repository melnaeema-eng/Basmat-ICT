import {
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaLocationDot,
  FaPhone,
  FaXTwitter,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="bg-[#071d49] text-white">

      <div className="company-container grid gap-14 py-20 md:grid-cols-2 lg:grid-cols-4">

        <div>

          <img
            src="/logo.png"
            alt="Basmat ICT"
            className="h-20"
          />

          <p className="mt-6 leading-8 text-slate-300">
            بصمة النوابغ للمقاولات والاستشارات هي شركة سعودية
            متخصصة في حلول تقنية المعلومات والاتصالات والبنية
            التحتية الرقمية ومراكز البيانات والأمن السيبراني.
          </p>

        </div>

        <div>

          <h3 className="text-xl font-black">
            خدماتنا
          </h3>

          <ul className="mt-6 space-y-3 text-slate-300">

            <li>ICT Infrastructure</li>

            <li>Enterprise Networking</li>

            <li>Cyber Security</li>

            <li>Data Centers</li>

            <li>Cloud Solutions</li>

            <li>Engineering Consultancy</li>

          </ul>

        </div>

        <div>

          <h3 className="text-xl font-black">
            روابط سريعة
          </h3>

          <ul className="mt-6 space-y-3 text-slate-300">

            <li>
              <a href="#home">الرئيسية</a>
            </li>

            <li>
              <a href="#about">من نحن</a>
            </li>

            <li>
              <a href="#services">الخدمات</a>
            </li>

            <li>
              <a href="#projects">المشاريع</a>
            </li>

            <li>
              <a href="#contact">اتصل بنا</a>
            </li>

          </ul>

        </div>

        <div>

          <h3 className="text-xl font-black">
            تواصل معنا
          </h3>

          <div className="mt-6 space-y-4 text-slate-300">

            <p className="flex gap-3">
              <FaPhone />
              +966 xx xxx xxxx
            </p>

            <p className="flex gap-3">
              <FaEnvelope />
              info@basmat-alnawabig.com.sa
            </p>

            <p className="flex gap-3">
              <FaLocationDot />
              الرياض - المملكة العربية السعودية
            </p>

          </div>

          <div className="mt-8 flex gap-4 text-2xl">

            <FaLinkedin className="cursor-pointer hover:text-blue-400 transition" />

            <FaFacebook className="cursor-pointer hover:text-blue-400 transition" />

            <FaInstagram className="cursor-pointer hover:text-blue-400 transition" />

            <FaXTwitter className="cursor-pointer hover:text-blue-400 transition" />

          </div>

        </div>

      </div>

      <div className="border-t border-white/10 py-6 text-center text-sm text-slate-400">

        © {new Date().getFullYear()} Basmat ICT. All Rights Reserved.

      </div>

    </footer>
  );
}