// src/components/IntersectionCanvas.jsx
import React from "react";
import { CountdownRing, SmallArrow } from "./CountdownRing";
import { s } from "../styles";

/**
 * Small, pure visual component that renders the four approach signals.
 * Props:
 * - counts, pedCounts, laneData, activePhase, phaseSecondsLeft, phaseDuration
 */
export default function IntersectionCanvas({ counts = {}, pedCounts = {}, laneData = {}, activePhase = null, phaseSecondsLeft = 0, phaseDuration = 0 }) {
  const laneKeys = ["lane1", "lane2", "lane3", "lane4"];
  const positions = {
    lane1: { x: 210, y: 120, rot: 0, label: "N" },
    lane2: { x: 290, y: 300, rot: 90, label: "E" },
    lane3: { x: 110, y: 360, rot: 180, label: "S" },
    lane4: { x: 40, y: 200, rot: 270, label: "W" },
  };

  function isLaneActive(lk) {
    if (!activePhase) return false;
    if (activePhase.type === "direction") return activePhase.lanes.includes(lk);
    if (activePhase.type === "ped") return activePhase.pedLane === lk;
    return false;
  }

  function renderSignalForLane(lk) {
    const ld = laneData[lk] || { vehicleSignal: "red", pedSignal: "wait", vehicles: counts[lk] || 0, ped: pedCounts[lk] || 0 };
    const movement = laneData._movement || (activePhase && activePhase.movement) || "straight_left";
    const showGreen = ld.vehicleSignal === "green";
    const leftOn = showGreen && (movement === "straight_left" || movement === "left");
    const straightOn = showGreen && (movement === "straight_left" || movement === "straight");
    const rightOn = showGreen && movement === "right";
    const active = isLaneActive(lk);

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={s.signalSmall}>
          <div style={s.signalArrowsRow}>
            <div style={s.slot}><SmallArrow lit={leftOn} dir="left" /></div>
            <div style={s.slot}><SmallArrow lit={straightOn} dir="straight" /></div>
            <div style={s.slot}><SmallArrow lit={rightOn} dir="right" /></div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#fff", fontWeight: 700, textAlign: "center" }}>{ld.vehicleSignal === "green" ? "GO" : ld.vehicleSignal === "yellow" ? "WAIT" : "STOP"}</div>
        </div>

        <div style={{ minWidth: 56, textAlign: "center" }}>
          {active ? <CountdownRing secondsLeft={phaseSecondsLeft} totalSeconds={phaseDuration} size={56} /> : <div style={s.idleSmall}>{ld.vehicles}V</div>}
          <div style={{ marginTop: 6, fontSize: 12 }}>{ld.ped} peds</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.panelHeader}>
        <div>
          <h3 style={{ margin: 0 }}>Intersection view</h3>
          <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{activePhase?.key ?? "—"} • {phaseSecondsLeft}s</div>
        </div>
      </div>

      <div style={s.canvas}>
        <div style={s.centerBox}>Intersection</div>

        {laneKeys.map((lk) => {
          const pos = positions[lk];
          return (
            <div key={lk} style={{ position: "absolute", left: pos.x - 72, top: pos.y - 72, transform: `rotate(${pos.rot}deg)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {renderSignalForLane(lk)}
                <div style={{ fontSize: 12, fontWeight: 700, width: 28 }}>{pos.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
