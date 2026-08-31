/* ─── ORCA PROFILE — single normalized side-view path ─────────────────
   The orca is defined ONCE, here, in a normalized space:
     · nose at the origin, facing +x
     · overall length (nose to fluke tips) = 1.0
     · y negative is UP (dorsal), positive is DOWN (ventral)
   Every pose in the scene is a transform of this one profile — rotation,
   scale, translation — never a redraw with different geometry.

   Callers pass `len` = overall body length in px. The drawing origin is
   the NOSE; to rotate about the body centre, translate by (+0.5*len, 0)
   after rotating (body centre sits at x = -0.5 in profile space).

   Silhouette priorities, in ratified order: fusiform body with a real
   tapering tail stock → tall near-straight dorsal → HORIZONTAL flukes
   (thin shallow W side-on, centre notch) → rounded paddle pectorals.
   Then the four colour shapes sized to survive 29 px; mouth line last,
   gated off below 100 px where it would be sub-pixel mush.               */

const BLACK = "rgba(9,17,29,0.96)";        // matches the scene's animal ink
const WHITE = "rgba(234,244,249,0.92)";
const GREY  = "rgba(122,148,168,0.60)";
const RIM   = "rgba(255,214,150,0.75)";    // scene sun-rim colour, unchanged

/* Body outline as a reusable path — also used as a CLIP for the colour
   patches, so white/grey can be drawn generously and can never bleed
   outside the silhouette. Deepest point ~35% back, depth ~0.22; tail
   stock narrows to ~0.06 before the flukes.                              */
function bodyPath(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(0, 0.010);                                                    // nose tip, just below axis
  // top: blunt melon → deepest at ~-0.35 → long taper into the stock
  c.bezierCurveTo(-0.005, -0.045, -0.050, -0.085, -0.140, -0.105);
  c.bezierCurveTo(-0.240, -0.120, -0.300, -0.125, -0.380, -0.122);
  c.bezierCurveTo(-0.500, -0.115, -0.600, -0.095, -0.700, -0.070);
  c.bezierCurveTo(-0.790, -0.048, -0.860, -0.034, -0.905, -0.028);
  c.lineTo(-0.905, 0.032);                                               // tail stock, depth 0.06
  // bottom: back toward the rounded chin
  c.bezierCurveTo(-0.840, 0.042, -0.760, 0.058, -0.660, 0.072);
  c.bezierCurveTo(-0.540, 0.086, -0.440, 0.094, -0.340, 0.096);
  c.bezierCurveTo(-0.240, 0.096, -0.140, 0.088, -0.075, 0.068);
  c.bezierCurveTo(-0.030, 0.052, -0.005, 0.035, 0, 0.010);
  c.closePath();
}

export function paintOrca(
  c: CanvasRenderingContext2D,
  len: number,
  opts: { rim?: boolean } = {},
) {
  c.save();
  c.scale(len, len);

  /* ── black silhouette: body, dorsal, flukes, pectoral ── */
  c.fillStyle = BLACK;

  bodyPath(c);
  c.fill();

  // dorsal fin — THE identifier. Tall (0.22 above the back), nearly
  // straight leading edge, slight backward lean, base at ~45-56% back.
  c.beginPath();
  c.moveTo(-0.420, -0.110);
  c.quadraticCurveTo(-0.468, -0.235, -0.545, -0.335);                    // near-straight leading edge
  c.quadraticCurveTo(-0.558, -0.210, -0.575, -0.090);                    // gently concave trailing edge
  c.closePath();
  c.fill();

  // flukes — HORIZONTAL, so side-on they read as a thin shallow W with a
  // clear centre notch, not a vertical fish tail.
  c.beginPath();
  c.moveTo(-0.900, -0.026);
  c.quadraticCurveTo(-0.960, -0.036, -1.000, -0.052);                    // upper lobe tip
  c.quadraticCurveTo(-0.972, -0.020, -0.952, 0.004);                     // in to the notch
  c.quadraticCurveTo(-0.978, 0.028, -1.000, 0.058);                      // lower lobe tip
  c.quadraticCurveTo(-0.952, 0.042, -0.898, 0.030);                      // back to the stock
  c.closePath();
  c.fill();

  // pectoral fin — large rounded paddle (not a point), rooted just
  // behind the head at ~20% back, angled down and back.
  c.beginPath();
  c.moveTo(-0.175, 0.062);
  c.bezierCurveTo(-0.190, 0.128, -0.225, 0.182, -0.272, 0.198);
  c.quadraticCurveTo(-0.305, 0.185, -0.300, 0.158);                      // rounded tip
  c.bezierCurveTo(-0.282, 0.112, -0.262, 0.078, -0.242, 0.062);
  c.closePath();
  c.fill();

  /* ── colour patches, clipped to the body so they cannot escape it ── */
  c.save();
  bodyPath(c);
  c.clip();

  // white chin/throat/belly, forking up onto the flank behind the dorsal.
  // Only the TOP boundary matters — everything below it is filled and the
  // clip supplies the true lower edge.
  c.beginPath();
  c.moveTo(0.005, 0.012);
  c.bezierCurveTo(-0.060, 0.050, -0.160, 0.070, -0.280, 0.078);          // chin → throat line
  c.bezierCurveTo(-0.360, 0.082, -0.420, 0.082, -0.460, 0.080);
  c.bezierCurveTo(-0.520, 0.068, -0.580, 0.038, -0.640, -0.008);         // fork: up the flank blaze
  c.bezierCurveTo(-0.652, 0.022, -0.640, 0.046, -0.612, 0.060);          // down its rear edge
  c.bezierCurveTo(-0.652, 0.058, -0.700, 0.050, -0.740, 0.044);          // thin strip to the tail
  c.lineTo(-0.740, 0.160);
  c.lineTo(0.030, 0.160);
  c.closePath();
  c.fillStyle = WHITE;
  c.fill();

  // eye patch — an OVAL above and behind the eye, tilted up-and-back.
  // Bold on purpose: at 29 px total length this is ~2 px tall and it is
  // the single mark that makes the animal read as an orca.
  c.beginPath();
  c.ellipse(-0.160, -0.045, 0.075, 0.026, 0.35, 0, Math.PI * 2);
  c.fill();

  // grey saddle patch, hugging the dorsal's trailing base.
  c.beginPath();
  c.ellipse(-0.635, -0.055, 0.085, 0.032, 0.18, 0, Math.PI * 2);
  c.fillStyle = GREY;
  c.fill();

  c.restore(); // clip off

  // mouth — a gentle line curving slightly up toward the eye. Lowest
  // priority mark; below 100 px it is sub-pixel, so it is gated, not
  // drawn as mush.
  if (len >= 100) {
    c.beginPath();
    c.moveTo(-0.012, 0.030);
    c.quadraticCurveTo(-0.060, 0.036, -0.115, 0.014);
    c.strokeStyle = "rgba(9,17,29,0.9)";
    c.lineWidth = Math.max(0.6 / len, 0.006);
    c.stroke();
  }

  // backlit rim along the spine — the breach-through-sun-glitter light.
  // Same colour and weight class as the scene's current rim.
  if (opts.rim) {
    c.beginPath();
    c.moveTo(-0.020, -0.062);
    c.bezierCurveTo(-0.140, -0.108, -0.300, -0.126, -0.380, -0.122);
    c.bezierCurveTo(-0.500, -0.115, -0.600, -0.095, -0.700, -0.070);
    c.strokeStyle = RIM;
    c.lineWidth = Math.max(1 / len, 0.020);
    c.stroke();
  }

  c.restore();
}
