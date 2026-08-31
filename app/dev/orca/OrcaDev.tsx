"use client";

/* Dev-only orca test bench. Renders the one normalized profile from
   app/orca.ts at the review sizes and the four ratified poses — all
   in-plane transforms of the same path, exactly as the scene applies
   them. Flat mid-blue ground, no scene, no water: shape review only.

   Sizes: 600 and 200 px reference, then the ACTUAL in-scene lengths
   (2.2 × oL: desktop 1440×844 → 108 px, mobile 390 → 29 px) and the
   ×1.35 candidates for the Step-4 multiplier decision.                  */

import { useEffect, useRef } from "react";
import { paintOrca } from "../../orca";

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

function OrcaCell({ len, rot, scale, rim }: { len: number; rot: number; scale: number; rim: boolean }) {
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
    paintOrca(ctx, len, { rim });
    ctx.restore();
  }, [len, rot, scale, rim, side]);

  return <canvas ref={ref} style={{ width: side, height: side, display: "block" }} />;
}

export default function OrcaDev() {
  return (
    <main style={{ background: BG, minHeight: "100vh", padding: "24px", fontFamily: "monospace", color: "#eaf4f9" }}>
      <h1 style={{ fontSize: "16px", marginBottom: "4px" }}>/dev/orca — profile bench (dev only)</h1>
      <p style={{ fontSize: "12px", opacity: 0.8, marginBottom: "20px" }}>
        one profile, in-plane transforms only · rows = poses · columns = sizes
      </p>
      {POSES.map(pose => (
        <section key={pose.label} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", marginBottom: "8px" }}>{pose.label}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            {SIZES.map(s => (
              <figure key={s.label} style={{ margin: 0 }}>
                <OrcaCell len={s.len} rot={pose.rot} scale={pose.scale} rim={pose.rim} />
                <figcaption style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
