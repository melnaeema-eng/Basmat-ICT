export default function PlaceholderPage({
  title,
  subtitle,
}) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "70vh",
        padding: "80px 20px",
        textAlign: "center",
        background: "#ffffff",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: "900",
          color: "#071d49",
        }}
      >
        {title}
      </h1>

      <p
        style={{
          marginTop: "20px",
          fontSize: "20px",
          color: "#64748b",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}