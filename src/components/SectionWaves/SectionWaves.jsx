export default function SectionWaves({
  position = "bottom",
  color = "#ffffff",
  secondaryColor = "rgba(59, 130, 246, 0.22)",
  height = "h-36",
  flip = false,
}) {
  const positionClasses =
    position === "top"
      ? "top-0 -translate-y-[99%]"
      : "bottom-0 translate-y-[1px]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 right-0 z-20 overflow-hidden ${height} ${positionClasses}`}
    >
      <svg
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        className={`h-full w-full ${
          flip ? "rotate-180" : ""
        }`}
      >
        <path
          fill={secondaryColor}
          d="M0,82 C220,150 450,35 715,88 C970,140 1200,55 1440,103 L1440,180 L0,180 Z"
        />

        <path
          fill="rgba(255,255,255,0.35)"
          d="M0,108 C245,58 490,160 755,104 C1010,50 1230,142 1440,80 L1440,180 L0,180 Z"
        />

        <path
          fill={color}
          d="M0,128 C250,182 500,86 760,125 C1015,164 1240,78 1440,118 L1440,180 L0,180 Z"
        />
      </svg>
    </div>
  );
}