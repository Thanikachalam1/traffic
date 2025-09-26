// src/components/HeatRoad.jsx
import React from "react";
import { s } from "../styles";

/**
 * HeatRoad - visual heat overlay for four approaches.
 * Props: counts, maxCapacity, laneKeys
 */
export default function HeatRoad({ counts = {}, maxCapacity = 12, laneKeys = ["lane1", "lane2", "lane3", "lane4"] }) {
  const pct = {};
  laneKeys.forEach((k) => {
    pct[k] = Math.max(0, Math.min(1, (counts[k] || 0) / Math.max(1, maxCapacity)));
  });

  function heatColor(p) {
    const t = Math.max(0, Math.min(1, p));
    if (t <= 0.5) {
      const u = t / 0.5;
      return lerpColor("#2ecc71", "#f1c40f", u);
    } else {
      const u = (t - 0.5) / 0.5;
      return lerpColor("#f1c40f", "#e74c3c", u);
    }
  }
  function lerpColor(a, b, t) {
    const pa = hexToRgb(a);
    const pb = hexToRgb(b);
    const r = Math.round(pa.r + (pb.r - pa.r) * t);
    const g = Math.round(pa.g + (pb.g - pa.g) * t);
    const bl = Math.round(pa.b + (pb.b - pa.b) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16) };
  }

  const containerW = 420, containerH = 420, roadW = 120, crossSize = 140;
  function overlayStyle(color, intensity) {
    return {
      position: "absolute",
      background: color,
      opacity: 0.6 * intensity + 0.08,
      borderRadius: 8,
      filter: `blur(${Math.max(6, intensity * 16)}px)`,
      pointerEvents: "none",
    };
  }

  function pctFor(k) {
    return Math.max(0, Math.min(1, (counts[k] || 0) / Math.max(1, maxCapacity)));
  }

  return (
    <div style={{ width: containerW, borderRadius: 12, border: "1px solid rgba(0,0,0,0.04)", padding: 12, background: "#fff" }}>
      <div style={{ position: "relative", width: containerW, height: containerH, background: "#e9eef6", borderRadius: 8 }}>
        <div style={{ position: "absolute", left: 0, top: containerH/2 - roadW/2, width: containerW, height: roadW, background: "#2b2f36" }}>
          <div style={{ position: "absolute", left: containerW/2 - crossSize/2 - 40, top: "50%", transform: "translateY(-50%)", width: 8, height: 60, background: "linear-gradient(180deg,#fff,#fff)", opacity: 0.85 }} />
        </div>

        <div style={{ position: "absolute", left: containerW/2 - roadW/2, top: 0, width: roadW, height: containerH, background: "#2b2f36" }} />

        <div style={{ position: "absolute", left: containerW/2 - crossSize/2, top: containerH/2 - crossSize/2, width: crossSize, height: crossSize, background: "#cfe0ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
          Junction
        </div>

        <div style={{ ...overlayStyle(heatColor(pctFor("lane1")), pctFor("lane1")), left: containerW/2 - roadW/2 + 8, top: 12, width: roadW - 16, height: containerH/2 - crossSize/2 - 24 }} />
        <div style={{ ...overlayStyle(heatColor(pctFor("lane3")), pctFor("lane3")), left: containerW/2 - roadW/2 + 8, top: containerH/2 + crossSize/2 + 12, width: roadW - 16, height: containerH/2 - crossSize/2 - 24 }} />
        <div style={{ ...overlayStyle(heatColor(pctFor("lane4")), pctFor("lane4")), left: 12, top: containerH/2 - roadW/2 + 8, width: containerW/2 - crossSize/2 - 24, height: roadW - 16 }} />
        <div style={{ ...overlayStyle(heatColor(pctFor("lane2")), pctFor("lane2")), left: containerW/2 + crossSize/2 + 12, top: containerH/2 - roadW/2 + 8, width: containerW/2 - crossSize/2 - 24, height: roadW - 16 }} />

        <div style={{ position: "absolute", left: containerW/2 - 30, top: 8, color: "#fff", fontWeight: 800 }}>{Math.round(pct.lane1 * 100)}%</div>
        <div style={{ position: "absolute", left: containerW - 40, top: containerH/2 - 10, color: "#fff", fontWeight: 800 }}>{Math.round(pct.lane2 * 100)}%</div>
        <div style={{ position: "absolute", left: containerW/2 - 30, top: containerH - 28, color: "#fff", fontWeight: 800 }}>{Math.round(pct.lane3 * 100)}%</div>
        <div style={{ position: "absolute", left: 8, top: containerH/2 - 10, color: "#fff", fontWeight: 800 }}>{Math.round(pct.lane4 * 100)}%</div>
      </div>
    </div>
  );
}
