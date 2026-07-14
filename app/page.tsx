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

/* ─── ANIMATED SUNSET SKY + WATER CANVAS ─────────────────────── */
function SkyCanvas({ isMobile = false }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number, t = 0;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const starCount = isMobile ? 20 : 60;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(), y: Math.random() * 0.45,
      r: Math.random() * 1.2 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
    const gullCount = isMobile ? 2 : 6;
    const gulls = Array.from({ length: gullCount }, (_, i) => ({
      x: 0.1 + i * 0.14 + Math.random() * 0.05,
      y: 0.12 + Math.random() * 0.12,
      speed: 0.00015 + Math.random() * 0.0001,
      size: 3 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));
    const draw = () => {
      t += 0.005;
      const W = canvas.width, H = canvas.height;
      const horizon = H * 0.52;
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, C.sky5); sky.addColorStop(0.3, C.sky4);
      sky.addColorStop(0.55, C.sky3); sky.addColorStop(0.75, C.sky2);
      sky.addColorStop(0.88, C.sky1); sky.addColorStop(1, C.gold);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizon);
      stars.forEach(s => {
        const alpha = Math.max(0, 0.6 - s.y * 1.8) * (0.5 + Math.sin(t * 0.8 + s.phase) * 0.5);
        if (alpha < 0.02) return;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,248,220,${alpha})`;
        ctx.fill();
      });
      const sunX = W * 0.72, sunY = horizon * 0.78, sunR = W * 0.045;
      [[sunR * 5, 0.06], [sunR * 3.5, 0.1], [sunR * 2, 0.2]].forEach(([r, a]) => {
        const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r as number);
        g.addColorStop(0, `rgba(255,220,100,${a})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(sunX, sunY, r as number, 0, Math.PI * 2); ctx.fill();
      });
      const disc = ctx.createRadialGradient(sunX - sunR * 0.2, sunY - sunR * 0.2, 0, sunX, sunY, sunR);
      disc.addColorStop(0, "#fffde0"); disc.addColorStop(0.5, "#ffe484"); disc.addColorStop(1, "#ffb347");
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
      const water = ctx.createLinearGradient(0, horizon, 0, H);
      water.addColorStop(0, "#1e5f82"); water.addColorStop(0.3, "#174f6e");
      water.addColorStop(0.7, "#0f3652"); water.addColorStop(1, C.deep);
      ctx.fillStyle = water; ctx.fillRect(0, horizon, W, H - horizon);
      const shimCount = isMobile ? 8 : 18;
      for (let i = 0; i < shimCount; i++) {
        const yOff = horizon + (i * (H - horizon) / shimCount);
        const ww = (W * 0.06) * (1 - i / 22) * (0.8 + Math.sin(t * 1.5 + i * 0.4) * 0.2);
        const alpha = (0.5 - i / 36) * (0.7 + Math.sin(t + i) * 0.3);
        if (alpha <= 0) continue;
        const sg = ctx.createLinearGradient(sunX - ww, yOff, sunX + ww, yOff);
        sg.addColorStop(0, "transparent"); sg.addColorStop(0.5, `rgba(255,210,80,${alpha})`); sg.addColorStop(1, "transparent");
        ctx.fillStyle = sg; ctx.fillRect(sunX - ww, yOff, ww * 2, (H - horizon) / 16);
      }
      const drawWave = (yBase: number, amp: number, period: number, speed: number, color: string, alpha: number) => {
        ctx.beginPath(); ctx.moveTo(0, yBase);
        for (let x = 0; x <= W; x += isMobile ? 8 : 3) {
          const y = yBase + Math.sin((x / W) * period * Math.PI * 2 + t * speed) * amp
            + Math.sin((x / W) * (period * 1.6) * Math.PI * 2 + t * speed * 1.3 + 1.2) * (amp * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = color.replace(")", `,${alpha})`).replace("rgb", "rgba"); ctx.fill();
      };
      drawWave(horizon + H * 0.06, 6, 3, 1.2, "rgb(30,95,130)", 0.7);
      drawWave(horizon + H * 0.12, 8, 4, 0.9, "rgb(25,80,110)", 0.8);
      drawWave(horizon + H * 0.20, 10, 5, 0.7, "rgb(20,65,95)", 0.85);
      drawWave(horizon + H * 0.32, 7, 3, 1.4, "rgb(15,50,75)", 0.9);
      [horizon + H*0.07, horizon + H*0.14, horizon + H*0.23].forEach((yb, i) => {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y = yb + Math.sin((x/W)*5*Math.PI*2 + t*(1+i*0.3)) * (3+i*1.5);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.12 - i*0.03})`; ctx.lineWidth = 1.5; ctx.stroke();
      });
      const drawMountains = (peaks: number[][], color: string, alpha: number) => {
        ctx.beginPath(); ctx.moveTo(0, horizon);
        peaks.forEach(([px, py]) => ctx.lineTo(px * W, py * H));
        ctx.lineTo(W, horizon); ctx.closePath();
        ctx.fillStyle = `rgba(${color},${alpha})`; ctx.fill();
      };
      drawMountains([[0,0.52],[0.04,0.40],[0.10,0.33],[0.17,0.28],[0.22,0.32],[0.30,0.25],[0.38,0.31],[0.44,0.27],[0.50,0.32],[0.56,0.26],[0.62,0.34],[0.68,0.30],[0.72,0.36],[0.78,0.38],[0.85,0.40],[0.92,0.43],[1.0,0.48]], "15,35,60", 0.55);
      drawMountains([[0,0.52],[0.05,0.44],[0.12,0.40],[0.20,0.36],[0.28,0.39],[0.36,0.35],[0.43,0.40],[0.50,0.37],[0.58,0.42],[0.65,0.38],[0.72,0.44],[0.80,0.46],[1.0,0.52]], "12,28,48", 0.7);
      const snX = W * 0.18, snBase = horizon, snH = H * 0.22;
      ctx.fillStyle = "rgba(8,20,35,0.92)";
      [[-0.022,0],[0,-0.008],[0.022,0]].forEach(([dx]) => {
        ctx.beginPath(); ctx.moveTo(snX + dx * W, snBase); ctx.lineTo(snX, snBase - snH * 0.25);
        ctx.strokeStyle = "rgba(8,20,35,0.92)"; ctx.lineWidth = W * 0.004; ctx.stroke();
      });
      ctx.fillStyle = "rgba(8,20,35,0.92)";
      ctx.fillRect(snX - W*0.004, snBase - snH * 0.85, W*0.008, snH * 0.6);
      ctx.beginPath(); ctx.ellipse(snX, snBase - snH * 0.72, W * 0.022, H * 0.018, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(snX - W*0.002, snBase - snH, W*0.004, snH * 0.28);
      ctx.beginPath(); ctx.moveTo(snX, snBase - snH); ctx.lineTo(snX - W*0.003, snBase - snH * 0.88); ctx.lineTo(snX + W*0.003, snBase - snH * 0.88); ctx.closePath(); ctx.fill();
      const bldgs: number[][] = [[0.78,0.025,0.14],[0.808,0.018,0.17],[0.83,0.022,0.20],[0.855,0.028,0.16],[0.886,0.020,0.22],[0.909,0.024,0.18],[0.936,0.018,0.15],[0.957,0.026,0.12],[0.985,0.018,0.10]];
      bldgs.forEach(([bx, bw, bh]) => {
        const bH = H * bh, bY = horizon - bH;
        ctx.fillStyle = "rgba(8,18,32,0.88)"; ctx.fillRect(bx * W, bY, bw * W, bH + 2);
        if (bh > 0.18) { ctx.fillStyle = "rgba(8,18,32,0.9)"; ctx.fillRect((bx + bw/2) * W - 1, bY - H*0.03, 2, H*0.03); }
        for (let row = 0; row < 6; row++) for (let col = 0; col < 3; col++) {
          if (Math.random() > 0.45) { ctx.fillStyle = `rgba(255,240,180,${0.3 + Math.random()*0.4})`; ctx.fillRect(bx*W + col*(bw*W/3)+2, bY + row*(bH/7)+4, 3, 4); }
        }
      });
      if (!isMobile) {
        const whaleCycle = (t % 8);
        if (whaleCycle < 3) {
          const progress = whaleCycle / 3, arc = Math.sin(progress * Math.PI);
          const wX = W * 0.42, wY = horizon + H * 0.08 - arc * H * 0.12;
          const wScale = 0.7 + arc * 0.3;
          ctx.save(); ctx.translate(wX, wY); ctx.scale(wScale, wScale); ctx.rotate(-0.3 + arc * 0.4);
          const wW = W * 0.06, wH = H * 0.06;
          ctx.beginPath(); ctx.ellipse(0, 0, wW, wH * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(15,30,50,0.92)"; ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, wH * 0.15, wW * 0.6, wH * 0.22, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(200,220,230,0.5)"; ctx.fill();
          ctx.beginPath(); ctx.moveTo(-wW*0.7, wH*0.1); ctx.quadraticCurveTo(-wW*1.1,-wH*0.3,-wW*0.9,-wH*0.5);
          ctx.quadraticCurveTo(-wW*0.7,-wH*0.2,-wW*0.5,-wH*0.05); ctx.quadraticCurveTo(-wW*0.7,wH*0.3,-wW*0.7,wH*0.1);
          ctx.fillStyle = "rgba(12,25,45,0.92)"; ctx.fill();
          ctx.beginPath(); ctx.moveTo(wW*0.1,-wH*0.1); ctx.lineTo(wW*0.35,-wH*0.55); ctx.lineTo(wW*0.5,-wH*0.1); ctx.fill();
          if (arc > 0.05 && arc < 0.9) {
            for (let s = 0; s < 8; s++) {
              const sa = (s/8)*Math.PI, sr = wW*0.4*arc;
              ctx.beginPath(); ctx.arc(Math.cos(sa)*sr*1.5+wW*0.3, wH*0.4+Math.sin(sa)*sr*0.5, 2+arc*3, 0, Math.PI*2);
              ctx.fillStyle = `rgba(180,230,240,${0.5*arc})`; ctx.fill();
            }
          }
          ctx.restore();
        }
        const boatX = W * (0.35 + Math.sin(t * 0.18) * 0.008);
        const boatY = horizon + H * 0.04 + Math.sin(t * 0.5) * 3;
        const boatW = W * 0.07, boatH = H * 0.04, mastH = H * 0.16;
        ctx.save(); ctx.translate(boatX, boatY); ctx.rotate(Math.sin(t * 0.5) * 0.04);
        ctx.beginPath(); ctx.moveTo(-boatW/2, 0);
        ctx.quadraticCurveTo(-boatW*0.3, boatH, 0, boatH*1.1);
        ctx.quadraticCurveTo(boatW*0.3, boatH, boatW*0.45, 0); ctx.closePath();
        ctx.fillStyle = "rgba(12,24,42,0.95)"; ctx.fill();
        ctx.strokeStyle = "rgba(80,140,170,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -mastH);
        ctx.strokeStyle = "rgba(20,40,65,0.9)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -mastH); ctx.lineTo(boatW*0.85, -mastH*0.1); ctx.lineTo(0, 0); ctx.closePath();
        const sailGrad = ctx.createLinearGradient(0, -mastH, boatW*0.85, 0);
        sailGrad.addColorStop(0, "rgba(255,248,235,0.95)"); sailGrad.addColorStop(1, "rgba(240,220,180,0.85)");
        ctx.fillStyle = sailGrad; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,-mastH*0.85); ctx.lineTo(-boatW*0.55,-mastH*0.05); ctx.lineTo(0,0); ctx.closePath();
        ctx.fillStyle = "rgba(255,248,235,0.8)"; ctx.fill();
        ctx.restore();
        gulls.forEach(g => {
          g.x = (g.x + g.speed) % 1.15;
          const gx = g.x * W, gy = g.y * H + Math.sin(t * 1.2 + g.phase) * 6;
          const flap = Math.sin(t * 4 + g.phase);
          ctx.beginPath();
          ctx.moveTo(gx - g.size, gy + flap * g.size * 0.4);
          ctx.quadraticCurveTo(gx - g.size*0.4, gy - g.size*0.5, gx, gy);
          ctx.quadraticCurveTo(gx + g.size*0.4, gy - g.size*0.5, gx + g.size, gy + flap * g.size * 0.4);
          ctx.strokeStyle = "rgba(255,248,230,0.7)"; ctx.lineWidth = 1.2; ctx.stroke();
        });
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [isMobile]);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>;
}

function WaveDivider({ flip = false, fill = C.deep, bg = "transparent" }: { flip?: boolean; fill?: string; bg?: string }) {
  return (
    <div style={{ background: bg, lineHeight: 0, transform: flip ? "scaleX(-1)" : "none", marginBottom: "-1px" }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width:"100%", height:"80px", display:"block" }}>
        <path d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1380,20 1440,40 L1440,80 L0,80 Z" fill={fill} opacity="0.6"/>
        <path d="M0,50 C240,10 480,70 720,50 C960,30 1200,70 1440,50 L1440,80 L0,80 Z" fill={fill}/>
      </svg>
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
            <div style={{ fontSize:"11px", letterSpacing:"0.35em", color:C.seafoam, textTransform:"uppercase", marginBottom:"16px" }}>★ 4.99 · 579+ Reviews · USCG Licensed Captain</div>
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
        <div style={{ position:"absolute", bottom:"32px", left:"50%", transform:"translateX(-50%)", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", opacity:0.5, animation:"fadeUp 1s ease 1.2s both" }}>
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
