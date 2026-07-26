"use client";

import { useState, useEffect, useRef } from "react";

/* ─── PALETTE — Pacific Northwest maritime ────────────────────── */
const C = {
  deep:    "#0b1e2d",
  navy:    "#122a3d",
  ocean:   "#1a4a6b",
  teal:    "#2d8b8e",
  seafoam: "#4fb8b4",
  sky1:    "#f4a44a",
  sky2:    "#e8704a",
  sky3:    "#c94f6b",
  sky4:    "#7b4fa0",
  sky5:    "#2a3f7a",
  gold:    "#f7c56a",
  cream:   "#fdf5e8",
  mist:    "#b8d4dc",
  white:   "#ffffff",
};

/* ─── SCENE GEOMETRY ──────────────────────────────────────────────
   Every coordinate is a fraction of canvas W/H so the composition holds
   at any aspect ratio. Two rules to respect when editing:
   1. SUN_FX must line up with the notch in RIDGE_FAR, or the mountains
      occlude the sun (that was the bug in the first version).
   2. RIDGE_NEAR must sit BELOW RIDGE_FAR at every x — it is the closer
      ridge, so a crossing reads as broken depth.                        */
const TAU = Math.PI * 2;
const SUN_FX = 0.70;
const SUN_FY = 0.435;
const HORIZON_F = 0.52;

/* Olympics. The V at x≈0.70 is the saddle the sun sets into. */
const RIDGE_FAR: [number, number][] = [
  [0, 0.505], [0.03, 0.415], [0.075, 0.345], [0.115, 0.295], [0.155, 0.335],
  [0.20, 0.265], [0.25, 0.315], [0.30, 0.250], [0.35, 0.305], [0.40, 0.275],
  [0.45, 0.325], [0.50, 0.285], [0.545, 0.330], [0.59, 0.315], [0.63, 0.400],
  [0.665, 0.455], [0.70, 0.480], [0.735, 0.455], [0.775, 0.400], [0.82, 0.355],
  [0.87, 0.385], [0.93, 0.415], [1, 0.455],
];
const RIDGE_NEAR: [number, number][] = [
  [0, 0.515], [0.06, 0.462], [0.12, 0.432], [0.18, 0.408], [0.24, 0.442],
  [0.30, 0.418], [0.36, 0.452], [0.42, 0.432], [0.48, 0.462], [0.54, 0.442],
  [0.60, 0.472], [0.66, 0.492], [0.72, 0.500], [0.78, 0.478], [0.84, 0.462],
  [0.90, 0.478], [0.95, 0.492], [1, 0.505],
];
/* Downtown cluster: x, width, height — fractions. */
const SKYLINE: [number, number, number][] = [
  [0.780, 0.025, 0.140], [0.808, 0.018, 0.170], [0.830, 0.022, 0.200],
  [0.855, 0.028, 0.160], [0.886, 0.020, 0.225], [0.909, 0.024, 0.180],
  [0.936, 0.018, 0.150], [0.957, 0.026, 0.120], [0.985, 0.018, 0.100],
];

/* ─── ANIMATED SUNSET SKY + WATER CANVAS ─────────────────────────
   Layering, back to front: sky → stars → god rays → sun → clouds →
   land (pre-rendered) → afterglow bleed → horizon haze → water →
   reflections → sun glitter → waves → boat → orca → gulls → vignette.

   Static geometry (ridges, skyline, Space Needle) is rendered once to an
   offscreen layer and blitted, so only living things redraw each frame.  */
