import {
  FaArrowLeft,
  FaBuilding,
  FaServer,
  FaTowerBroadcast,
} from "react-icons/fa6";

const projects = [
  {
    title: "البنية التحتية للاتصالات",
    subtitle: "Telecom Infrastructure",
    icon: FaTowerBroadcast,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop",
  },
  {
    title: "مراكز البيانات",
    subtitle: "Mission-Critical Data Centers",
    icon: FaServer,
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop",
  },
  {
    title: "المشاريع الهندسية",
    subtitle: "Engineering & ELV",
    icon: FaBuilding,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="bg-white py-20 md:py-24">
      <div className="company-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="text-xs font-black tracking-[0.18em] text-[#e96f20]">SELECTED PROJECTS</span>
            <h2 className="mt-4 text-3xl font-black text-[#0f2747] md:text-4xl">خبرة ميدانية في المشاريع التقنية.</h2>
          </div>
          <a href="#contact" className="inline-flex items-center gap-2 text-sm font-black text-[#345a82]">
            ناقش مشروعك معنا <FaArrowLeft />
          </a>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {projects.map((project) => {
            const Icon = project.icon;
            return (
              <article key={project.title} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-72 w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071d49]/65 via-transparent to-transparent" />
                  <div className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/90 text-lg text-[#0f2747] backdrop-blur">
                    <Icon />
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{project.subtitle}</p>
                  <h3 className="mt-2 text-xl font-black text-[#0f2747]">{project.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    تخطيط وتنفيذ واختبار وتسليم وفق منهج هندسي يركز على الجودة والاعتمادية والتوثيق.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
