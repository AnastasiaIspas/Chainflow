export const S = {
  page: {
    minHeight: "100vh",
    width: "100%",
    overflowX: "hidden",
    background:
      "radial-gradient(1200px 600px at 10% 10%, rgba(124,58,237,0.35), transparent 60%)," +
      "radial-gradient(1000px 600px at 90% 20%, rgba(59,130,246,0.28), transparent 60%)," +
      "radial-gradient(900px 500px at 50% 95%, rgba(236,72,153,0.18), transparent 60%)," +
      "linear-gradient(180deg, #0B0D1A 0%, #090A14 100%)",
    color: "#EAEAF2",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    padding: 20,
  },
  container: {
    maxWidth: 1150,
    margin: "0 auto",
    position: "relative",
    padding: "0 12px",
  },
  glowGrid: {
    position: "absolute",
    inset: -30,
    pointerEvents: "none",
    backgroundImage: 
      "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    maskImage: 
      "radial-gradient(closest-side at 50% 25%, rgba(0,0,0,1), rgba(0,0,0,0))",
    opacity: 0.55,
    filter: "blur(0.2px)",
  },
  hero: {
    display: "grid",
    gap: 14,
    padding: 22,
    borderRadius: 18,
    border: "1px solid rgba(255, 255, 255, 0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    position: "relative",
    overflow: "hidden",
  },
  heroFree: {
    paddingTop: 34,
    paddingBottom: 22,
    textAlign: "center",
    display: "grid",
    gap: 14,
    justifyItems: "center",
  },
  titleWrap: {
    display: "grid",
    gap: 10,
    justifyItems: "center",
    textAlign: "center",
  },
  title: {
    fontSize: 52,
    fontWeight: 900,
    letterSpacing: -0.8,
    margin: 0,
    lineHeight: 1.02,
    color: "transparent",
    backgroundImage:
      "linear-gradient(90deg, rgba(168,85,247,1), rgba(59,130,246,1), rgba(236,72,153,1), rgba(168,85,247,1))",
    backgroundSize: "220% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    animation: "cf_titleIn 700ms cubic-bezier(.22,.61,.36,1) both, cf_shimmer 6s linear infinite",
  },
  subtitle: {
    margin: 0,
    opacity: 0.85,
    maxwidth: 720,
    lineHeight: 1.5,
  },
  row: { 
    display: "flex", 
    gap: 10, 
    flexWrap: "wrap", 
    alignItems: "center", 
    justifyContent: "center"
  },
  btnPrimary: {
    border: "0",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    color: "white",
    background: 
      "linear-gradient(90deg, rgba(124,58,237,1), rgba(59,130,246,1))",
    boxShadow: "0 10px 24px rgba(59, 130, 246, 0.25)",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  btnSecondary: {
    border: "1px solid rgba(255,255,255,0.14)",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    color: "#EAEAF2",
    background: "rgba(255,255,255,0.04)",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  btnDisabled: {
    opacity: 0.45, 
    cursor: "not-allowed"
  },
  status: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
  },
  grid: {
    display: "grid", 
    gap: 12, 
    marginTop: 14
  },
  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
    boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    inset: -2,
    background:
      "radial-gradient(400px 200px at 10% 10%, rgba(124,58,237,0.25), transparent 60%)," +
      "radial-gradient(350px 200px at 90% 30%, rgba(59,130,246,0.22), transparent 60%)",
    pointerEvents: "none",
    opacity: 0.9,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    position: "relative",
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 800, 
    marginBottom: 6 
  },
  mono: { 
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas" 
  },
  label: { 
    fontSize: 12, 
    opacity: 0.75, 
    marginBottom: 6 
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#EAEAF2",
    outline: "none",
  },
  formGrid: { 
    display: "grid", 
    gap: 10, 
    maxWidth: 520 
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
  },
  hint: { 
    fontSize: 12, 
    opacity: 0.75, 
    marginTop: 8 
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
  },
};