function SkyCanvas({ isMobile = false }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    /* Non-null assertions rather than guard-narrowing: the draw helpers below
       are function DECLARATIONS (hoisted on purpose, so call order can't bite),
       and TS does not carry an `if (!x) return` narrowing into a hoisted
       closure. The runtime guards are kept regardless. */
    const canvas = ref.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    if (!ctx) return;

    /* Offscreen layer for everything that never moves. */
    const OVER = 32; // overscan, so parallax never exposes a bare edge
    const land = document.createElement("canvas");
    const lctx = land.getContext("2d")!;
    if (!lctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rnd = Math.random;

    let W = 0, H = 0, horizon = 0, sunX = 0, sunY = 0, sunR = 0;
    let raf = 0, t = 0, tsec = 0, lastFrame = 0;
    let onScreen = true, looping = false;
    let skyG: CanvasGradient | null = null;
    let waterG: CanvasGradient | null = null;
    let vigG: CanvasGradient | null = null;

    /* ── reactivity: pointer position + scroll velocity (locked standard —
          a time-only canvas is an anti-pattern) ── */
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    let lastScroll = window.scrollY, rawScroll = 0, scrollVel = 0;

    /* ── persistent scene objects, generated once ── */
    const stars = Array.from({ length: isMobile ? 26 : 74 }, () => ({
      x: rnd(), y: rnd() * 0.42, r: rnd() * 1.1 + 0.35,
      ph: rnd() * TAU, sp: 0.5 + rnd() * 1.2,
    }));

    /* Standard: birds → 2 on mobile. */
    const gulls = Array.from({ length: isMobile ? 2 : 7 }, () => ({
      x: rnd() * 1.2, y: 0.09 + rnd() * 0.17,
      sp: 0.010 + rnd() * 0.017, size: 3 + rnd() * 4.5,
      ph: rnd() * TAU, glide: 0.3 + rnd() * 0.5,
    }));

    const clouds = Array.from({ length: isMobile ? 4 : 7 }, () => {
      const n = 5 + Math.floor(rnd() * 4);
      return {
        x: rnd() * 1.3, y: 0.09 + rnd() * 0.27,
        w: 0.15 + rnd() * 0.24, h: 0.018 + rnd() * 0.030,
        sp: 0.004 + rnd() * 0.007, a: 0.30 + rnd() * 0.40,
        puffs: Array.from({ length: n }, (_, j) => ({
          dx: (j / (n - 1) - 0.5) * 1.9 + (rnd() - 0.5) * 0.28,
          dy: (rnd() - 0.5) * 0.55,
          r: 0.5 + rnd() * 0.6,
        })),
      };
    });

    /* Sun glitter: discrete glints on a widening cone, not gradient bars.
       Positions are stable and only the sparkle animates. */
    const glints = Array.from({ length: isMobile ? 30 : 110 }, () => ({
      u: rnd(), o: rnd() - 0.5, ph: rnd() * TAU, sp: 1.1 + rnd() * 2.8,
    }));

    /* Windows: a fixed set. Steady ones bake into the land layer; only the
       ~1/3 marked `tw` redraw, so this is a real twinkle instead of 162
       fillRects re-rolling Math.random() every single frame. */
    const windows = [] as { b: number; fx: number; fy: number; a: number; ph: number; sp: number; tw: boolean }[];
    SKYLINE.forEach((_, b) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) {
        if (rnd() > 0.60) continue;
        windows.push({
          b, fx: (c + 0.5) / 3, fy: (r + 0.62) / 7,
          a: 0.30 + rnd() * 0.50, ph: rnd() * TAU,
          // sp is rad/s, so period = 2*PI/sp: this range is 0.24s-1.26s.
          // History: 0.35-1.25 gave 5-18s cycles (drift, not twinkle); then
          // 2.5-15.7 gave 0.40-2.51s, which glowed but was still slow.
          // The fast end stops at sp 26 = 0.24s, just inside the ~0.2s floor —
          // past that it reads as strobing, which is the TV-static failure mode
          // we deliberately avoided. The 5.2x spread is deliberate too: a
          // uniform rate looks mechanical, whereas a mix of fast scintillators
          // and slower ones reads as a real city.
          // Phase stays per-window and random, so the lights stay COHERENT —
          // each window on its own cycle, never re-rolled per frame.
          sp: 5.0 + rnd() * 21.0, tw: rnd() < 0.60,
        });
      }
    });

    /* ── helpers (function declarations: hoisted, so ordering can't bite) ── */

    /* Relief is scaled by aspect ratio. Peak heights are fractions of H, so on a
       portrait viewport the same peaks compress horizontally and the Olympics
       turn into a saw blade — and the sun's saddle pinches shut along with them.
       Flattening toward the horizon keeps it a mountain range at 390px wide and
       leaves it untouched at any normal desktop ratio. */
    function ridgePath(c: CanvasRenderingContext2D, pts: [number, number][], fill: string, ox: number) {
      const relief = Math.min(1, 0.45 + (W / H) * 0.42);
      // Single height function, so the overscan margins below are placed by the
      // SAME relief scaling as the ridge they continue. Computing the margins
      // any other way makes them sit at a different height on portrait ratios,
      // where relief < 1.
      const yAt = (py: number) => horizon - (horizon - py * H) * relief;
      /* The ridge is painted across the full land canvas, INCLUDING the OVER
         margins on both sides — not just the viewport-width span. The layer is
         W + OVER*2 wide and is blitted at -OVER + pxL, so ridge content that
         stopped at ox..ox+W landed on screen at pxL..pxL+W and left an
         uncovered strip of bare sky up to |pxL| = 15px wide at one edge:
         mouse right -> gap at the left edge, mouse left -> gap at the right.
         The margins hold the first and last point's height FLAT rather than
         extrapolating the slope, which would invent terrain the ridge data
         does not contain. */
      const yFirst = yAt(pts[0][1]), yLast = yAt(pts[pts.length - 1][1]);
      c.beginPath();
      c.moveTo(ox - OVER, horizon + 2);
      c.lineTo(ox - OVER, yFirst);
      pts.forEach(([px, py]) => c.lineTo(ox + px * W, yAt(py)));
      c.lineTo(ox + W + OVER, yLast);
      c.lineTo(ox + W + OVER, horizon + 2);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    }

    /* Space Needle, built from the real tower's proportions: 605 ft overall,
       138 ft top-house diameter, waist at ~52%, top house 78–90%, spire above.
       Drawn as separate legs (not one blob) so the tripod reads as a tripod. */
    function spaceNeedle(c: CanvasRenderingContext2D, cx: number, base: number, hgt: number) {
      const u = (f: number) => f * hgt;
      const yy = (f: number) => base - f * hgt;
      const DARK = "rgba(7,16,29,0.94)";

      // centre leg, set back for depth
      c.fillStyle = "rgba(6,14,26,0.72)";
      c.beginPath();
      c.moveTo(cx - u(0.052), base);
      c.quadraticCurveTo(cx - u(0.030), yy(0.30), cx - u(0.014), yy(0.55));
      c.lineTo(cx + u(0.014), yy(0.55));
      c.quadraticCurveTo(cx + u(0.030), yy(0.30), cx + u(0.052), base);
      c.closePath();
      c.fill();

      // The two outer legs. The curve has to be strongly hyperbolic — flaring
      // hard near the ground, sweeping in to the waist. It is the tower's most
      // recognisable line after the saucer, and a shallow curve here reads as a
      // camera tripod instead.
      c.fillStyle = DARK;
      [-1, 1].forEach(s => {
        c.beginPath();
        c.moveTo(cx + s * u(0.155), base);
        c.quadraticCurveTo(cx + s * u(0.112), yy(0.14), cx + s * u(0.030), yy(0.58));
        c.lineTo(cx + s * u(0.010), yy(0.58));
        c.quadraticCurveTo(cx + s * u(0.062), yy(0.14), cx + s * u(0.098), base);
        c.closePath();
        c.fill();
      });

      // core shaft through the waist up to the top house
      c.beginPath();
      c.moveTo(cx - u(0.026), yy(0.50));
      c.lineTo(cx - u(0.022), yy(0.785));
      c.lineTo(cx + u(0.022), yy(0.785));
      c.lineTo(cx + u(0.026), yy(0.50));
      c.closePath();
      c.fill();

      // top house: underside flares UP and OUT from the shaft to the rim,
      // then the roof tapers back in — the saucer silhouette
      c.beginPath();
      c.moveTo(cx - u(0.024), yy(0.778));
      c.quadraticCurveTo(cx - u(0.090), yy(0.800), cx - u(0.130), yy(0.846));
      c.lineTo(cx - u(0.132), yy(0.862));
      c.lineTo(cx - u(0.092), yy(0.888));
      c.lineTo(cx - u(0.042), yy(0.906));
      c.lineTo(cx + u(0.042), yy(0.906));
      c.lineTo(cx + u(0.092), yy(0.888));
      c.lineTo(cx + u(0.132), yy(0.862));
      c.lineTo(cx + u(0.130), yy(0.846));
      c.quadraticCurveTo(cx + u(0.090), yy(0.800), cx + u(0.024), yy(0.778));
      c.closePath();
      c.fill();

      // spire
      c.beginPath();
      c.moveTo(cx - u(0.016), yy(0.906));
      c.lineTo(cx - u(0.004), yy(1.0));
      c.lineTo(cx + u(0.004), yy(1.0));
      c.lineTo(cx + u(0.016), yy(0.906));
      c.closePath();
      c.fill();
    }

    function buildLand() {
      land.width = Math.round((W + OVER * 2) * DPR);
      land.height = Math.round(H * DPR);
      lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      lctx.clearRect(0, 0, W + OVER * 2, H);

      // aerial perspective: the far ridge is hazier and bluer than the near one
      ridgePath(lctx, RIDGE_FAR, "rgba(26,48,78,0.62)", OVER);
      ridgePath(lctx, RIDGE_NEAR, "rgba(11,26,45,0.86)", OVER);

      SKYLINE.forEach(([bx, bw, bh]) => {
        const bH = H * bh, bY = horizon - bH;
        lctx.fillStyle = "rgba(8,18,32,0.92)";
        lctx.fillRect(OVER + bx * W, bY, bw * W, bH + 3);
        if (bh > 0.18) lctx.fillRect(OVER + (bx + bw / 2) * W - 1, bY - H * 0.03, 2, H * 0.03);
      });

      // steady (non-twinkling) windows bake in here
      windows.filter(w => !w.tw).forEach(w => {
        const [bx, bw, bh] = SKYLINE[w.b];
        const bH = H * bh, bY = horizon - bH;
        lctx.fillStyle = `rgba(255,238,180,${w.a * 0.75})`;
        lctx.fillRect(OVER + (bx + w.fx * bw) * W - 1.5, bY + w.fy * bH, 3, 4);
      });

      spaceNeedle(lctx, OVER + W * 0.752, horizon, H * 0.235);
    }

    let DPR = 1;

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      if (W === 0 || H === 0) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);

      horizon = H * HORIZON_F;
      sunX = W * SUN_FX;
      sunY = H * SUN_FY;
      // Sized off the LARGER axis: a width-derived radius collapses the sun to
      // ~16px on a 390px-wide phone, where it should still read as a sunset.
      sunR = Math.min(Math.max(W, H) * 0.042, H * 0.085);

      skyG = ctx!.createLinearGradient(0, 0, 0, horizon);
      skyG.addColorStop(0, C.sky5); skyG.addColorStop(0.30, C.sky4);
      skyG.addColorStop(0.55, C.sky3); skyG.addColorStop(0.75, C.sky2);
      skyG.addColorStop(0.88, C.sky1); skyG.addColorStop(1, C.gold);

      waterG = ctx!.createLinearGradient(0, horizon, 0, H);
      waterG.addColorStop(0, "#256a8d"); waterG.addColorStop(0.22, "#1a5175");
      waterG.addColorStop(0.62, "#0f3652"); waterG.addColorStop(1, C.deep);

      vigG = ctx!.createRadialGradient(W * 0.5, H * 0.46, Math.min(W, H) * 0.30, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      vigG.addColorStop(0, "rgba(0,0,0,0)");
      vigG.addColorStop(1, "rgba(3,10,20,0.42)");

      buildLand();
    }

    /* Water surface height at x — the boat rides this exact curve, so hull
       and sea never drift out of agreement. */
    /* ONE wave function for the entire surface. `d` is depth as a fraction of
       the water plane: 0 = horizon, 1 = bottom of the hero. The wave strips,
       the crest lines, the boat and the orca all read from this same function,
       so coherence is structural — the hull cannot float above or sink below
       the water it is sitting in, whatever the bands are doing.

       Perspective is built in: near the horizon the waves are small, closely
       spaced and quick; near the viewer they are large, broad and slow.
       Three harmonics rather than two, and `dr` gives every depth its own slow
       phase drift at a rate incommensurate with the carrier, so the pattern
       never lines back up and there is no findable loop. */
    const BOAT_D = 0.058 / (1 - HORIZON_F);      // unchanged boat waterline
    function surfaceY(x: number, chop: number, d: number = BOAT_D) {
      const yBase = horizon + d * (H - horizon);
      const amp = H * (0.0025 + 0.032 * Math.pow(d, 1.15)) + chop * (0.3 + d * 1.2);
      const f = 1.8 + 9 / (1 + 5 * d);           // cycles across W: ~10.8 -> ~3.3
      const sp = 1.5 - 0.8 * d;                  // near water travels slower
      const ph = d * 7.3;
      const dr = tsec * (0.013 + 0.021 * ((d * 7.7) % 1));
      const u = x / W;
      return yBase + amp * (
          Math.sin(u * f * TAU + t * sp + ph + dr)
        + 0.45 * Math.sin(u * f * 1.9 * TAU + t * sp * 1.35 + ph * 2.1 + dr * 1.7)
        + 0.22 * Math.sin(u * f * 3.3 * TAU + t * sp * 0.7 + ph * 3.7 - dr * 1.3)
      ) / 1.67;
    }

    function paintOrca(c: CanvasRenderingContext2D, L: number, rim: boolean) {
      // body — fusiform, nose at +x
      c.beginPath();
      c.moveTo(L, 0);
      c.bezierCurveTo(L * 0.62, -L * 0.30, L * 0.10, -L * 0.34, -L * 0.40, -L * 0.24);
      c.bezierCurveTo(-L * 0.66, -L * 0.18, -L * 0.80, -L * 0.10, -L * 0.92, -L * 0.05);
      c.lineTo(-L * 0.92, L * 0.05);
      c.bezierCurveTo(-L * 0.72, L * 0.16, -L * 0.34, L * 0.28, L * 0.10, L * 0.26);
      c.bezierCurveTo(L * 0.52, L * 0.24, L * 0.84, L * 0.15, L, 0);
      c.closePath();
      c.fillStyle = "rgba(9,17,29,0.96)";
      c.fill();

      // flukes
      c.beginPath();
      c.moveTo(-L * 0.86, 0);
      c.quadraticCurveTo(-L * 1.02, -L * 0.16, -L * 1.20, -L * 0.34);
      c.quadraticCurveTo(-L * 1.00, -L * 0.14, -L * 0.90, 0);
      c.quadraticCurveTo(-L * 1.00, L * 0.14, -L * 1.20, L * 0.32);
      c.quadraticCurveTo(-L * 1.02, L * 0.15, -L * 0.86, 0);
      c.closePath();
      c.fill();

      // dorsal fin — tall and falcate
      c.beginPath();
      c.moveTo(-L * 0.02, -L * 0.30);
      c.quadraticCurveTo(L * 0.02, -L * 0.74, -L * 0.20, -L * 0.86);
      c.quadraticCurveTo(-L * 0.20, -L * 0.52, -L * 0.34, -L * 0.24);
      c.closePath();
      c.fill();

      // pectoral fin
      c.beginPath();
      c.moveTo(L * 0.30, L * 0.16);
      c.quadraticCurveTo(L * 0.16, L * 0.52, -L * 0.06, L * 0.56);
      c.quadraticCurveTo(L * 0.06, L * 0.28, L * 0.10, L * 0.20);
      c.closePath();
      c.fill();

      // white belly
      c.beginPath();
      c.moveTo(L * 0.66, L * 0.10);
      c.bezierCurveTo(L * 0.30, L * 0.26, -L * 0.20, L * 0.24, -L * 0.62, L * 0.10);
      c.bezierCurveTo(-L * 0.22, L * 0.16, L * 0.28, L * 0.17, L * 0.66, L * 0.03);
      c.closePath();
      c.fillStyle = "rgba(232,243,248,0.88)";
      c.fill();

      // eye patch — the mark that makes it read as an orca and not a shape
      c.beginPath();
      c.ellipse(L * 0.52, -L * 0.10, L * 0.15, L * 0.075, -0.22, 0, TAU);
      c.fill();

      // grey saddle patch behind the dorsal
      c.beginPath();
      c.ellipse(-L * 0.30, -L * 0.15, L * 0.20, L * 0.085, -0.15, 0, TAU);
      c.fillStyle = "rgba(120,146,166,0.55)";
      c.fill();

      // backlit rim along the spine — it is breaching into the sun
      if (rim) {
        c.beginPath();
        c.moveTo(L * 0.96, -L * 0.05);
        c.bezierCurveTo(L * 0.60, -L * 0.30, L * 0.10, -L * 0.34, -L * 0.40, -L * 0.24);
        c.strokeStyle = "rgba(255,214,150,0.75)";
        c.lineWidth = Math.max(1, L * 0.045);
        c.stroke();
      }
    }

    /* The signature element. Origin is the waterline, amidships; bow at +x. */
    function paintBoat(c: CanvasRenderingContext2D, L: number, sunSide: number, belly: number, ghost: boolean) {
      const MH = L * 1.62;            // mast height
      const mx = L * 0.06;            // mast station, slightly forward of centre
      const alpha = ghost ? 0.55 : 1;

      // ── wake, laid down before the hull so the hull sits on top of it
      if (!ghost) {
        const wg = c.createLinearGradient(-L * 0.5, 0, -L * 2.6, 0);
        wg.addColorStop(0, "rgba(226,244,250,0.34)");
        wg.addColorStop(1, "rgba(226,244,250,0)");
        c.fillStyle = wg;
        c.beginPath();
        c.moveTo(-L * 0.46, -L * 0.02);
        c.quadraticCurveTo(-L * 1.5, L * 0.02, -L * 2.6, L * 0.16);
        c.lineTo(-L * 2.6, L * 0.30);
        c.quadraticCurveTo(-L * 1.5, L * 0.16, -L * 0.46, L * 0.07);
        c.closePath();
        c.fill();
        for (let i = 0; i < 3; i++) {
          const px = -L * (0.7 + i * 0.55);
          c.beginPath();
          c.ellipse(px, L * (0.06 + i * 0.045), L * 0.20, L * 0.030, 0, 0, TAU);
          c.fillStyle = `rgba(232,247,252,${0.20 - i * 0.05})`;
          c.fill();
        }
      }

      // ── hull: sheer line, raked stem, transom
      c.beginPath();
      c.moveTo(-L * 0.50, -L * 0.055);
      c.quadraticCurveTo(-L * 0.14, -L * 0.082, L * 0.30, -L * 0.088);
      c.lineTo(L * 0.53, -L * 0.115);
      c.quadraticCurveTo(L * 0.45, L * 0.055, L * 0.12, L * 0.078);
      c.quadraticCurveTo(-L * 0.24, L * 0.078, -L * 0.48, L * 0.018);
      c.closePath();
      c.fillStyle = `rgba(13,25,43,${0.96 * alpha})`;
      c.fill();

      // boot stripe + a thin gold cove line — the detail that makes it a yacht
      c.beginPath();
      c.moveTo(-L * 0.47, -L * 0.030);
      c.quadraticCurveTo(-L * 0.10, -L * 0.056, L * 0.48, -L * 0.078);
      c.strokeStyle = `rgba(247,197,106,${0.55 * alpha})`;
      c.lineWidth = Math.max(0.8, L * 0.012);
      c.stroke();

      if (!ghost) {
        // cabin trunk
        c.beginPath();
        c.moveTo(-L * 0.20, -L * 0.078);
        c.lineTo(-L * 0.16, -L * 0.155);
        c.lineTo(L * 0.13, -L * 0.160);
        c.lineTo(L * 0.17, -L * 0.084);
        c.closePath();
        c.fillStyle = "rgba(22,40,63,0.95)";
        c.fill();

        // helmsman at the tiller — someone is sailing this boat
        c.fillStyle = "rgba(10,20,34,0.92)";
        c.beginPath();
        c.ellipse(-L * 0.33, -L * 0.175, L * 0.030, L * 0.034, 0, 0, TAU);
        c.fill();
        c.beginPath();
        c.moveTo(-L * 0.375, -L * 0.070);
        c.lineTo(-L * 0.352, -L * 0.150);
        c.lineTo(-L * 0.300, -L * 0.150);
        c.lineTo(-L * 0.288, -L * 0.070);
        c.closePath();
        c.fill();
      }

      // ── rig
      c.strokeStyle = `rgba(198,214,226,${0.30 * alpha})`;
      c.lineWidth = Math.max(0.6, L * 0.007);
      c.beginPath();                                   // forestay
      c.moveTo(mx, -MH); c.lineTo(L * 0.53, -L * 0.115);
      c.moveTo(mx, -MH); c.lineTo(-L * 0.49, -L * 0.055); // backstay
      c.stroke();

      // ── mainsail, aft of the mast, bellied by the wind
      const head = -MH * 0.985, clewX = -L * 0.40, clewY = -L * 0.30;
      c.beginPath();
      c.moveTo(mx, head);
      c.quadraticCurveTo(clewX - L * belly * 2.4, -MH * 0.46, clewX, clewY);
      c.quadraticCurveTo(-L * 0.16, -L * 0.14, mx, -L * 0.115);
      c.closePath();
      const mg = c.createLinearGradient(mx + sunSide * L * 0.6, head, mx - sunSide * L * 0.6, clewY);
      mg.addColorStop(0, `rgba(255,246,228,${0.97 * alpha})`);
      mg.addColorStop(0.55, `rgba(243,226,196,${0.92 * alpha})`);
      mg.addColorStop(1, `rgba(196,178,158,${0.88 * alpha})`);
      c.fillStyle = mg;
      c.fill();

      // ── headsail, forward of the mast
      c.beginPath();
      c.moveTo(mx - L * 0.01, -MH * 0.87);
      c.quadraticCurveTo(L * 0.46 + L * belly * 1.6, -MH * 0.44, L * 0.52, -L * 0.11);
      c.quadraticCurveTo(L * 0.22, -L * 0.24, mx - L * 0.02, -L * 0.30);
      c.closePath();
      const jg = c.createLinearGradient(L * 0.5, -MH * 0.5, mx, -L * 0.2);
      jg.addColorStop(0, `rgba(255,243,220,${0.94 * alpha})`);
      jg.addColorStop(1, `rgba(219,201,176,${0.86 * alpha})`);
      c.fillStyle = jg;
      c.fill();

      // sunlit edge on whichever luff faces the sun
      c.beginPath();
      if (sunSide > 0) {
        c.moveTo(mx - L * 0.01, -MH * 0.87);
        c.quadraticCurveTo(L * 0.46 + L * belly * 1.6, -MH * 0.44, L * 0.52, -L * 0.11);
      } else {
        c.moveTo(mx, head);
        c.quadraticCurveTo(clewX - L * belly * 2.4, -MH * 0.46, clewX, clewY);
      }
      c.strokeStyle = `rgba(255,222,160,${0.80 * alpha})`;
      c.lineWidth = Math.max(1, L * 0.020);
      c.stroke();

      // ── mast + boom, drawn over the sails
      c.strokeStyle = `rgba(28,46,70,${0.95 * alpha})`;
      c.lineWidth = Math.max(1.4, L * 0.024);
      c.beginPath();
      c.moveTo(mx, -L * 0.10); c.lineTo(mx, -MH);
      c.stroke();
      c.lineWidth = Math.max(1.1, L * 0.018);
      c.beginPath();
      c.moveTo(mx, -L * 0.185); c.lineTo(clewX, clewY);
      c.stroke();

      if (!ghost) {
        // masthead burgee, fluttering
        const f = Math.sin(tsec * 5.5) * 0.28;
        c.beginPath();
        c.moveTo(mx, -MH);
        c.lineTo(mx - L * 0.20, -MH + L * 0.045 + f * L * 0.05);
        c.lineTo(mx, -MH + L * 0.10);
        c.closePath();
        c.fillStyle = "rgba(247,197,106,0.92)";
        c.fill();

        // bow curl
        c.beginPath();
        c.ellipse(L * 0.50, L * 0.045, L * 0.14, L * 0.042, -0.25, 0, TAU);
        c.fillStyle = "rgba(236,250,255,0.5)";
        c.fill();
      }
    }

    /* ── the frame ── */
    function frame(now: number) {
      raf = 0;
      if (!W || !H || !skyG || !waterG || !vigG) { schedule(); return; }

      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      t += dt * 0.3;   // matches the original cadence, now frame-rate independent
      tsec += dt;

      // smooth pointer, decay scroll velocity (locked standard: *0.78 per frame)
      ptr.x += (ptr.tx - ptr.x) * 0.055;
      ptr.y += (ptr.ty - ptr.y) * 0.055;
      scrollVel = Math.max(-40, Math.min(40, (scrollVel + rawScroll) * 0.78));
      rawScroll = 0;
      const vel = Math.max(-12, Math.min(12, scrollVel * 0.6));
      const chop = Math.abs(vel) * 0.42;            // fast scroll kicks up sea state
      /* Land parallax is HORIZONTAL ONLY, deliberately.
         The water is a FIXED plane: the water fill, the horizon haze band, every
         wave baseline and surfaceY() all key off `horizon`. So any VERTICAL
         offset on the land slides the land against its own waterline.
         Measured before this change: at ptr.y = -1 the skyline lifted ~15 device
         px clear of the water and opened a gap showing bare sky (peak luminance
         170.7 where water should be), and the scroll-depth term drove it the
         other way, sinking the land 21 / 42 / 84 device px at 0.25 / 0.5 / 1.0
         viewport heights. A horizontal slide along a horizontal waterline cannot
         open a gap, and OVER = 32 of overscan covers the +/-15px of travel.
         The scroll-depth term goes with it. Scroll REACTIVITY is untouched — it
         runs through `vel` above, into sea chop and the gulls. */
      const pxS = ptr.x * 6, pyS = ptr.y * 4;                       // sky parallax
      const pxL = ptr.x * 15, pyL = 0;                              // land: horizontal only
      const pxW = ptr.x * 24;                                       // water parallax

      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);

      /* ── sky ── */
      ctx!.fillStyle = skyG;
      ctx!.fillRect(0, 0, W, horizon + 2);

      /* ── stars ── */
      stars.forEach(s => {
        const a = Math.max(0, 0.62 - s.y * 1.7) * (0.45 + Math.sin(tsec * s.sp + s.ph) * 0.55);
        if (a < 0.03) return;
        ctx!.beginPath();
        ctx!.arc(s.x * W + pxS * 0.4, s.y * H + pyS * 0.4, s.r, 0, TAU);
        ctx!.fillStyle = `rgba(255,248,224,${a})`;
        ctx!.fill();
      });

      const sx = sunX + pxS, sy = sunY + pyS;

      /* ── crepuscular rays (desktop only — "complex fx SKIP" on mobile) ── */
      if (!isMobile) {
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        ctx!.translate(sx, sy);
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + (i - 2) * 0.30 + Math.sin(tsec * 0.07 + i) * 0.04;
          const len = H * (0.34 + 0.20 * (0.5 + 0.5 * Math.sin(tsec * 0.22 + i * 1.7)));
          const wd = W * 0.016 * (0.7 + 0.5 * Math.sin(tsec * 0.29 + i));
          const g = ctx!.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
          g.addColorStop(0, "rgba(255,206,124,0.11)");
          g.addColorStop(1, "rgba(255,190,110,0)");
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.moveTo(0, 0);
          ctx!.lineTo(Math.cos(ang) * len - Math.sin(ang) * wd, Math.sin(ang) * len + Math.cos(ang) * wd);
          ctx!.lineTo(Math.cos(ang) * len + Math.sin(ang) * wd, Math.sin(ang) * len - Math.cos(ang) * wd);
          ctx!.closePath();
          ctx!.fill();
        }
        ctx!.restore();
      }

      /* ── sun: layered bloom, then a disc flattened by atmospheric refraction ── */
      const pulse = 1 + Math.sin(tsec * 0.5) * 0.05;
      ([[5.2, 0.055], [3.4, 0.095], [2.0, 0.19]] as [number, number][]).forEach(([m, a]) => {
        const r = sunR * m * pulse;
        const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(255,214,116,${a})`);
        g.addColorStop(1, "rgba(255,190,90,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, TAU);
        ctx!.fill();
      });
      /* Chanel pass: the sun pillar was cut here. It shared an origin with the
         crepuscular rays and the bloom, so at 0.09 alpha it was doing nothing
         those two were not already doing louder — one gradient per frame for an
         effect no one could point to. */
      ctx!.save();
      ctx!.translate(sx, sy);
      ctx!.scale(1, 0.90);   // a low sun is squashed by refraction — real, and it reads
      const disc = ctx!.createRadialGradient(-sunR * 0.22, -sunR * 0.26, 0, 0, 0, sunR);
      disc.addColorStop(0, "#fffdf0");
      disc.addColorStop(0.45, "#ffe795");
      disc.addColorStop(0.82, "#ffbe58");
      disc.addColorStop(1, "#ff9f45");
      ctx!.fillStyle = disc;
      ctx!.beginPath();
      ctx!.arc(0, 0, sunR, 0, TAU);
      ctx!.fill();
      ctx!.restore();

      /* ── underlit clouds: dark top pass, warm underside pass ── */
      clouds.forEach(cl => {
        cl.x += cl.sp * dt;
        if (cl.x > 1.35) cl.x -= 1.6;
        const cxp = (cl.x - 0.18) * W + pxS * 1.6;
        const cyp = cl.y * H + pyS * 0.8;
        const cw = cl.w * W, ch = cl.h * H;
        const near = 1 - Math.min(1, Math.abs(cxp - sx) / (W * 0.55));
        /* Puffs are drawn under a horizontal stretch so they composite into flat
           stratus bands. Circular puffs read as a row of fuzzy dots, which is
           not a shape a sunset cloud ever takes. The gradient is built AFTER the
           transform so the falloff stretches with the shape. */
        const puff = (px: number, py: number, r: number, from: string, to: string) => {
          ctx!.save();
          ctx!.translate(px, py);
          ctx!.scale(2.1, 0.62);
          const g = ctx!.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, from);
          g.addColorStop(1, to);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(0, 0, r, 0, TAU);
          ctx!.fill();
          ctx!.restore();
        };
        // shadowed top pass (desktop only — mobile skips the complex fx)
        if (!isMobile) {
          cl.puffs.forEach(p => puff(
            cxp + p.dx * cw * 0.5, cyp + p.dy * ch * 0.5 - ch * 0.5,
            p.r * ch * 1.5, `rgba(48,36,72,${0.30 * cl.a})`, "rgba(48,36,72,0)"));
        }
        // underlit pass — warmer the closer the band sits to the sun
        cl.puffs.forEach(p => puff(
          cxp + p.dx * cw * 0.5, cyp + p.dy * ch * 0.5,
          p.r * ch * 1.25,
          `rgba(255,${Math.round(148 + near * 74)},${Math.round(108 + near * 34)},${(0.20 + near * 0.42) * cl.a})`,
          "rgba(255,150,110,0)"));
      });

      /* ── land: one blit of the pre-rendered layer ── */
      ctx!.drawImage(land, 0, 0, land.width, land.height, -OVER + pxL, pyL, W + OVER * 2, H);

      /* ── twinkling windows ──
         Drawn immediately after the land blit and BEFORE the afterglow bleed, so
         they take the same "lighter" lift the baked windows take. They used to be
         drawn after the bleed, which brightened only the baked layer and left the
         windows that move also being the windows that are dimmest. */
      windows.filter(w => w.tw).forEach(w => {
        const [bx, bw, bh] = SKYLINE[w.b];
        const bH = H * bh, bY = horizon - bH;
        // Centred at 0.78, at or above the baked layer's 0.75, swinging +/-0.42.
        const a = w.a * (0.78 + 0.42 * Math.sin(tsec * w.sp + w.ph));
        if (a < 0.04) return;
        ctx!.fillStyle = `rgba(255,238,180,${a})`;
        ctx!.fillRect(OVER + (bx + w.fx * bw) * W - 1.5 - OVER + pxL, bY + w.fy * bH + pyL, 3, 4);
      });

      /* ── afterglow bleeding over the ridgeline, drawn AFTER the silhouette ── */
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      const bleed = ctx!.createRadialGradient(sx, sy, 0, sx, sy, sunR * 4.6);
      bleed.addColorStop(0, "rgba(255,196,110,0.16)");
      bleed.addColorStop(1, "rgba(255,170,90,0)");
      ctx!.fillStyle = bleed;
      ctx!.beginPath();
      ctx!.arc(sx, sy, sunR * 4.6, 0, TAU);
      ctx!.fill();
      ctx!.restore();

      /* ── Space Needle lights ── */
      {
        const nx = W * 0.752 + pxL, nh = H * 0.235, nb = horizon + pyL;
        const halo = ctx!.createRadialGradient(nx, nb - nh * 0.855, 0, nx, nb - nh * 0.855, nh * 0.36);
        halo.addColorStop(0, "rgba(255,214,150,0.20)");
        halo.addColorStop(1, "rgba(255,214,150,0)");
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(nx, nb - nh * 0.855, nh * 0.36, 0, TAU);
        ctx!.fill();
        // observation-deck window band
        ctx!.fillStyle = `rgba(255,229,176,${0.52 + 0.10 * Math.sin(tsec * 0.8)})`;
        ctx!.fillRect(nx - nh * 0.120, nb - nh * 0.862, nh * 0.240, Math.max(1.5, nh * 0.016));
        // aircraft beacon
        const blink = Math.sin(tsec * 2.4);
        if (blink > 0.55) {
          ctx!.fillStyle = `rgba(255,92,74,${(blink - 0.55) * 2})`;
          ctx!.beginPath();
          ctx!.arc(nx, nb - nh * 0.995, Math.max(1.2, nh * 0.014), 0, TAU);
          ctx!.fill();
        }
      }

      /* ── horizon haze: the aerial-perspective band that sells the distance ── */
      const hz = ctx!.createLinearGradient(0, horizon - H * 0.11, 0, horizon + 1);
      hz.addColorStop(0, "rgba(255,186,126,0)");
      hz.addColorStop(1, "rgba(255,190,132,0.26)");
      ctx!.fillStyle = hz;
      ctx!.fillRect(0, horizon - H * 0.11, W, H * 0.11 + 1);

      /* ── water ── */
      ctx!.fillStyle = waterG;
      ctx!.fillRect(0, horizon, W, H - horizon);

      /* ── reflection of the land, flipped about the horizon and squashed ── */
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, horizon, W, H - horizon);
      ctx!.clip();
      ctx!.globalAlpha = 0.16;
      ctx!.translate(0, horizon);
      ctx!.scale(1, -0.62);
      ctx!.translate(0, -horizon);
      ctx!.drawImage(land, 0, 0, land.width, land.height, -OVER + pxL * 0.6, pyL * 0.6, W + OVER * 2, H);
      ctx!.restore();

      /* ── boat state, computed once and shared by the reflection + the boat ── */
      const bL = Math.min(W * 0.088, H * 0.155);
      const swing = Math.sin(tsec * 0.07);
      const vsign = Math.cos(tsec * 0.07);
      const bX = W * (0.45 + swing * 0.155) + pxW;
      const bY = surfaceY(bX, chop) - bL * 0.03;
      const slope = (surfaceY(bX + bL * 0.4, chop) - surfaceY(bX - bL * 0.4, chop)) / (bL * 0.8);
      const flip = vsign >= 0 ? 1 : -1;
      // squash bottoms out exactly when the boat turns, so the mirror is invisible
      // and the moment reads as a tack: foreshortened, upright, then heeled the other way
      const squash = 0.42 + 0.58 * Math.min(1, Math.abs(vsign) * 2.6);
      const heel = 0.115 * Math.min(1, Math.abs(vsign) * 2.6) + Math.sin(tsec * 0.62) * 0.018;
      const belly = 0.10 + Math.sin(tsec * 0.9) * 0.028;
      const sunSide = flip * (sunX - bX) >= 0 ? 1 : -1;

      /* ── sun glitter: a widening cone of discrete glints ──
         pow(u,1.35) rather than 1.7: the steeper curve packed nearly every
         glint against the horizon and left the near water bare. Near-field
         alpha also falls off far more gently now, so the path reads as one
         continuous column instead of a bright band with nothing under it. */
      const gx = sx + pxW * 0.4;
      glints.forEach(g => {
        const u = g.u;
        const y = horizon + Math.pow(u, 1.35) * (H - horizon);
        const spread = W * 0.018 + u * W * 0.19;
        const x = gx + g.o * 2 * spread + Math.sin(tsec * 0.5 + g.ph) * spread * 0.06;
        const a = (0.55 - u * 0.20) * (0.30 + 0.70 * Math.abs(Math.sin(tsec * g.sp + g.ph)));
        if (a < 0.04) return;
        ctx!.fillStyle = `rgba(255,${Math.round(214 - u * 40)},${Math.round(126 - u * 40)},${a})`;
        ctx!.fillRect(x, y, 2.5 + u * 14, Math.max(1, 1 + u * 1.4));
      });

      /* ── wave strips ──
         Each band is a STRIP running from its own edge down to the NEXT band's
         edge, not a fill to the bottom of the canvas. The old structure painted
         the deepest water five times over (base gradient + four fills); this
         paints it twice, while carrying eleven bands instead of four. Overdraw
         goes DOWN as band count goes up, which matters because the measured
         frame cost is rasterisation, not JS.

         Colour is reproduced rather than re-derived. At depth d the old stack
         resolved to some composite L(d); each strip is drawn at alpha SA with
         the colour that composites to exactly L(d) over the base gradient, so
         the depth ramp is preserved by construction. Alpha rather than opaque
         so the land reflection and the sun glitter underneath still read.

         Band depths follow a power law: dense near the horizon, spread out
         near the viewer. Combined with the amplitude ramp in surfaceY, the
         swept regions overlap all the way down, which is what removes the dead
         zones — the old layout left everything below 0.325H frozen. */
      const step = isMobile ? 8 : 3;
      const NB = 11, SA = 0.55;
      const bandDepth = (k: number) => Math.pow(k / NB, 1.55) * 0.95;
      const WSTOPS: [number, number[]][] = [
        [0, [37, 106, 141]], [0.22, [26, 81, 117]], [0.62, [15, 54, 82]], [1, [11, 30, 45]]];
      const OLDBANDS: [number, number[], number][] = [
        [0.062 / (1 - HORIZON_F), [30, 95, 130], 0.68],
        [0.125 / (1 - HORIZON_F), [25, 80, 110], 0.80],
        [0.205 / (1 - HORIZON_F), [20, 65, 95], 0.86],
        [0.325 / (1 - HORIZON_F), [15, 50, 75], 0.92]];
      const baseAt = (d: number) => {
        let i = 0;
        while (i < WSTOPS.length - 2 && d > WSTOPS[i + 1][0]) i++;
        const f = Math.max(0, Math.min(1, (d - WSTOPS[i][0]) / (WSTOPS[i + 1][0] - WSTOPS[i][0])));
        return WSTOPS[i][1].map((v, j) => v + (WSTOPS[i + 1][1][j] - v) * f);
      };
      const stripFill = (d: number) => {
        const base = baseAt(d);
        let L = base.slice();
        for (const [e, c, ba] of OLDBANDS) if (d >= e) L = L.map((v, j) => ba * c[j] + (1 - ba) * v);
        const c = L.map((v, j) => (v - (1 - SA) * base[j]) / SA);
        return `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(",")},${SA})`;
      };

      for (let k = 1; k <= NB; k++) {
        const dTop = bandDepth(k);
        const dBot = k < NB ? bandDepth(k + 1) : null;
        const sk = Math.max(3, Math.round(step + 5 * dTop));
        ctx!.beginPath();
        ctx!.moveTo(0, surfaceY(0, chop, dTop));
        for (let x = sk; x < W; x += sk) ctx!.lineTo(x, surfaceY(x, chop, dTop));
        ctx!.lineTo(W, surfaceY(W, chop, dTop));
        if (dBot === null) { ctx!.lineTo(W, H); ctx!.lineTo(0, H); }
        else {
          ctx!.lineTo(W, surfaceY(W, chop, dBot));
          for (let x = W - sk; x > 0; x -= sk) ctx!.lineTo(x, surfaceY(x, chop, dBot));
          ctx!.lineTo(0, surfaceY(0, chop, dBot));
        }
        ctx!.closePath();
        ctx!.fillStyle = stripFill(dBot === null ? (dTop + 1) / 2 : (dTop + dBot) / 2);
        ctx!.fill();
      }

      /* ── crest lines: one per strip, so they run to the bottom of the hero
             instead of stopping at 22% of the water depth as they did ── */
      for (let k = 1; k <= NB; k++) {
        const dm = (bandDepth(k) + (k < NB ? bandDepth(k + 1) : 1)) / 2;
        const sk = Math.max(4, Math.round((isMobile ? 10 : 5) + 6 * dm));
        ctx!.beginPath();
        for (let x = 0; x <= W; x += sk) {
          const y = surfaceY(x, chop, dm);
          if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = `rgba(255,255,255,${(0.115 - dm * 0.055).toFixed(3)})`;
        ctx!.lineWidth = 1.1 + dm * 1.7;
        ctx!.stroke();
      }

      /* ── boat reflection: ON TOP of the wave fills, not under them.
           Mirrored about the waterline and squashed; the crest lines drawn
           above already break it up, so it sits in the water rather than on it. */
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(0, horizon, W, H - horizon);
      ctx!.clip();
      ctx!.globalAlpha = 0.17;
      ctx!.translate(bX, bY);
      ctx!.scale(flip * squash, -0.5);
      ctx!.rotate(heel + Math.atan(slope) * 0.5);
      paintBoat(ctx!, bL, sunSide, belly, true);
      ctx!.restore();

      /* ── the sailboat ── */
      ctx!.save();
      ctx!.translate(bX, bY);
      ctx!.scale(flip * squash, 1);
      ctx!.rotate(heel + Math.atan(slope) * 0.6);
      paintBoat(ctx!, bL, sunSide, belly, false);
      ctx!.restore();

      /* ── orca: fin approach → breach → splash, on a 16s cycle, backlit
             by breaching through the sun's glitter path ── */
      {
        const CYCLE = 16;
        const c = tsec % CYCLE;
        const oL = Math.min(W * 0.034, H * 0.062);
        const oX = W * 0.715 + pxW * 0.8;
        const oW = surfaceY(oX, chop) + H * 0.055;

        if (c < 2.4) {                                   // dorsal fin cutting the surface
          const p = c / 2.4;
          const fx = oX - (1 - p) * W * 0.075;
          const fh = oL * 0.52 * Math.min(1, p * 2.2);
          ctx!.beginPath();
          ctx!.moveTo(fx + oL * 0.20, oW);
          ctx!.quadraticCurveTo(fx + oL * 0.06, oW - fh, fx - oL * 0.16, oW - fh * 0.92);
          ctx!.quadraticCurveTo(fx - oL * 0.12, oW - fh * 0.35, fx - oL * 0.30, oW);
          ctx!.closePath();
          ctx!.fillStyle = "rgba(9,17,29,0.92)";
          ctx!.fill();
          ctx!.beginPath();                              // V wake
          ctx!.moveTo(fx - oL * 0.3, oW);
          ctx!.lineTo(fx - oL * 1.7, oW + oL * 0.30);
          ctx!.moveTo(fx - oL * 0.3, oW);
          ctx!.lineTo(fx - oL * 1.7, oW - oL * 0.10);
          ctx!.strokeStyle = "rgba(226,244,250,0.28)";
          ctx!.lineWidth = 1.3;
          ctx!.stroke();
        } else if (c < 5.4) {                            // the breach
          const p = (c - 2.4) / 3.0;
          const lift = Math.sin(p * Math.PI);
          const px2 = oX + (p - 0.45) * W * 0.055;
          const py2 = oW - lift * H * 0.135;
          ctx!.save();
          ctx!.translate(px2, py2);
          ctx!.rotate((p - 0.5) * 1.55);
          ctx!.scale(0.92 + lift * 0.22, 0.92 + lift * 0.22);
          paintOrca(ctx!, oL, lift > 0.25);
          ctx!.restore();
          // Water sheeting off the body. It falls VERTICALLY in screen space —
          // gravity does not care how the animal is rotated — and trails below
          // rather than ringing the body, which is what made it read as bubbles.
          if (lift > 0.10) {
            const n = isMobile ? 8 : 20;
            for (let i = 0; i < n; i++) {
              const j = i * 6151;
              const along = ((j % 53) / 53) * 1.7 - 0.85;
              const fall = (j % 31) / 31;
              const dxs = along * oL * 0.9 + ((j % 19) / 19 - 0.5) * oL * 0.3;
              const dys = oL * 0.25 + fall * oL * 1.7 * (1.15 - lift);
              ctx!.beginPath();
              ctx!.arc(px2 + dxs, py2 + dys, Math.max(0.6, (1.5 - fall) * (0.7 + lift)), 0, TAU);
              ctx!.fillStyle = `rgba(220,244,252,${0.40 * lift * (1 - fall * 0.7)})`;
              ctx!.fill();
            }
          }
        } else if (c < 7.6) {                            // splash + settling rings
          const p = (c - 5.4) / 2.2;
          const ease = 1 - p;

          // foam mound at the entry point, collapsing
          ctx!.beginPath();
          ctx!.ellipse(oX, oW, oL * 0.55 * (1 - p * 0.5), oL * 0.20 * ease, 0, 0, TAU);
          ctx!.fillStyle = `rgba(232,249,255,${0.42 * ease})`;
          ctx!.fill();

          // Rings kept under ~2.5 body-lengths. At 4x they read as a bullseye
          // rather than as water closing over an animal.
          for (let i = 0; i < 3; i++) {
            const rr = oL * (0.35 + p * 1.5 + i * 0.35);
            ctx!.beginPath();
            ctx!.ellipse(oX, oW, rr, rr * 0.18, 0, 0, TAU);
            ctx!.strokeStyle = `rgba(226,246,252,${0.24 * ease * (1 - i * 0.28)})`;
            ctx!.lineWidth = 1.3;
            ctx!.stroke();
          }

          // Staggered launch + per-droplet speed, angle and size. Firing them
          // all on the same clock is what collapsed the spray into one blob.
          for (let i = 0; i < (isMobile ? 10 : 26); i++) {
            const j = i * 7919;
            const ang = Math.PI + 0.12 + ((j % 97) / 97) * (Math.PI - 0.24);
            const spd = 0.45 + ((j % 61) / 61) * 1.15;
            const age = p * 2.4 - ((j % 23) / 23) * 0.35;
            if (age <= 0) continue;
            const dx2 = Math.cos(ang) * spd * oL * 2.2 * age;
            const dy2 = Math.sin(ang) * spd * oL * 2.4 * age + 30 * age * age;
            if (dy2 > oL * 0.5) continue;
            ctx!.beginPath();
            ctx!.arc(oX + dx2, oW + dy2, Math.max(0.7, (1.9 - (j % 17) / 17) * ease), 0, TAU);
            ctx!.fillStyle = `rgba(236,250,255,${0.5 * ease})`;
            ctx!.fill();
          }
        }
      }

      /* ── gulls: some flapping, some gliding, nudged by scroll velocity ── */
      gulls.forEach(g => {
        g.x += g.sp * dt;
        if (g.x > 1.25) g.x -= 1.45;
        const gxp = g.x * W + pxS * 2;
        const gyp = g.y * H + Math.sin(tsec * 0.75 + g.ph) * 7 + pyS * 1.4 - vel * 1.6;
        const flap = Math.sin(tsec * 3.4 + g.ph) * (Math.sin(tsec * 0.28 + g.ph) > g.glide ? 0.18 : 1);
        const s = g.size;
        ctx!.beginPath();
        ctx!.moveTo(gxp - s * 1.15, gyp + flap * s * 0.55);
        ctx!.quadraticCurveTo(gxp - s * 0.5, gyp - flap * s * 0.42, gxp, gyp);
        ctx!.quadraticCurveTo(gxp + s * 0.5, gyp - flap * s * 0.42, gxp + s * 1.15, gyp + flap * s * 0.55);
        ctx!.strokeStyle = "rgba(255,247,228,0.74)";
        ctx!.lineWidth = 1.25;
        ctx!.stroke();
      });

      /* ── vignette ── */
      ctx!.fillStyle = vigG;
      ctx!.fillRect(0, 0, W, H);

      schedule();
    }

    function schedule() {
      if (!looping || !onScreen || document.hidden) { raf = 0; return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (motion.matches) { lastFrame = performance.now(); frame(lastFrame + 16); return; }
      if (looping && raf) return;
      looping = true;
      lastFrame = performance.now();
      schedule();
    }

    function stop() {
      looping = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* ── listeners ── */
    const onResize = () => { resize(); if (motion.matches) { lastFrame = performance.now(); frame(lastFrame + 16); } };
    const onScrollEvt = () => {
      const y = window.scrollY;
      rawScroll += y - lastScroll;
      lastScroll = y;
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ptr.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ptr.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    const onLeave = () => { ptr.tx = 0; ptr.ty = 0; };
    const onVis = () => { if (document.hidden) stop(); else start(); };
    const onMotion = () => { stop(); resize(); start(); };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start(); else stop();
    }, { threshold: 0 });

    resize();
    io.observe(canvas);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScrollEvt, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    motion.addEventListener("change", onMotion);
    start();

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollEvt);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      motion.removeEventListener("change", onMotion);
    };
  }, [isMobile]);

  return <canvas ref={ref} aria-hidden="true" style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block" }}/>;
}

/* Both paths are STRICTLY PERIODIC and drawn at double width, so translating a
   layer by exactly -50% of its own width lands on an identical shape and the
   loop is seamless. Back has period 720 and front 480; 1440 is a whole number
   of both (2 and 3), which is the condition for that to hold. The two layers
   drift at different speeds and in opposite directions, so the divider never
   repeats as a whole and reads as continuous with the hero water rather than
   as a frozen shape. Pure CSS transform on two SVGs — no second canvas. */
const WAVE_BACK = "M0,40 C180,80 540,0 720,40 C900,80 1260,0 1440,40 C1620,80 1980,0 2160,40 C2340,80 2700,0 2880,40 L2880,80 L0,80 Z";
const WAVE_FRONT = "M0,50 C120,20 360,80 480,50 C600,20 840,80 960,50 C1080,20 1320,80 1440,50 C1560,20 1800,80 1920,50 C2040,20 2280,80 2400,50 C2520,20 2760,80 2880,50 L2880,80 L0,80 Z";

function WaveDivider({ flip = false, fill = C.deep, bg = "transparent" }: { flip?: boolean; fill?: string; bg?: string }) {
  const layer = (d: string, opacity: number, dur: number, reverse: boolean) => (
    <svg viewBox="0 0 2880 80" preserveAspectRatio="none" aria-hidden="true"
      className="wave-drift"
      style={{ position:"absolute", top:0, left:0, width:"200%", height:"80px", display:"block",
               animationDuration:`${dur}s`, animationDirection: reverse ? "reverse" : "normal" }}>
      <path d={d} fill={fill} opacity={opacity}/>
    </svg>
  );
  return (
    <div style={{ background: bg, lineHeight: 0, transform: flip ? "scaleX(-1)" : "none", marginBottom: "-1px",
                  position:"relative", height:"80px", overflow:"hidden" }}>
      {layer(WAVE_BACK, 0.6, 34, false)}
      {layer(WAVE_FRONT, 1, 21, true)}
    </div>
  );
}

function ReviewCard({ name, location, text, date }: { name: string; location: string; text: string; date: string }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"12px", padding:"24px", backdropFilter:"blur(10px)" }}>
      <div style={{ color:C.gold, fontSize:"13px", marginBottom:"10px", letterSpacing:"0.05em" }}>★★★★★</div>
      <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.82)", lineHeight:1.75, fontFamily:"Georgia,serif", fontStyle:"italic", marginBottom:"16px" }}>&ldquo;{text}&rdquo;</p>
      <div style={{ fontSize:"12px", color:C.seafoam, letterSpacing:"0.08em" }}>{name} · <span style={{ color:"rgba(255,255,255,0.4)" }}>{location}</span></div>
      <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:"4px" }}>{date}</div>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold:0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(36px)", transition:`opacity 0.8s ease ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>
      {children}
    </div>
  );
}

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:"clamp(28px,5vw,48px)", fontWeight:800, fontFamily:"Georgia,serif", color:C.gold, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:"11px", color:C.mist, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:"6px" }}>{label}</div>
    </div>
  );
}

