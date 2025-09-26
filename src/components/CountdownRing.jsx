// src/components/CountdownRing.jsx
import React from "react";

/* Small arrow icon & countdown ring used by IntersectionCanvas */
export function SmallArrow({ lit = false, dir = "straight" }) {
  const activeColor = "#88ffb2";
  const offColor = "#111317";
  const glow = lit ? { filter: "drop-shadow(0 0 8px rgba(136,255,178,0.55))" } : {};
  const size = 16;

  if (dir === "straight") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={glow}>
        <path fill={lit ? activeColor : offColor} d="M12 2 L19 12 H15 V22 H9 V12 H5 L12 2 Z" />
      </svg>
    );
  }
  if (dir === "left") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={glow}>
        <path fill={lit ? activeColor : offColor} d="M4 12 L14 4 V9 H20 V15 H14 V20 Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={glow}>
      <path fill={lit ? activeColor : offColor} d="M20 12 L10 20 V15 H4 V9 H10 V4 Z" />
    </svg>
  );
}

export function CountdownRing({ secondsLeft = 0, totalSeconds = 1, size = 56 }) {
  const total = Math.max(1, Math.round(totalSeconds || 1));
  const left = Math.max(0, Math.round(secondsLeft));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, left / total));
  const dash = c * pct;
  const dashOffset = c - dash;

  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gradRing2" x1="0" x2="1">
            <stop offset="0%" stopColor="black" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
        </defs>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle r={r} fill="none" stroke="#111" strokeWidth="4" opacity="0.08" />
          <circle r={r} fill="none" stroke="url(#gradRing2)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={dashOffset} transform="rotate(-90)" style={{ transition: "stroke-dashoffset 0.45s linear" }} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "black", fontWeight: 800, fontSize: Math.round(size / 3.6), textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{left}</div>
    </div>
  );
}
