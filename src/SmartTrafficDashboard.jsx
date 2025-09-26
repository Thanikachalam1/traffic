// src/SmartTrafficDashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import IntersectionCanvas from "./components/IntersectionCanvas";
import HeatRoad from "./components/HeatRoad";
import HeatLegend from "./components/HeatLegend";
import { s } from "./styles";

export default function SmartTrafficDashboard() {
  const [rightShare, setRightShare] = useState(0.28);
  const [counts, setCounts] = useState({});
  const [pedCounts, setPedCounts] = useState({});
  const [laneData, setLaneData] = useState({});
  const [cycleTime, setCycleTime] = useState(40);
  const [minGreen, setMinGreen] = useState(6);
  const [allRed, setAllRed] = useState(2);
  const [maxCapacity, setMaxCapacity] = useState(12);
  const [running, setRunning] = useState(false);
  const [phases, setPhases] = useState([]);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);

  const timerRef = useRef(null);
  const currentIdxRef = useRef(0);
  const laneKeys = ["lane1", "lane2", "lane3", "lane4"];

  // upload state
  const [fileN, setFileN] = useState(null);
  const [fileE, setFileE] = useState(null);
  const [fileS, setFileS] = useState(null);
  const [fileW, setFileW] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const previewImgRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewImgRef.current) URL.revokeObjectURL(previewImgRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewImgRef.current) {
        URL.revokeObjectURL(previewImgRef.current);
        previewImgRef.current = null;
      }
    };
  }, [previewUrl]);

  /* ---------- phase simulation helpers (copied from your file) ---------- */
  function computePhasesFromCounts() {
    const input = laneKeys.reduce((acc, k) => ((acc[k] = counts[k] || 0), acc), {});
    const pedInput = laneKeys.reduce((acc, k) => ((acc[k] = pedCounts[k] || 0), acc), {});

    const ns = (input.lane1 || 0) + (input.lane3 || 0);
    const ew = (input.lane2 || 0) + (input.lane4 || 0);
    const total = Math.max(1, ns + ew);
    const numAllReds = 4;
    const effectiveCycle = Math.max(10, cycleTime - numAllReds * allRed);

    let nsTotalTime = Math.max(minGreen, Math.round((ns / total) * effectiveCycle));
    let ewTotalTime = Math.max(minGreen, effectiveCycle - nsTotalTime);

    if (nsTotalTime + ewTotalTime > effectiveCycle) {
      const scale = effectiveCycle / (nsTotalTime + ewTotalTime);
      nsTotalTime = Math.max(minGreen, Math.round(nsTotalTime * scale));
      ewTotalTime = Math.max(minGreen, effectiveCycle - nsTotalTime);
    }

    let nsRight = Math.max(minGreen, Math.round(nsTotalTime * rightShare));
    let nsStraightLeft = Math.max(minGreen, nsTotalTime - nsRight);
    let ewRight = Math.max(minGreen, Math.round(ewTotalTime * rightShare));
    let ewStraightLeft = Math.max(minGreen, ewTotalTime - ewRight);

    let sumDir = nsStraightLeft + nsRight + ewStraightLeft + ewRight;
    if (sumDir > effectiveCycle) {
      const scale = effectiveCycle / sumDir;
      nsStraightLeft = Math.max(minGreen, Math.round(nsStraightLeft * scale));
      nsRight = Math.max(minGreen, Math.round(nsRight * scale));
      ewStraightLeft = Math.max(minGreen, Math.round(ewStraightLeft * scale));
      ewRight = Math.max(minGreen, effectiveCycle - (nsStraightLeft + nsRight + ewStraightLeft));
    }

    const ph = [];
    ph.push({ key: "ns_straight_left", lanes: ["lane1", "lane3"], duration: nsStraightLeft, type: "direction", movement: "straight_left" });
    ph.push({ key: "inter_ns_1", lanes: [], duration: allRed, type: "allred" });
    ph.push({ key: "ns_right", lanes: ["lane1", "lane3"], duration: nsRight, type: "direction", movement: "right" });
    ph.push({ key: "inter_ns_2", lanes: [], duration: allRed, type: "allred" });

    ["lane2", "lane4"].forEach((lk) => {
      if (pedInput[lk] > 0) ph.push({ key: `ped_${lk}`, lanes: [], duration: Math.max(6, Math.min(12, Math.ceil(pedInput[lk] * 1.5))), type: "ped", pedLane: lk });
    });

    ph.push({ key: "ew_straight_left", lanes: ["lane2", "lane4"], duration: ewStraightLeft, type: "direction", movement: "straight_left" });
    ph.push({ key: "inter_ew_1", lanes: [], duration: allRed, type: "allred" });
    ph.push({ key: "ew_right", lanes: ["lane2", "lane4"], duration: ewRight, type: "direction", movement: "right" });
    ph.push({ key: "inter_ew_2", lanes: [], duration: allRed, type: "allred" });

    ["lane1", "lane3"].forEach((lk) => {
      if (pedInput[lk] > 0) ph.push({ key: `ped_${lk}`, lanes: [], duration: Math.max(6, Math.min(12, Math.ceil(pedInput[lk] * 1.5))), type: "ped", pedLane: lk });
    });

    return ph;
  }

  function previewAllocation() {
    const ph = computePhasesFromCounts();
    setPhases(ph);
    const preview = {};
    laneKeys.forEach((k) => (preview[k] = { vehicles: counts[k] || 0, ped: pedCounts[k] || 0, vehicleSignal: "red", pedSignal: "wait" }));
    const first = ph.find((p) => p.type === "direction" || p.type === "ped");
    if (first) {
      if (first.type === "direction") first.lanes.forEach((l) => (preview[l].vehicleSignal = "green"));
      if (first.type === "ped") preview[first.pedLane].pedSignal = "walk";
    }
    setLaneData(preview);
    setPhaseSecondsLeft(ph[0]?.duration || 0);
    setCurrentPhaseIdx(0);
    currentIdxRef.current = 0;
  }

  function updateLaneDataForPhase(phase) {
    const newLaneData = {};
    laneKeys.forEach((k) => {
      newLaneData[k] = { vehicles: counts[k] || 0, ped: pedCounts[k] || 0, vehicleSignal: "red", pedSignal: "wait" };
    });
    if (!phase) {
      setLaneData(newLaneData);
      return;
    }
    if (phase.type === "direction") {
      phase.lanes.forEach((l) => (newLaneData[l].vehicleSignal = "green"));
      newLaneData._movement = phase.movement || "straight";
    } else if (phase.type === "ped") {
      newLaneData[phase.pedLane].pedSignal = "walk";
      newLaneData._movement = "ped";
    }
    setLaneData(newLaneData);
  }

  function startSimulation() {
    const ph = computePhasesFromCounts();
    if (!ph.length) return;
    setPhases(ph);
    setRunning(true);
    setCurrentPhaseIdx(0);
    currentIdxRef.current = 0;
    setPhaseSecondsLeft(ph[0].duration);
    updateLaneDataForPhase(ph[0]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          const next = (currentIdxRef.current + 1) % ph.length;
          currentIdxRef.current = next;
          setCurrentPhaseIdx(next);
          const nextDur = ph[next].duration;
          updateLaneDataForPhase(ph[next]);
          return nextDur;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopSimulation() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
  }

  function resetAll() {
    stopSimulation();
    setCounts({});
    setPedCounts({});
    setLaneData({});
    setPhases([]);
    setCurrentPhaseIdx(0);
    setPhaseSecondsLeft(0);
  }

  useEffect(() => {
    if (phases && phases.length && currentPhaseIdx < phases.length) updateLaneDataForPhase(phases[currentPhaseIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases, currentPhaseIdx]);

  const currentPhaseDuration = phases[currentPhaseIdx]?.duration ?? 0;

  /* ---------- Polling backend for latest counts + preview ---------- */
  useEffect(() => {
    let mounted = true;
    const previewPollMs = 1500;
    const countsPollMs = 1000;

    async function fetchCounts() {
      try {
        const res = await fetch("http://localhost:8000/latest_counts");
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted || !j) return;
        if (j.lanes) setCounts((prev) => ({ ...prev, ...j.lanes }));
        if (j.peds) setPedCounts((prev) => ({ ...prev, ...j.peds }));
        setSourceInfo({ source: j.source, status: j.status, frame_idx: j.frame_idx, timestamp: j.timestamp });
      } catch (err) {
        // ignore
      }
    }

    async function fetchPreview() {
      try {
        const url = `http://localhost:8000/preview.jpg?cb=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const blob = await res.blob();
        const u = URL.createObjectURL(blob);
        if (mounted) {
          if (previewImgRef.current) URL.revokeObjectURL(previewImgRef.current);
          previewImgRef.current = u;
          setPreviewUrl(u);
        }
      } catch (err) {
        // ignore
      }
    }

    fetchCounts();
    fetchPreview();
    const countsId = setInterval(fetchCounts, countsPollMs);
    const previewId = setInterval(fetchPreview, previewPollMs);

    return () => {
      mounted = false;
      clearInterval(countsId);
      clearInterval(previewId);
    };
  }, []);

  /* ---------- Upload: require 4 files (duplicates allowed) ---------- */
  function onApproachFileChange(which, e) {
    const f = e.target.files && e.target.files[0];
    if (which === "n") setFileN(f || null);
    if (which === "e") setFileE(f || null);
    if (which === "s") setFileS(f || null);
    if (which === "w") setFileW(f || null);
  }

  async function uploadApproachFiles() {
    if (!fileN || !fileE || !fileS || !fileW) return alert("Please select files for N, E, S and W.");
    setUploading(true);
    try {
      const fd = new FormData();
      // append same key `file` repeatedly (server in your flow accepted repeated file parts)
      fd.append("file", fileN);
      fd.append("file", fileE);
      fd.append("file", fileS);
      fd.append("file", fileW);

      const res = await fetch("http://localhost:8000/upload_media", { method: "POST", body: fd });
      let body;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      if (!res.ok) {
        const bodyStr = typeof body === "object" ? JSON.stringify(body, null, 2) : String(body || "");
        alert(`Upload failed: ${res.status} ${res.statusText}\n${bodyStr}`);
        return;
      }
      setSourceInfo({ filename: body.filename ?? "multiple", mode: body.mode ?? "batch", status: "submitted" });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err) {
      alert("Upload error: " + (err?.message || String(err)));
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Render ---------- */
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🚦 Smart Traffic Dashboard</h1>
          <div style={s.subtitle}>4-way filter lights • heatmap area • road-like heat display</div>
        </div>
      </div>

      <div style={s.grid}>
        <aside style={s.controls}>
          <h3 style={{ marginTop: 0 }}>Controls</h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: "#444" }}>Provide 4 inputs (image or video) — one per approach:</div>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 44, fontWeight: 800 }}>N</div>
              <input type="file" accept="image/*,video/*" onChange={(e) => onApproachFileChange("n", e)} />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 44, fontWeight: 800 }}>E</div>
              <input type="file" accept="image/*,video/*" onChange={(e) => onApproachFileChange("e", e)} />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 44, fontWeight: 800 }}>S</div>
              <input type="file" accept="image/*,video/*" onChange={(e) => onApproachFileChange("s", e)} />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 44, fontWeight: 800 }}>W</div>
              <input type="file" accept="image/*,video/*" onChange={(e) => onApproachFileChange("w", e)} />
            </label>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button style={{ ...s.btn, background: "#0b76ff", color: "#fff" }} onClick={uploadApproachFiles} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload & Process (4 inputs)"}
              </button>
              <button
                style={{ ...s.btn }}
                onClick={async () => {
                  try {
                    await fetch("http://localhost:8000/stop", { method: "POST" });
                    setSourceInfo(null);
                  } catch (e) {}
                }}
              >
                Stop
              </button>
            </div>

            
          </div>

          <hr style={s.hr} />

          <div style={{ marginBottom: 10, color: "#666" }}></div>

          <hr style={s.hr} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={s.labelInline}>
              <div style={s.labelText}>Cycle (s)</div>
              <input style={s.smallInput} type="number" value={cycleTime} onChange={(e) => setCycleTime(+e.target.value || 0)} />
            </label>
            <label style={s.labelInline}>
              <div style={s.labelText}>Min green</div>
              <input style={s.smallInput} type="number" value={minGreen} onChange={(e) => setMinGreen(+e.target.value || 0)} />
            </label>

            <label style={s.labelInline}>
              <div style={s.labelText}>All-red (s)</div>
              <input style={s.smallInput} type="number" value={allRed} onChange={(e) => setAllRed(+e.target.value || 0)} />
            </label>

            <label style={s.labelInline}>
              <div style={s.labelText}>Right %</div>
              <input style={s.smallInput} type="number" min="10" max="50" value={Math.round(rightShare * 100)} onChange={(e) => setRightShare((+e.target.value || 0) / 100)} />
            </label>
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={s.labelInline}>
              <div style={s.labelText}>Max capacity</div>
              <input style={s.smallInput} type="number" min="1" value={maxCapacity} onChange={(e) => setMaxCapacity(Math.max(1, +e.target.value || 1))} />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={{ ...s.btn, background: "#0b76ff", color: "#fff" }} onClick={previewAllocation}>
              Preview
            </button>
            {!running ? (
              <button style={{ ...s.btn, background: "#00b894", color: "#fff" }} onClick={startSimulation}>
                Start
              </button>
            ) : (
              <button style={{ ...s.btn, background: "#ff7675", color: "#fff" }} onClick={stopSimulation}>
                Stop
              </button>
            )}
            <button style={s.btn} onClick={resetAll}>
              Reset
            </button>
          </div>

          <div style={{ marginTop: 12, color: "#556", fontSize: 13 }}></div>
        </aside>

        <section style={s.main}>
          <div style={s.topRow}>
            <div style={s.canvasContainer}>
              <IntersectionCanvas counts={counts} pedCounts={pedCounts} laneData={laneData} activePhase={phases[currentPhaseIdx]} phaseSecondsLeft={phaseSecondsLeft} phaseDuration={currentPhaseDuration} />
            </div>

            <div style={s.heatContainer}>
              <h4 style={{ margin: "0 0 12px 0" }}>Heat Map • Road view</h4>
              <HeatRoad counts={counts} maxCapacity={maxCapacity} laneKeys={laneKeys} />
              <div style={{ marginTop: 10 }}>
                <HeatLegend />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>Preview</div>
                <div style={{ width: 420, height: 240, border: "1px solid #eee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
                  {previewUrl ? <img src={previewUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 6 }} /> : <div style={{ color: "#999" }}>No preview yet</div>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            {laneKeys.map((k) => (
              <div key={k} style={s.statCard}>
                <div style={{ fontSize: 12, color: "#556" }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{counts[k] || 0} vehicles</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