function ExperienceCard({ emoji, location, title, desc, duration, price, airbnbUrl, accent, delay }: {
  emoji: string; location: string; title: string; desc: string;
  duration: string; price: string; airbnbUrl: string; accent: string; delay: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        background: hov ? `linear-gradient(160deg,rgba(255,255,255,0.1),rgba(${accent},0.12))` : "rgba(255,255,255,0.06)",
        border:`1px solid ${hov ? `rgba(${accent},0.6)` : "rgba(255,255,255,0.12)"}`,
        borderRadius:"16px", padding:"36px 32px", backdropFilter:"blur(16px)",
        transform:hov?"translateY(-6px)":"translateY(0)",
        transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow:hov?`0 24px 56px rgba(0,0,0,0.4),0 0 0 1px rgba(${accent},0.3)`:"none",
        cursor:"default",
      }}>
        <div style={{ fontSize:"40px", marginBottom:"16px" }}>{emoji}</div>
        <div style={{ fontSize:"10px", letterSpacing:"0.3em", color:`rgba(${accent},1)`, textTransform:"uppercase", marginBottom:"8px" }}>{location}</div>
        <h3 style={{ fontSize:"clamp(20px,3vw,26px)", fontWeight:700, fontFamily:"Georgia,serif", color:C.cream, marginBottom:"14px", lineHeight:1.2 }}>{title}</h3>
        <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.65)", lineHeight:1.75, marginBottom:"24px" }}>{desc}</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", paddingTop:"20px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", marginBottom:"2px" }}>Duration</div>
            <div style={{ fontSize:"14px", color:C.seafoam, fontWeight:600 }}>{duration}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", marginBottom:"2px" }}>From</div>
            <div style={{ fontSize:"18px", color:C.gold, fontWeight:700, fontFamily:"Georgia,serif" }}>{price}</div>
          </div>
        </div>
        <a href={airbnbUrl} target="_blank" rel="noopener noreferrer" style={{
          display:"block", textAlign:"center", marginTop:"20px", padding:"12px",
          border:`1px solid rgba(${accent},0.5)`, color:`rgba(${accent},1)`,
          fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase",
          textDecoration:"none", transition:"all 0.25s", borderRadius:"6px",
          background:hov?`rgba(${accent},0.12)`:"transparent",
        }}>Book on Airbnb →</a>
      </div>
    </Reveal>
  );
}

