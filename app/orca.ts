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
  c.moveTo(0, 0.006);                                                    // rounded snout tip
  // top: gentle CONVEX taper from the crown down to the snout — not a
  // point, not a rounded rectangle — then deepest at ~-0.35 and a long
  // taper into the stock
  c.bezierCurveTo(-0.002, -0.022, -0.030, -0.060, -0.095, -0.088);
  c.bezierCurveTo(-0.180, -0.112, -0.260, -0.123, -0.360, -0.122);
  c.bezierCurveTo(-0.480, -0.118, -0.590, -0.096, -0.700, -0.070);
  c.bezierCurveTo(-0.790, -0.048, -0.860, -0.034, -0.905, -0.028);
  c.lineTo(-0.905, 0.032);                                               // tail stock, depth 0.06
  // bottom: back toward the rounded chin
  c.bezierCurveTo(-0.840, 0.042, -0.760, 0.058, -0.660, 0.072);
  c.bezierCurveTo(-0.540, 0.086, -0.440, 0.094, -0.340, 0.096);
  c.bezierCurveTo(-0.240, 0.096, -0.150, 0.086, -0.070, 0.070);
  c.bezierCurveTo(-0.028, 0.048, -0.008, 0.032, 0, 0.006);
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

  // flukes — HORIZONTAL, cheated slightly toward a three-quarter view so
  // the W opens up: span ~0.25 tip-to-tip, thin swept lobes, a clear
  // forward centre notch. The stock keeps its taper; the lobes carry the
  // spread.
  c.beginPath();
  c.moveTo(-0.895, -0.026);
  c.quadraticCurveTo(-0.965, -0.052, -1.015, -0.112);                    // upper lobe, swept back to its tip
  c.quadraticCurveTo(-0.992, -0.060, -0.962, -0.006);                    // full trailing edge to a SHALLOW notch
  c.quadraticCurveTo(-0.996, 0.058, -1.018, 0.124);                      // out along the lower trailing edge
  c.quadraticCurveTo(-0.968, 0.056, -0.893, 0.032);                      // lower leading edge back to the stock
  c.closePath();
  c.fill();

  // pectoral fin — big rounded paddle rooted low just behind the head,
  // swept back ~30° from vertical rather than hanging straight down.
  c.beginPath();
  c.moveTo(-0.160, 0.055);
  c.bezierCurveTo(-0.192, 0.128, -0.238, 0.198, -0.302, 0.226);          // leading edge, down and back
  c.quadraticCurveTo(-0.344, 0.240, -0.348, 0.204);                      // fat rounded tip
  c.bezierCurveTo(-0.330, 0.148, -0.292, 0.088, -0.250, 0.060);          // trailing edge back to the body
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
  c.moveTo(0.004, 0.010);
  c.bezierCurveTo(-0.060, 0.048, -0.160, 0.068, -0.280, 0.076);          // chin → throat line
  c.bezierCurveTo(-0.360, 0.080, -0.420, 0.080, -0.470, 0.076);
  // fork: a BOLD white tongue rising behind the dorsal — a lobe with a
  // rounded tip, not a line
  c.bezierCurveTo(-0.530, 0.058, -0.590, 0.020, -0.640, -0.020);         // front edge of the tongue
  c.bezierCurveTo(-0.668, -0.034, -0.690, -0.032, -0.694, -0.016);       // rounded tongue tip
  c.bezierCurveTo(-0.685, 0.016, -0.658, 0.040, -0.625, 0.056);          // rear edge descending
  c.bezierCurveTo(-0.662, 0.056, -0.706, 0.050, -0.742, 0.044);          // thin strip to the tail
  c.lineTo(-0.742, 0.160);
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

  // grey saddle patch — starts at the dorsal's trailing base, hugs the
  // back line, and trails slightly down the flank behind it.
  c.beginPath();
  c.moveTo(-0.565, -0.100);
  c.bezierCurveTo(-0.622, -0.096, -0.682, -0.076, -0.726, -0.044);       // along the back, trailing down
  c.bezierCurveTo(-0.706, -0.028, -0.668, -0.026, -0.636, -0.038);       // lower boundary curving back
  c.bezierCurveTo(-0.602, -0.052, -0.576, -0.076, -0.565, -0.100);       // up to the fin base
  c.closePath();
  c.fillStyle = GREY;
  c.fill();

  c.restore(); // clip off

  // mouth — a gentle line curving slightly up toward the eye. Lowest
  // priority mark; below 100 px it is sub-pixel, so it is gated, not
  // drawn as mush.
  if (len >= 100) {
    c.beginPath();
    c.moveTo(-0.010, 0.028);
    c.quadraticCurveTo(-0.070, 0.042, -0.118, 0.032);                    // gentle line back along the jaw
    c.quadraticCurveTo(-0.142, 0.024, -0.152, 0.008);                    // curling up, ending under the eye patch
    c.strokeStyle = "rgba(9,17,29,0.9)";
    c.lineWidth = Math.max(0.6 / len, 0.006);
    c.stroke();
  }

  // backlit rim along the spine — the breach-through-sun-glitter light.
  // Stroked along the body outline's OWN top beziers (identical control
  // points, so it cannot drift off the silhouette) and clipped to the
  // body, so only the inner half of the stroke shows: a lit edge, not a
  // gold band floating on the back.
  if (opts.rim) {
    c.save();
    bodyPath(c);
    c.clip();
    c.beginPath();
    c.moveTo(0, 0.006);
    c.bezierCurveTo(-0.002, -0.022, -0.030, -0.060, -0.095, -0.088);
    c.bezierCurveTo(-0.180, -0.112, -0.260, -0.123, -0.360, -0.122);
    c.bezierCurveTo(-0.480, -0.118, -0.590, -0.096, -0.700, -0.070);
    c.strokeStyle = RIM;
    c.lineWidth = Math.max(2 / len, 0.024);
    c.stroke();
    c.restore();
  }

  c.restore();
}
