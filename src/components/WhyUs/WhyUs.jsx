import {
  FaAward,
  FaCertificate,
  FaClock,
  FaUsers,
} from "react-icons/fa6";

const items = [
  {
    icon: <FaAward />,
    title: "جودة عالمية",
    desc: "تنفيذ المشاريع وفق أفضل الممارسات والمعايير الدولية."
  },
  {
    icon: <FaUsers />,
    title: "فريق متخصص",
    desc: "مهندسون واستشاريون ذوو خبرة في مشاريع الاتصالات وتقنية المعلومات."
  },
  {
    icon: <FaCertificate />,
    title: "حلول متكاملة",
    desc: "من مرحلة التصميم وحتى التشغيل والدعم الفني."
  },
  {
    icon: <FaClock />,
    title: "التزام بالمواعيد",
    desc: "إدارة احترافية للمشاريع مع الالتزام بالوقت والجودة."
  },
];

export default function WhyUs() {
  return (
    <section className="py-24 bg-[#071d49] text-white">

      <div className="company-container">

        <div className="text-center">

          <span className="text-blue-300 font-bold">
            WHY BASMAT ICT
          </span>

          <h2 className="mt-4 text-4xl font-black">
            لماذا تختار Basmat ICT؟
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-blue-100 leading-8">
            نعمل مع الجهات الحكومية والقطاع الخاص لتقديم حلول
            مبتكرة ومستدامة في البنية التحتية الرقمية.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {items.map((item) => (

            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur hover:bg-white/10 transition"
            >

              <div className="text-5xl text-blue-300">
                {item.icon}
              </div>

              <h3 className="mt-6 text-2xl font-bold">
                {item.title}
              </h3>

              <p className="mt-4 leading-8 text-blue-100">
                {item.desc}
              </p>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}