const PHOTOS = [
  { src:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80", thumb:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=70", caption:"Golden hour on Puget Sound", tag:"Sunset Sail" },
  { src:"https://images.unsplash.com/photo-1565118531796-763e5082d113?w=900&q=80", thumb:"https://images.unsplash.com/photo-1565118531796-763e5082d113?w=500&q=70", caption:"Seattle skyline from the water", tag:"Lake Union" },
  { src:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80", thumb:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&q=70", caption:"Orca sighting on the Sound", tag:"Wildlife" },
  { src:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80", thumb:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=70", caption:"Olympic Mountains vista", tag:"Puget Sound" },
  { src:"https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=900&q=80", thumb:"https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=500&q=70", caption:"Morning departure from Shilshole Bay", tag:"Shilshole Marina" },
  { src:"https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900&q=80", thumb:"https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=70", caption:"Space Needle from South Lake Union", tag:"Lake Union" },
];

function GalleryThumb({ photo, onOpen }: { photo: typeof PHOTOS[0]; index: number; onOpen: () => void }) {
  const [hov, setHov] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onOpen}
      style={{ position:"relative", paddingBottom:"66%", borderRadius:"10px", overflow:"hidden", cursor:"pointer", background:C.navy, boxShadow:hov?"0 16px 48px rgba(0,0,0,0.5)":"0 4px 16px rgba(0,0,0,0.3)", transition:"box-shadow 0.3s" }}>
      {!imgLoaded && <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${C.navy},${C.ocean})`, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:"28px", opacity:0.3 }}>⛵</span></div>}
      <img src={photo.thumb} alt={photo.caption} onLoad={() => setImgLoaded(true)}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", transform:hov?"scale(1.06)":"scale(1)", transition:"transform 0.5s ease, opacity 0.4s ease", opacity:imgLoaded?1:0 }}/>
      <div style={{ position:"absolute", inset:0, background:hov?"rgba(0,0,0,0.25)":"rgba(0,0,0,0)", transition:"background 0.3s", display:"flex", alignItems:"flex-end" }}>
        <div style={{ padding:"16px", transform:hov?"translateY(0)":"translateY(8px)", opacity:hov?1:0, transition:"all 0.3s", width:"100%", background:"linear-gradient(to top,rgba(0,0,0,0.7),transparent)" }}>
          <div style={{ fontSize:"9px", letterSpacing:"0.2em", color:C.seafoam, textTransform:"uppercase", marginBottom:"2px" }}>{photo.tag}</div>
          <div style={{ fontSize:"13px", color:C.white, fontFamily:"Georgia,serif" }}>{photo.caption}</div>
        </div>
      </div>
    </div>
  );
}

function PhotoGallery({ lightbox, setLightbox, isMobile = false }: { lightbox: number | null; setLightbox: (n: number | null) => void; isMobile?: boolean }) {
  const prev = () => setLightbox(((lightbox ?? 0) - 1 + PHOTOS.length) % PHOTOS.length);
  const next = () => setLightbox(((lightbox ?? 0) + 1) % PHOTOS.length);
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key==="ArrowLeft") prev(); if (e.key==="ArrowRight") next(); if (e.key==="Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);
  return (
    <section id="gallery" style={{ background:`linear-gradient(180deg,${C.navy} 0%,${C.deep} 100%)`, padding:"100px 5%" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
        <Reveal>
          <div style={{ textAlign:"center", marginBottom:"64px" }}>
            <div style={{ fontSize:"10px", letterSpacing:"0.3em", color:C.seafoam, textTransform:"uppercase", marginBottom:"12px" }}>§ ON THE WATER</div>
            <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(28px,5vw,48px)", fontWeight:900, color:C.white, marginBottom:"12px", letterSpacing:"-0.02em" }}>The View from the Deck</h2>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"14px" }}>Real moments from real sails — click any photo to open</p>
          </div>
        </Reveal>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)", gap:"12px" }}>
          {PHOTOS.map((photo, i) => <Reveal key={i} delay={i*0.07}><GalleryThumb photo={photo} index={i} onOpen={() => setLightbox(i)}/></Reveal>)}
        </div>
      </div>
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(5,12,22,0.96)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
          <button onClick={e => { e.stopPropagation(); prev(); }} style={{ position:"absolute", left:"24px", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:C.white, width:"52px", height:"52px", borderRadius:"50%", fontSize:"20px", cursor:"pointer", zIndex:1001 }}>‹</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth:"min(900px,90vw)", width:"100%", position:"relative" }}>
            <img src={PHOTOS[lightbox].src} alt={PHOTOS[lightbox].caption} style={{ width:"100%", maxHeight:"75vh", objectFit:"cover", borderRadius:"12px", boxShadow:"0 32px 80px rgba(0,0,0,0.7)", display:"block" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(to top,rgba(5,15,28,0.95),transparent)", padding:"32px 28px 20px", borderRadius:"0 0 12px 12px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
              <div>
                <div style={{ fontSize:"10px", letterSpacing:"0.25em", color:C.seafoam, textTransform:"uppercase", marginBottom:"4px" }}>{PHOTOS[lightbox].tag}</div>
                <div style={{ fontFamily:"Georgia,serif", fontSize:"18px", color:C.white }}>{PHOTOS[lightbox].caption}</div>
              </div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)" }}>{lightbox+1} / {PHOTOS.length}</div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); next(); }} style={{ position:"absolute", right:"24px", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:C.white, width:"52px", height:"52px", borderRadius:"50%", fontSize:"20px", cursor:"pointer", zIndex:1001 }}>›</button>
          <button onClick={() => setLightbox(null)} style={{ position:"absolute", top:"20px", right:"20px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:C.white, width:"40px", height:"40px", borderRadius:"50%", fontSize:"16px", cursor:"pointer", zIndex:1001 }}>✕</button>
        </div>
      )}
    </section>
  );
}

export default function GrantsSails() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const reviews = [
    { name:"Niels", location:"Berlin, Germany", date:"October 2025", text:"It was a lovely day for sailing on the Puget Sound with Grant! He is a very heartfelt sailing guide." },
    { name:"Ana Laura", location:"Reynosa, Mexico", date:"October 2025", text:"Grant was great! He lets you navigate — I recommend this tour to everyone. Views were so beautiful!! 10/10" },
    { name:"Amy-Ben", location:"Houston, TX", date:"October 2025", text:"Grant, thank you so much for a lovely evening on your sailboat in the Sound. Even my angsty teenagers enjoyed the trip!" },
    { name:"Emma", location:"United States", date:"February 2026", text:"There might be other waterfront tours but there is only one Captain Grant. He knows everything about sailing and so much about the waterfront." },
    { name:"Sándor", location:"Vancouver, WA", date:"February 2026", text:"Grant has been sailing since he was 12. Felt very at ease taking a child on the boat. Nothing like going with someone who is having fun the whole time." },
    { name:"Ellen", location:"Seattle, WA", date:"December 2025", text:"Grant was wonderful! Great conversation — he was happy to share info about sailing and the boat. A truly unique experience." },
  ];

  return (
    <div style={{ background:C.deep, color:C.cream, fontFamily:"'Helvetica Neue',Helvetica,Arial,sans-serif", overflowX:"hidden" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:${C.deep}} ::-webkit-scrollbar-thumb{background:${C.teal};border-radius:2px}
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sway{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(247,197,106,0.3)}50%{box-shadow:0 0 40px rgba(247,197,106,0.6)}}
        @keyframes wave-drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .wave-drift{animation-name:wave-drift;animation-timing-function:linear;animation-iteration-count:infinite}
        @media (prefers-reduced-motion: reduce){.wave-drift{animation:none}}
        a{cursor:pointer}
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, padding:"0 5%", background:scrollY>60||menuOpen?"rgba(11,30,45,0.97)":"transparent", backdropFilter:scrollY>60||menuOpen?"blur(20px)":"none", borderBottom:scrollY>60?"1px solid rgba(45,139,142,0.2)":"none", transition:"all 0.4s ease" }}>
        <div style={{ maxWidth:"1200px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", height:"72px" }}>
          <a href="#hero" style={{ display:"flex", alignItems:"center", gap:"12px", textDecoration:"none" }}>
            <span style={{ fontSize:"28px", animation:"sway 4s ease-in-out infinite" }}>⛵</span>
            <div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"18px", fontWeight:700, color:C.gold, letterSpacing:"0.05em", lineHeight:1 }}>GRANT&apos;S SAILS</div>
              <div style={{ fontSize:"10px", color:C.seafoam, letterSpacing:"0.2em", textTransform:"uppercase" }}>Seattle · Since 2018</div>
            </div>
          </a>
          {!isMobile && (
            <div style={{ display:"flex", gap:"32px", alignItems:"center" }}>
              {[["Experiences","#experiences"],["Gallery","#gallery"],["About","#captain"],["Reviews","#reviews"],["Book Now","#book"]].map(([l,h]) => (
                <a key={l} href={h} style={{ fontSize:l==="Book Now"?"11px":"13px", color:l==="Book Now"?C.deep:"rgba(255,255,255,0.7)", textDecoration:"none", letterSpacing:l==="Book Now"?"0.15em":"0.05em", textTransform:l==="Book Now"?"uppercase":"none", background:l==="Book Now"?C.gold:"transparent", padding:l==="Book Now"?"10px 22px":"0", borderRadius:l==="Book Now"?"4px":"0", fontWeight:l==="Book Now"?700:400, transition:"all 0.2s", animation:l==="Book Now"?"pulse-glow 3s infinite":"none" }}
                  onMouseEnter={e => { if(l!=="Book Now") (e.target as HTMLElement).style.color=C.gold; }}
                  onMouseLeave={e => { if(l!=="Book Now") (e.target as HTMLElement).style.color="rgba(255,255,255,0.7)"; }}
                >{l}</a>
              ))}
            </div>
          )}
          {isMobile && (
            <button onClick={() => setMenuOpen(o => !o)} style={{ background:"none", border:"none", color:C.white, cursor:"pointer", padding:"8px", display:"flex", flexDirection:"column", gap:"5px" }} aria-label="Toggle menu">
              {[0,1,2].map(i => (
                <span key={i} style={{ display:"block", width:"24px", height:"2px", background:C.gold, transform:menuOpen?(i===0?"translateY(7px) rotate(45deg)":i===2?"translateY(-7px) rotate(-45deg)":"scaleX(0)"):"none", transition:"all 0.3s ease", transformOrigin:"center" }}/>
              ))}
            </button>
          )}
        </div>
        {isMobile && menuOpen && (
          <div style={{ padding:"16px 0 24px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column" }}>
            {[["Experiences","#experiences"],["Gallery","#gallery"],["About","#captain"],["Reviews","#reviews"],["Book Now","#book"]].map(([l,h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} style={{ padding:"14px 20px", fontSize:"15px", color:l==="Book Now"?C.gold:"rgba(255,255,255,0.82)", textDecoration:"none", fontWeight:l==="Book Now"?700:400, borderBottom:"1px solid rgba(255,255,255,0.05)", letterSpacing:"0.03em" }}>{l==="Book Now"?"⛵ Book Now →":l}</a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" style={{ position:"relative", height:"100vh", minHeight:"600px", display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
        <SkyCanvas isMobile={isMobile}/>
        <div style={{ position:"relative", zIndex:10, width:"100%", padding:"0 6% 10%", background:"linear-gradient(to top,rgba(11,30,45,0.85) 0%,transparent 100%)" }}>
          <div style={{ animation:"fadeUp 1s ease 0.3s both", maxWidth:"680px" }}>
            {/* Shadow, not a scrim: this label sits at the TOP of the hero content
                block, which is exactly where the block's bottom-anchored gradient
                has faded to transparent. At 390px it wraps onto the ridgeline,
                where seafoam-on-mountain has almost no separation. */}
            <div style={{ fontSize:"11px", letterSpacing:"0.35em", color:C.seafoam, textTransform:"uppercase", marginBottom:"16px", textShadow:"0 1px 14px rgba(6,16,28,0.95), 0 0 5px rgba(6,16,28,0.9)" }}>★ 4.99 · 579+ Reviews · USCG Licensed Captain</div>
            <h1 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(42px,8vw,88px)", fontWeight:900, lineHeight:0.95, letterSpacing:"-0.02em", color:C.white, marginBottom:"20px", textShadow:"0 2px 40px rgba(0,0,0,0.5)" }}>
              Sail Puget Sound<br/><span style={{ color:C.gold }}>with Captain Grant</span>
            </h1>
            <p style={{ fontSize:"clamp(15px,2vw,18px)", color:"rgba(255,255,255,0.8)", lineHeight:1.7, maxWidth:"500px", marginBottom:"36px" }}>Mid-day &amp; sunset sails from Shilshole Bay Marina. Orcas, bald eagles, Olympic Mountains, and the Seattle skyline — all from the deck of a real sailboat.</p>
            <div style={{ display:"flex", gap:"14px", flexWrap:"wrap" }}>
              <a href="#experiences" style={{ background:C.gold, color:C.deep, padding:"16px 40px", fontSize:"13px", letterSpacing:"0.15em", textTransform:"uppercase", textDecoration:"none", fontWeight:800, borderRadius:"4px", transition:"all 0.25s", display:"inline-block", boxShadow:"0 4px 24px rgba(247,197,106,0.4)" }} onMouseEnter={e => (e.currentTarget.style.transform="translateY(-2px)")} onMouseLeave={e => (e.currentTarget.style.transform="translateY(0)")}>View Experiences</a>
              <a href="https://www.airbnb.com/experiences/4018890" target="_blank" rel="noopener noreferrer" style={{ background:"transparent", color:C.white, border:"1px solid rgba(255,255,255,0.4)", padding:"16px 40px", fontSize:"13px", letterSpacing:"0.1em", textTransform:"uppercase", textDecoration:"none", borderRadius:"4px", transition:"all 0.25s", display:"inline-block" }} onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.8)"; e.currentTarget.style.transform="translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"; e.currentTarget.style.transform="translateY(0)"; }}>Book on Airbnb →</a>
            </div>
          </div>
        </div>
        {/* Hidden on mobile: the CTAs wrap to two rows at 390px and the cue lands
            on top of the Airbnb button. A scroll hint is desktop affordance anyway
            — a phone user already knows the page scrolls. */}
        <div style={{ position:"absolute", bottom:"32px", left:"50%", transform:"translateX(-50%)", zIndex:10, display:isMobile?"none":"flex", flexDirection:"column", alignItems:"center", gap:"8px", opacity:0.5, animation:"fadeUp 1s ease 1.2s both" }}>
          <div style={{ fontSize:"9px", letterSpacing:"0.3em", color:C.mist, textTransform:"uppercase" }}>Explore</div>
          <div style={{ width:"1px", height:"36px", background:`linear-gradient(to bottom,${C.seafoam},transparent)` }}/>
        </div>
      </section>

      {/* STATS */}
      <div style={{ background:`linear-gradient(135deg,${C.ocean},${C.navy})`, padding:isMobile?"28px 6%":"40px 5%", borderTop:`3px solid ${C.gold}` }}>
        <div style={{ maxWidth:"900px", margin:"0 auto", display:"grid", gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(auto-fit,minmax(140px,1fr))", gap:"32px" }}>
          <StatBadge value="4.99 ★" label="Puget Sound Rating"/>
          <StatBadge value="5.0 ★" label="Lake Union Rating"/>
          <StatBadge value="585+" label="Happy Guests"/>
          <StatBadge value="100T" label="USCG License"/>
          <StatBadge value="2 Boats" label="Locations"/>
        </div>
      </div>

      {/* EXPERIENCES */}
      <section id="experiences" style={{ background:`linear-gradient(180deg,${C.navy} 0%,${C.deep} 100%)`, padding:"100px 5%", position:"relative" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:"64px" }}>
              <div style={{ fontSize:"10px", letterSpacing:"0.3em", color:C.seafoam, textTransform:"uppercase", marginBottom:"12px" }}>§ TWO WAYS TO SAIL</div>
              <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(32px,5vw,54px)", fontWeight:900, letterSpacing:"-0.02em", color:C.white, marginBottom:"16px" }}>Choose Your Adventure</h2>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:"16px", maxWidth:"500px", margin:"0 auto", lineHeight:1.7 }}>Two iconic Seattle waterways. One legendary captain.</p>
            </div>
          </Reveal>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:"28px" }}>
            <ExperienceCard emoji="🌊" location="Shilshole Bay Marina · Ballard" title="Sail Puget Sound" desc="Set sail from Ballard's Shilshole Bay Marina into the open waters of Puget Sound. Watch for orcas, sea lions, harbor porpoises, and bald eagles as you head west toward the Olympic Mountains. Mid-day and sunset sails available." duration="2–4 hours" price="$149–$229 / person" airbnbUrl="https://www.airbnb.com/experiences/4018890" accent="45,184,180" delay={0}/>
            <ExperienceCard emoji="🏙️" location="South Lake Union · Seattle" title="Lake Union City Sail" desc="Glide past Seattle's iconic floating homes and houseboats, Gas Works Park, MOHAI, and the Space Needle framed by the downtown skyline. A relaxed, intimate sail through the heart of the city." duration="2 hours" price="from $129 / person" airbnbUrl="https://www.airbnb.com/experiences/6798523" accent="247,197,106" delay={0.15}/>
          </div>
          <Reveal delay={0.3}>
            <div style={{ marginTop:"60px", textAlign:"center" }}>
              <div style={{ fontSize:"11px", letterSpacing:"0.25em", color:C.mist, textTransform:"uppercase", marginBottom:"20px" }}>Watch for on Puget Sound</div>
              <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", justifyContent:"center" }}>
                {[["🐋","Orcas & Minke Whales"],["🦅","Bald Eagles"],["🦭","Sea Lions & Harbor Seals"],["🐬","Harbor Porpoises"],["🏔️","Olympic Mountains"]].map(([icon,label]) => (
                  <div key={label as string} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"100px", padding:"8px 18px", fontSize:"13px", color:"rgba(255,255,255,0.75)", display:"flex", alignItems:"center", gap:"8px", backdropFilter:"blur(8px)" }}>
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WaveDivider fill={C.ocean} bg={C.deep}/>

      {/* CAPTAIN */}
      <section id="captain" style={{ background:`linear-gradient(160deg,${C.ocean} 0%,${C.navy} 100%)`, padding:"100px 5%" }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:isMobile?"40px":"64px", alignItems:"center" }}>
          <Reveal>
            <div>
              <div style={{ fontSize:"10px", letterSpacing:"0.3em", color:C.seafoam, textTransform:"uppercase", marginBottom:"16px" }}>§ YOUR CAPTAIN</div>
              <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(32px,5vw,52px)", fontWeight:900, letterSpacing:"-0.02em", color:C.white, marginBottom:"24px", lineHeight:0.95 }}>Captain<br/><span style={{ color:C.gold }}>Grant</span></h2>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.72)", lineHeight:1.8, marginBottom:"20px" }}>US Coast Guard 100-ton licensed captain with decades of experience on Puget Sound. Grant has owned sailboats for most of his life — racing and cruising the Sound, crewing a race from <strong style={{ color:C.seafoam }}>Victoria to Maui</strong>, and captaining in the <strong style={{ color:C.seafoam }}>Greek Islands</strong>.</p>
              <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.72)", lineHeight:1.8, marginBottom:"32px" }}>He&apos;s also the author of four books, including <em>&ldquo;The Tomorrow Makers.&rdquo;</em></p>
              <blockquote style={{ borderLeft:`3px solid ${C.gold}`, paddingLeft:"20px", marginBottom:"32px", fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:"16px", color:C.cream, lineHeight:1.7 }}>&ldquo;I&apos;m dedicated to sharing the joy of being on the water with others and the magic of the wind on a sail.&rdquo;</blockquote>
              <div style={{ display:"flex", gap:"24px", flexWrap:"wrap" }}>
                {[["⚓","USCG 100-Ton License"],["🏆","Victoria–Maui Race"],["🌊","Greek Islands Captain"],["📚","Author, 4 Books"]].map(([icon,label]) => (
                  <div key={label as string} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:C.mist }}><span style={{ fontSize:"16px" }}>{icon}</span><span>{label}</span></div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"20px", padding:"40px", backdropFilter:"blur(12px)", position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:"120px", textAlign:"center", opacity:0.15, position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", filter:"blur(1px)" }}>🧭</div>
              <div style={{ position:"relative", zIndex:1 }}>
                <div style={{ fontSize:"48px", textAlign:"center", marginBottom:"20px", animation:"sway 5s ease-in-out infinite" }}>⛵</div>
                <div style={{ textAlign:"center", marginBottom:"32px" }}>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"22px", color:C.gold, fontWeight:700 }}>Shilshole Bay Marina</div>
                  <div style={{ fontSize:"12px", color:C.mist, letterSpacing:"0.15em", marginTop:"4px" }}>BALLARD · SEATTLE, WA</div>
                </div>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:"24px" }}>
                  {[["Departs","Shilshole Bay Marina, Ballard"],["Guests","Up to 6 per sail"],["Ages","All ages welcome (3+)"],["Skill","No experience needed"]].map(([k,v]) => (
                    <div key={k as string} style={{ display:"flex", justifyContent:"space-between", marginBottom:"14px", fontSize:"13px" }}>
                      <span style={{ color:"rgba(255,255,255,0.4)", letterSpacing:"0.05em" }}>{k}</span>
                      <span style={{ color:C.cream, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WaveDivider fill={C.deep} bg={C.ocean} flip/>

      <PhotoGallery lightbox={lightbox} setLightbox={setLightbox} isMobile={isMobile}/>

      {/* REVIEWS */}
      <section id="reviews" style={{ background:C.deep, padding:"100px 5%" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <Reveal>
            <div style={{ textAlign:"center", marginBottom:"64px" }}>
              <div style={{ fontSize:"10px", letterSpacing:"0.3em", color:C.seafoam, textTransform:"uppercase", marginBottom:"12px" }}>§ GUEST STORIES</div>
              <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(28px,5vw,48px)", fontWeight:900, color:C.white, marginBottom:"10px" }}>From the Deck</h2>
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"14px", letterSpacing:"0.1em" }}>4.99 ★ on Airbnb · 579+ reviews</p>
            </div>
          </Reveal>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(300px,1fr))", gap:"20px" }}>
            {reviews.map((r,i) => <Reveal key={i} delay={i*0.08}><ReviewCard {...r}/></Reveal>)}
          </div>
        </div>
      </section>

      {/* BOOK CTA */}
      <section id="book" style={{ background:`linear-gradient(135deg,${C.ocean} 0%,${C.navy} 50%,${C.ocean} 100%)`, padding:"120px 5%", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 30% 50%,rgba(247,197,106,0.08) 0%,transparent 60%),radial-gradient(ellipse at 70% 50%,rgba(11,30,45,0.3) 0%,transparent 60%)`, pointerEvents:"none" }}/>
        <div style={{ position:"relative", zIndex:1, maxWidth:"640px", margin:"0 auto" }}>
          <Reveal>
            <div style={{ fontSize:"40px", marginBottom:"16px", animation:"sway 4s ease-in-out infinite" }}>⛵</div>
            <h2 style={{ fontFamily:"Georgia,serif", fontSize:"clamp(32px,6vw,62px)", fontWeight:900, letterSpacing:"-0.02em", color:C.white, marginBottom:"20px", lineHeight:0.95, textShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>Ready to set sail?</h2>
            <p style={{ fontSize:"16px", color:"rgba(255,255,255,0.8)", lineHeight:1.75, marginBottom:"40px" }}>Small groups · Beginner friendly · All ages welcome<br/>Free cancellation · Dress in layers · Soft-soled shoes recommended</p>
            <div style={{ display:"flex", gap:"16px", justifyContent:"center", flexWrap:"wrap" }}>
              <a href="https://www.airbnb.com/experiences/4018890" target="_blank" rel="noopener noreferrer" style={{ background:C.gold, color:C.deep, padding:"18px 48px", fontSize:"13px", letterSpacing:"0.2em", textTransform:"uppercase", textDecoration:"none", fontWeight:800, borderRadius:"4px", boxShadow:"0 4px 32px rgba(247,197,106,0.5)", transition:"all 0.25s" }} onMouseEnter={e => (e.currentTarget.style.transform="translateY(-3px)")} onMouseLeave={e => (e.currentTarget.style.transform="translateY(0)")}>Book Puget Sound Sail</a>
              <a href="https://www.airbnb.com/experiences/6798523" target="_blank" rel="noopener noreferrer" style={{ background:"transparent", color:C.white, border:"1px solid rgba(255,255,255,0.5)", padding:"18px 48px", fontSize:"13px", letterSpacing:"0.15em", textTransform:"uppercase", textDecoration:"none", borderRadius:"4px", transition:"all 0.25s" }} onMouseEnter={e => { e.currentTarget.style.borderColor=C.white; e.currentTarget.style.transform="translateY(-3px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.5)"; e.currentTarget.style.transform="translateY(0)"; }}>Book Lake Union Sail</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:C.deep, padding:"40px 5%", borderTop:`1px solid rgba(45,139,142,0.2)`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"20px" }}>⛵</span>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"14px", color:C.gold, fontWeight:700 }}>GRANT&apos;S SAILS</div>
            <div style={{ fontSize:"10px", color:C.mist, letterSpacing:"0.15em" }}>SEATTLE, WA · USCG LICENSED</div>
          </div>
        </div>
        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", letterSpacing:"0.1em", textAlign:"center" }}>Shilshole Bay Marina, Ballard · South Lake Union<br/>© Grant&apos;s Sails · All rights reserved</div>
        <a href="https://www.airbnb.com/experiences/4018890" target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", color:C.seafoam, letterSpacing:"0.15em", textTransform:"uppercase", textDecoration:"none" }}>View on Airbnb →</a>
      </footer>

      {/* FLOATING BOOK BUTTON */}
      <div style={{ position:"fixed", bottom:"28px", right:"28px", zIndex:200, opacity:scrollY>400?1:0, transform:scrollY>400?"translateY(0) scale(1)":"translateY(16px) scale(0.9)", transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)", pointerEvents:scrollY>400?"auto":"none" }}>
        <a href="#book" style={{ display:"flex", alignItems:"center", gap:"8px", background:C.gold, color:C.deep, padding:"14px 24px", borderRadius:"100px", textDecoration:"none", fontWeight:800, fontSize:"13px", letterSpacing:"0.1em", boxShadow:"0 8px 32px rgba(247,197,106,0.45),0 2px 8px rgba(0,0,0,0.3)", whiteSpace:"nowrap", animation:"pulse-glow 3s infinite" }}>
          <span style={{ fontSize:"16px" }}>⛵</span> Book Now
        </a>
      </div>
    </div>
  );
}
