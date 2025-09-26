// src/components/HeatLegend.jsx
import React from "react";

export default function HeatLegend() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ height: 12, width: 160, borderRadius: 8, background: "linear-gradient(90deg,#2ecc71,#f1c40f,#e74c3c)", boxShadow: "0 6px 12px rgba(0,0,0,0.06)" }} />
      <div style={{ color: "#334" }}>
        <strong>Low</strong> · <span style={{ opacity: 0.9 }}>Med</span> · <span style={{ color: "#b02" }}>High</span>
      </div>
    </div>
  );
}
