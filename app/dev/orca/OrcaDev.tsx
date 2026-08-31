"use client";

/* Dev-only orca test bench. Top: the ruled TAIL COMPARE — options A
   (flat crescent) and B (slight twist) side by side at 600 and 200 px,
   static pose, for Carter's pick. Below: the four-pose × six-size grid
   (drawn with tail A until the pick lands).                             */

import { useEffect, useRef } from "react";
import { paintOrca, type OrcaTail } from "../../orca";

const BG = "#2e6f96";

const SIZES: { label: string; len: number }[] = [
  { label: "600 px reference", len: 600 },
  { label: "200 px reference", len: 200 },
  { label: "in-scene desktop · 108 px", len: 108 },
  { label: "in-scene mobile · 29 px", len: 29 },
  { label: "×1.35 desktop · 145 px", len: 145 },
  { label: "×1.35 mobile · 39 px", len: 39 },
];

const POSES: { label: string; rot: number; scale: number; rim: boolean }[] = [
  { label: "static profile", rot: 0, scale: 1.0, rim: false },
  { label: "rising · −44°", rot: -44 * (Math.PI / 180), scale: 0.98, rim: true },
  { label: "apex · level, scale peak 1.14", rot: 0, scale: 1.14, rim: true },
  { label: "re-entry · +44°", rot: 44 * (Math.PI / 180), scale: 0.98, rim: false },
];

function OrcaCell({ len, rot, scale, rim, tail }: { len: number; rot: number; scale: number; rim: boolean; tail: OrcaTail }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Square cell sized to hold the profile at ±44° and the 1.14 apex scale.
  const side = Math.ceil(len * 1.3 * 1.14) + 16;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = side * dpr;
    canvas.height = side * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, side, side);
    // Same transform order as the scene: translate → rotate → scale, then
    // shift by +0.5·len so the rotation centre is the body centre (the
    // profile's origin is the nose).
    ctx.save();
    ctx.translate(side / 2, side / 2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(0.5 * len, 0);
    paintOrca(ctx, len, { rim, tail });
    ctx.restore();
  }, [len, rot, scale, rim, tail, side]);

  return <canvas ref={ref} style={{ width: side, height: side, display: "block" }} />;
}

export default function OrcaDev() {
  return (
    <main style={{ background: BG, minHeight: "100vh", padding: "24px", fontFamily: "monospace", color: "#eaf4f9" }}>
      <h1 style={{ fontSize: "16px", marginBottom: "4px" }}>/dev/orca — profile bench (dev only)</h1>
      <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "20px" }}>
        one profile, in-plane transforms only · tail compare on top, pose grid below
      </p>

      <section id="tail-compare" style={{ marginBottom: "36px", border: "1px solid rgba(234,244,249,0.3)", padding: "12px" }}>
        <h2 style={{ fontSize: "14px", marginBottom: "10px" }}>TAIL COMPARE — static pose</h2>
        {[600, 200].map(len => (
          <div key={len} style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap", marginBottom: "8px" }}>
            {(["B", "C"] as OrcaTail[]).map(t => (
              <figure key={t} style={{ margin: 0 }}>
                <OrcaCell len={len} rot={0} scale={1} rim={false} tail={t} />
                <figcaption style={{ fontSize: "12px", opacity: 0.85, marginTop: "4px" }}>
                  {t === "B" ? "B — slight twist" : "C — broad fan"} · {len} px
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </section>

      {POSES.map(pose => (
        <section key={pose.label} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", marginBottom: "8px" }}>{pose.label} (tail A)</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            {SIZES.map(s => (
              <figure key={s.label} style={{ margin: 0 }}>
                <OrcaCell len={s.len} rot={pose.rot} scale={pose.scale} rim={pose.rim} tail="A" />
                <figcaption style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
