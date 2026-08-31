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

const BLACK = "#09111d";                   // scene animal ink, OPAQUE — overlapping
                                           // silhouette parts (dorsal base, fluke/stock
                                           // blend, pectoral root) cannot double-darken,
                                           // so part joins carry no seams by construction
const WHITE = "rgba(234,244,249,0.92)";
const GREY  = "rgba(122,148,168,0.60)";
const RIM   = "rgba(255,214,150,0.75)";    // scene sun-rim colour, unchanged

/* Body outline as a reusable path — also used as a CLIP for the colour
   patches, so white/grey can be drawn generously and can never bleed
   outside the silhouette. Deepest point ~35% back, depth ~0.22; tail
   stock narrows to ~0.06 and BLENDS into the flukes (they overlap it;
   opaque ink means the overlap is invisible).                            */
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

/* Ruled tail candidates, rendered side by side on the bench:
   A — flat crescent, the honest side view of horizontal flukes;
   B — the same crescent with the stock rolled ~25°, near lobe full;
   C — one broad fan blade seen from slightly behind/above, the classic
       orca-silhouette tail;
   D — Carter's exact path: broad two-lobed fan, symmetric top/bottom
       (the standard flat-illustration cheat), lobes wide and swept back
       ~45°, concave trailing edges, centre notch. */
export type OrcaTail = "A" | "B" | "C" | "D";

export function paintOrca(
  c: CanvasRenderingContext2D,
  len: number,
  opts: { rim?: boolean; tail?: OrcaTail } = {},
) {
  const tail = opts.tail ?? "A";
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

  if (tail === "A") {
    // tail A — FLAT CRESCENT: one wide thin boomerang sweeping BACK,
    // tilted ~20° from horizontal; span ~0.26 tip-to-tip, thickness
    // ~0.04 at centre tapering to rounded tips, shallow notch on the
    // trailing edge. Total vertical extent ~0.10 — the honest side
    // view of a horizontal fluke plane. Overlaps the stock: no seam.
    c.beginPath();
    c.moveTo(-0.850, -0.022);                                            // on the stock — the blend
    c.quadraticCurveTo(-1.030, -0.058, -1.148, -0.046);                  // leading edge, back with a rise
    c.quadraticCurveTo(-1.166, -0.038, -1.156, -0.022);                  // rounded far tip
    c.quadraticCurveTo(-1.060, -0.016, -1.000, 0.002);                   // trailing edge toward the notch
    c.quadraticCurveTo(-0.990, 0.008, -0.998, 0.016);                    // shallow trailing-edge notch
    c.quadraticCurveTo(-0.965, 0.030, -0.930, 0.046);                    // trailing edge out to the near tip
    c.quadraticCurveTo(-0.906, 0.056, -0.898, 0.044);                    // rounded near tip
    c.quadraticCurveTo(-0.870, 0.028, -0.845, 0.018);                    // underside, back onto the stock
    c.closePath();
    c.fill();
  } else if (tail === "B") {
    // tail B — SLIGHT TWIST: same crescent with the stock rolled ~25°.
    // Near lobe shows full, sweeping back-and-up; far lobe is
    // foreshortened, peeking below/behind the stock.
    c.beginPath();
    c.moveTo(-0.848, -0.024);                                            // near lobe, from the stock
    c.quadraticCurveTo(-0.990, -0.072, -1.098, -0.132);                  // leading edge, back and up
    c.quadraticCurveTo(-1.116, -0.124, -1.106, -0.108);                  // rounded tip
    c.quadraticCurveTo(-1.000, -0.050, -0.930, -0.006);                  // concave trailing edge home
    c.quadraticCurveTo(-0.890, 0.010, -0.850, 0.016);                    // blend at the stock
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(-0.880, 0.014);                                             // far lobe, foreshortened
    c.quadraticCurveTo(-0.948, 0.032, -0.990, 0.058);                    // short blade, down-back
    c.quadraticCurveTo(-1.002, 0.070, -0.992, 0.078);                    // rounded stub tip
    c.quadraticCurveTo(-0.942, 0.060, -0.892, 0.034);                    // underside back to the stock
    c.closePath();
    c.fill();
  } else {
    // tail C — BROAD FAN: one blade seen from slightly behind and above,
    // the full upper surface visible — the classic orca-silhouette tail.
    // Span ~0.30 tip-to-tip on an axis ~30° below horizontal (tilted
    // down toward the viewer), vertical extent ~0.18, concave trailing
    // edge with a clear centre notch, rounded tips, no second lobe.
    // Overlaps the stock: no seam.
    c.beginPath();
    c.moveTo(-0.848, -0.020);                                            // on the stock — the blend
    c.quadraticCurveTo(-0.905, -0.058, -0.975, -0.095);                  // leading edge up-back to the far tip
    c.quadraticCurveTo(-0.995, -0.104, -0.998, -0.088);                  // rounded far (upper) tip
    c.quadraticCurveTo(-1.020, -0.048, -1.048, -0.008);                  // trailing edge in, concave
    c.quadraticCurveTo(-1.030, 0.004, -1.052, 0.014);                    // CLEAR centre notch (forward dimple)
    c.quadraticCurveTo(-1.100, 0.040, -1.170, 0.072);                    // out to the near tip
    c.quadraticCurveTo(-1.205, 0.090, -1.190, 0.104);                    // rounded near (lower) tip
    c.quadraticCurveTo(-1.060, 0.092, -0.945, 0.058);                    // broad underside sweeping home
    c.quadraticCurveTo(-0.882, 0.038, -0.845, 0.026);                    // blend at the stock
    c.closePath();
    c.fill();
  }

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
  // The boundary starts AT the snout tip and runs just above the mouth
  // line, so the lower jaw is white from the tip back to the throat
  // where it joins the belly white. Only the TOP boundary matters — the
  // clip supplies the true lower edge.
  c.beginPath();
  c.moveTo(0.001, -0.006);
  c.bezierCurveTo(-0.030, 0.008, -0.080, 0.016, -0.135, 0.026);          // lower jaw, above the mouth
  c.bezierCurveTo(-0.190, 0.045, -0.235, 0.062, -0.280, 0.072);          // down to the throat
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

  // eye patch — slim teardrop: rounded at the front, TAPERING toward the
  // raised rear, tilted up-and-back. ~20% shallower than the old oval
  // and a touch longer.
  c.save();
  c.translate(-0.160, -0.048);
  c.rotate(0.35);
  c.beginPath();
  c.moveTo(-0.088, 0);                                                   // tapered rear point (up-back end)
  c.quadraticCurveTo(-0.030, -0.024, 0.045, -0.019);
  c.quadraticCurveTo(0.086, -0.012, 0.086, 0.001);                       // rounded front
  c.quadraticCurveTo(0.080, 0.014, 0.040, 0.020);
  c.quadraticCurveTo(-0.030, 0.022, -0.088, 0);
  c.closePath();
  c.fill();
  c.restore();

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

  // mouth — nearly straight, running back to end under the eye patch,
  // faintest upturn only. Gated below 100 px where it is sub-pixel.
  if (len >= 100) {
    c.beginPath();
    c.moveTo(-0.008, 0.028);
    c.quadraticCurveTo(-0.085, 0.033, -0.150, 0.021);                    // one shallow arc, no curl
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
