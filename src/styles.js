// src/styles.js
export const s = {
  page: { padding: 18, fontFamily: '"Inter", system-ui, Arial', background: "#f6f8fb", minHeight: "100vh", color: "#122" },
  header: { marginBottom: 10 },
  title: { margin: 0, fontSize: 20 },
  subtitle: { color: "#556", marginTop: 6 },

  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 18, alignItems: "start" },

  controls: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 8px 28px rgba(16,40,110,0.04)" },
  controlRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  laneLabel: { width: 60, fontWeight: 800, color: "#213" },
  numInput: { flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #e6eef6", outline: "none", fontSize: 13, background: "#fbfdff" },
  hr: { margin: "12px 0", border: "none", height: 1, background: "#f0f3f7" },
  labelInline: { display: "flex", flexDirection: "column", gap: 6 },
  labelText: { fontSize: 12, color: "#334" },
  smallInput: { width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #e6eef6", fontSize: 13, background: "#fbfdff" },

  btn: { padding: "8px 12px", borderRadius: 10, border: "none", background: "#f0f3f7", cursor: "pointer", fontWeight: 800 },

  main: { minWidth: 720 },
  topRow: { display: "flex", gap: 18 },

  canvasContainer: { flex: 1 },
  heatContainer: { width: 460 },

  panel: { background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 8px 30px rgba(16,40,110,0.04)" },
  panelHeader: { display: "flex", justifyContent: "space-between", marginBottom: 12 },

  canvas: { position: "relative", width: 420, height: 420, borderRadius: 12, background: "linear-gradient(180deg,#f7fbff,#eef6ff)", margin: "0 auto", border: "1px solid rgba(16,40,110,0.03)" },
  centerBox: { position: "absolute", left: 150, top: 150, width: 120, height: 120, background: "#cfe0ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#123", fontWeight: 800 },

  signalSmall: { width: 120, padding: 10, borderRadius: 12, background: "linear-gradient(180deg,#0e1720,#131a22)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" },
  signalArrowsRow: { display: "flex", gap: 8, justifyContent: "center", alignItems: "center" },
  slot: { width: 36, height: 36, borderRadius: 8, background: "#05060a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.5)" },

  idleSmall: { width: 56, height: 36, borderRadius: 8, background: "#f6f8fb", display: "flex", alignItems: "center", justifyContent: "center", color: "#334", fontWeight: 800 },

  statCard: { background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 6px 16px rgba(18,24,38,0.04)" },

  heatLegendBar: { height: 10, width: 160, borderRadius: 8, background: "linear-gradient(90deg,#2ecc71,#f1c40f,#e74c3c)" },

  canvasLarge: { position: "relative", width: 520, height: 520, borderRadius: 12, background: "linear-gradient(180deg,#f7fbff,#eef6ff)", margin: "0 auto", border: "1px solid rgba(16,40,110,0.03)" },
  centerBoxLarge: { position: "absolute", left: 190, top: 190, width: 140, height: 140, background: "#cfe0ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#123", fontWeight: 800 },

  signalHousingCompact: { width: 120, padding: 10, borderRadius: 12, background: "linear-gradient(180deg,#0e1720,#131a22)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 8px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)" },
  filterSlotCompact: { width: 40, height: 40, borderRadius: 8, background: "#05060a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.5)" },
};

export default s;
