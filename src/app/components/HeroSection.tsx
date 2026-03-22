import { useEffect, useRef, useState } from "react";

// ─── 3D Geometry ─────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function buildDiamond(): { vertices: Vec3[]; faces: number[][] } {
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  const N = 10; // decagonal — more facets for richness

  const apexY = -1.10;
  const crownY = -0.68;
  const girdleY = 0.0;
  const pavY    = 0.52;
  const culetY  = 1.08;
  const crownR  = 0.40;
  const girdleR = 0.64;
  const pavR    = 0.30;

  vertices.push([0, apexY, 0]); // 0: top apex
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * crownR, crownY, Math.sin(a) * crownR]);
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * girdleR, girdleY, Math.sin(a) * girdleR]);
  }
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * pavR, pavY, Math.sin(a) * pavR]);
  }
  vertices.push([0, culetY, 0]); // culet

  const apex   = 0;
  const crown  = (i: number) => 1 + (i % N);
  const girdle = (i: number) => N + 1 + (i % N);
  const pav    = (i: number) => 2 * N + 1 + (i % N);
  const culet  = 3 * N + 1;

  for (let i = 0; i < N; i++) faces.push([apex, crown(i), crown(i + 1)]);
  for (let i = 0; i < N; i++) {
    faces.push([crown(i), girdle(i), girdle(i + 1)]);
    faces.push([crown(i), crown(i + 1), girdle(i + 1)]);
  }
  for (let i = 0; i < N; i++) {
    faces.push([girdle(i), pav(i), girdle(i + 1)]);
    faces.push([pav(i), pav(i + 1), girdle(i + 1)]);
  }
  for (let i = 0; i < N; i++) faces.push([pav(i), culet, pav(i + 1)]);

  return { vertices, faces };
}

function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}
function proj(v: Vec3, fov: number, cx: number, cy: number, sc: number): [number, number, number] {
  const z = v[2] + fov;
  const f = fov / z;
  return [cx + v[0] * f * sc, cy + v[1] * f * sc, z];
}
function fNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u: Vec3 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const w: Vec3 = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
  return [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]];
}
function vDot(a: Vec3, b: Vec3) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

// ─── Gold Diamond Hero Canvas ─────────────────────────────────────────────────

function GoldDiamondHeroCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const mouseRef   = useRef({ x: 0, y: 0 });
  const rotRef     = useRef({ rx: 0.18, ry: 0.0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMouse);

    const { vertices: baseVerts, faces } = buildDiamond();
    const N = 10;

    // Spectral fire colours (prismatic dispersion)
    const FIRE = [
      [255, 80, 80],   // red
      [255,165, 40],   // amber
      [255,220,  0],   // yellow
      [100,220, 80],   // lime
      [ 60,180,255],   // blue
      [180,100,255],   // violet
    ];

    // Particles
    interface Pt { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number; }
    const pts: Pt[] = Array.from({ length: 110 }, () => ({
      x:  (Math.random() - 0.5) * 2.4,
      y:  (Math.random() - 0.5) * 2.4,
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      r:  0.4 + Math.random() * 2.0,
      a:  0.15 + Math.random() * 0.6,
      ph: Math.random() * Math.PI * 2,
    }));

    // Orbiting sparkle dots
    interface Spark { angle: number; dist: number; speed: number; size: number; }
    const sparks: Spark[] = Array.from({ length: 22 }, (_, i) => ({
      angle: (i / 22) * Math.PI * 2,
      dist:  0.52 + Math.random() * 0.30,
      speed: 0.004 + Math.random() * 0.006,
      size:  1 + Math.random() * 2,
    }));

    let tick = 0;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);
      tick += 0.003;

      // Lerp mouse → rotation
      rotRef.current.rx += (mouseRef.current.y * 0.35 + Math.sin(tick * 0.28) * 0.08 - rotRef.current.rx) * 0.04;
      rotRef.current.ry += (mouseRef.current.x * 0.45 + tick - rotRef.current.ry) * 0.04;

      // Diamond center — slightly right-of-center so text has room
      const dcx = W * 0.58;
      const dcy = H * 0.44;
      const sc  = Math.min(W, H) * 0.34;
      const fov = 4.5;

      // ── Deep background ──────────────────────────────────────────────────────
      const bg = ctx!.createRadialGradient(dcx, dcy, 0, dcx, dcy, Math.max(W, H) * 0.75);
      bg.addColorStop(0,   "rgba(4,10,22,0.97)");
      bg.addColorStop(0.3, "rgba(3,7,16,0.97)");
      bg.addColorStop(1,   "rgba(2,4,10,0.97)");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // ── Blue ambient glow behind diamond ────────────────────────────────────
      const glow = ctx!.createRadialGradient(dcx, dcy, 0, dcx, dcy, sc * 1.6);
      glow.addColorStop(0,   "rgba(46,109,164,0.28)");
      glow.addColorStop(0.4, "rgba(30,70,120,0.12)");
      glow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, W, H);

      // ── Secondary teal glow — bottom-left (design-system accent) ─────────────
      const glow2 = ctx!.createRadialGradient(W * 0.15, H * 0.8, 0, W * 0.15, H * 0.8, W * 0.45);
      glow2.addColorStop(0, "rgba(54,192,199,0.10)");
      glow2.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = glow2;
      ctx!.fillRect(0, 0, W, H);

      // ── Ground reflection — subtle oval beneath diamond ───────────────────────
      const refl = ctx!.createRadialGradient(dcx, dcy + sc * 0.9, 0, dcx, dcy + sc * 0.9, sc * 0.55);
      refl.addColorStop(0, "rgba(63,139,195,0.12)");
      refl.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = refl;
      ctx!.fillRect(0, 0, W, H);

      // ── Transform + project vertices ─────────────────────────────────────────
      const transformed = baseVerts.map(v => {
        let r = rotX(v, rotRef.current.rx);
        r = rotY(r, rotRef.current.ry);
        return r;
      });
      const projected = transformed.map(v => proj(v, fov, dcx, dcy, sc));

      // ── Build face data ───────────────────────────────────────────────────────
      const faceData = faces.map(face => {
        const a = transformed[face[0]], b = transformed[face[1]], c = transformed[face[2]];
        const normal = fNormal(a, b, c);
        const len = Math.sqrt(vDot(normal, normal));
        const nn: Vec3 = len > 0 ? [normal[0]/len, normal[1]/len, normal[2]/len] : [0,0,1];
        const light: Vec3 = [-0.45, -0.85, 0.55];
        const ll = Math.sqrt(vDot(light, light));
        const ln: Vec3 = [light[0]/ll, light[1]/ll, light[2]/ll];
        const diffuse  = Math.max(0, vDot(nn, ln));
        const avgZ = (projected[face[0]][2] + projected[face[1]][2] + projected[face[2]][2]) / 3;
        const backfacing = nn[2] > 0;
        return { face, diffuse, avgZ, backfacing };
      });
      faceData.sort((a, b) => b.avgZ - a.avgZ);

      // ── Render faces ─────────────────────────────────────────────────────────
      faceData.forEach(({ face, diffuse, backfacing }) => {
        const vpts = face.map(i => projected[i]);
        const maxV = Math.max(...face);
        const minV = Math.min(...face);
        const isCrown   = maxV <= 2 * N;
        const isPavilion = minV >= 2 * N + 1;

        ctx!.beginPath();
        ctx!.moveTo(vpts[0][0], vpts[0][1]);
        for (let k = 1; k < vpts.length; k++) ctx!.lineTo(vpts[k][0], vpts[k][1]);
        ctx!.closePath();

        let brightness = 0.28 + diffuse * 0.72;
        if (backfacing) brightness *= 0.22;

        const cx1 = vpts.reduce((s, p) => s + p[0], 0) / vpts.length;
        const cy1 = vpts.reduce((s, p) => s + p[1], 0) / vpts.length;

        if (!backfacing && isCrown) {
          const g = ctx!.createRadialGradient(cx1, cy1, 0, cx1, cy1, sc * 0.28);
          g.addColorStop(0, `rgba(200,235,255,${0.95 * brightness})`);
          g.addColorStop(0.45, `rgba(63,139,195,${0.78 * brightness})`);
          g.addColorStop(1, `rgba(22,53,86,${0.45 * brightness})`);
          ctx!.fillStyle = g;
        } else if (!backfacing && isPavilion) {
          const g = ctx!.createRadialGradient(cx1, cy1, 0, cx1, cy1, sc * 0.2);
          g.addColorStop(0, `rgba(46,109,164,${0.80 * brightness})`);
          g.addColorStop(1, `rgba(12,30,60,${0.60 * brightness})`);
          ctx!.fillStyle = g;
        } else if (backfacing) {
          ctx!.fillStyle = `rgba(8,18,42,${0.55})`;
        } else {
          // girdle
          ctx!.fillStyle = `rgba(63,139,195,${0.65 * brightness})`;
        }
        ctx!.fill();

        // ── Prismatic fire overlay on bright crown facets ─────────────────────
        if (!backfacing && isCrown && diffuse > 0.45) {
          const fireIdx = (face[0] * 3 + face[1] * 7) % FIRE.length;
          const [fr, fg, fb] = FIRE[fireIdx];
          const intensity = (diffuse - 0.45) * 0.55;
          const fg2 = ctx!.createRadialGradient(cx1 - sc * 0.02, cy1 - sc * 0.02, 0, cx1, cy1, sc * 0.18);
          fg2.addColorStop(0, `rgba(${fr},${fg},${fb},${intensity})`);
          fg2.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
          ctx!.beginPath();
          ctx!.moveTo(vpts[0][0], vpts[0][1]);
          for (let k = 1; k < vpts.length; k++) ctx!.lineTo(vpts[k][0], vpts[k][1]);
          ctx!.closePath();
          ctx!.fillStyle = fg2;
          ctx!.fill();
        }

        // ── Edges ─────────────────────────────────────────────────────────────
        ctx!.strokeStyle = backfacing
          ? "rgba(30,70,140,0.06)"
          : (isCrown ? "rgba(160,210,255,0.45)" : "rgba(80,160,220,0.25)");
        ctx!.lineWidth = backfacing ? 0.3 : (isCrown ? 0.9 : 0.5);
        ctx!.stroke();
      });

      // ── Specular hot-spots on very bright crown faces ─────────────────────────
      faceData.forEach(({ face, backfacing, diffuse }) => {
        if (backfacing || diffuse < 0.68) return;
        const vpts = face.map(i => projected[i]);
        const cx1 = vpts.reduce((s, p) => s + p[0], 0) / vpts.length;
        const cy1 = vpts.reduce((s, p) => s + p[1], 0) / vpts.length;
        const sp = ctx!.createRadialGradient(cx1 - 5, cy1 - 5, 0, cx1, cy1, 20);
        sp.addColorStop(0, `rgba(255,255,230,${(diffuse - 0.68) * 1.3})`);
        sp.addColorStop(1, "rgba(255,255,230,0)");
        ctx!.beginPath();
        vpts.forEach(p => ctx!.lineTo(p[0], p[1]));
        ctx!.closePath();
        ctx!.fillStyle = sp;
        ctx!.fill();
      });

      // ── Caustic light rays emanating from diamond ─────────────────────────────
      const numRays = 12;
      for (let i = 0; i < numRays; i++) {
        const rayAngle = (i / numRays) * Math.PI * 2 + tick * 0.15;
        const rayLen = sc * (1.0 + Math.sin(tick * 1.5 + i * 0.7) * 0.2);
        const rx0 = dcx + Math.cos(rayAngle) * sc * 0.05;
        const ry0 = dcy + Math.sin(rayAngle) * sc * 0.05;
        const rx1 = dcx + Math.cos(rayAngle) * rayLen;
        const ry1 = dcy + Math.sin(rayAngle) * rayLen;
        const rl = ctx!.createLinearGradient(rx0, ry0, rx1, ry1);
        const alpha = 0.04 + Math.abs(Math.sin(tick * 0.8 + i)) * 0.06;
        rl.addColorStop(0, `rgba(100,180,255,${alpha})`);
        rl.addColorStop(1, "rgba(100,180,255,0)");
        ctx!.beginPath();
        ctx!.moveTo(rx0, ry0);
        ctx!.lineTo(rx1, ry1);
        ctx!.strokeStyle = rl;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // ── 4-point star sparkle at apex vertex ──────────────────────────────────
      const apexPt = projected[0];
      const starSz = sc * 0.07 * (1 + Math.sin(tick * 2.5) * 0.25);
      const starA  = 0.65 + Math.sin(tick * 2.5) * 0.35;

      // Cross arms
      [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]].forEach(([dx, dy]) => {
        const arms = [
          ctx!.createLinearGradient(apexPt[0] - dx * starSz * 2.5, apexPt[1] - dy * starSz * 2.5,
                                    apexPt[0] + dx * starSz * 2.5, apexPt[1] + dy * starSz * 2.5),
        ];
        arms[0].addColorStop(0, "rgba(255,255,220,0)");
        arms[0].addColorStop(0.5, `rgba(255,255,220,${starA})`);
        arms[0].addColorStop(1, "rgba(255,255,220,0)");
        ctx!.beginPath();
        ctx!.moveTo(apexPt[0] - dx * starSz * 2.5, apexPt[1] - dy * starSz * 2.5);
        ctx!.lineTo(apexPt[0] + dx * starSz * 2.5, apexPt[1] + dy * starSz * 2.5);
        ctx!.strokeStyle = arms[0];
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      });

      // Star center dot
      const sdot = ctx!.createRadialGradient(apexPt[0], apexPt[1], 0, apexPt[0], apexPt[1], starSz * 0.6);
      sdot.addColorStop(0, `rgba(255,255,240,${starA})`);
      sdot.addColorStop(1, "rgba(255,255,240,0)");
      ctx!.beginPath();
      ctx!.arc(apexPt[0], apexPt[1], starSz * 0.6, 0, Math.PI * 2);
      ctx!.fillStyle = sdot;
      ctx!.fill();

      // ── Orbiting sparkle ring ─────────────────────────────────────────────────
      sparks.forEach(s => {
        s.angle += s.speed;
        const sx = dcx + Math.cos(s.angle) * sc * s.dist;
        const sy = dcy + Math.sin(s.angle) * sc * s.dist * 0.55; // ellipse
        const fa = 0.2 + Math.abs(Math.sin(s.angle * 2)) * 0.8;
        ctx!.beginPath();
        ctx!.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(212,175,55,${fa * 0.75})`;
        ctx!.fill();
      });

      // ── Gold dust particles ───────────────────────────────────────────────────
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x >  1.3) p.x = -1.3;
        if (p.x < -1.3) p.x =  1.3;
        if (p.y >  1.3) p.y = -1.3;
        if (p.y < -1.3) p.y =  1.3;
        const px = dcx + p.x * W * 0.48;
        const py = dcy + p.y * H * 0.48;
        const flicker = 0.3 + Math.abs(Math.sin(tick * 1.8 + p.ph)) * 0.7;
        const col = Math.random() > 0.75
          ? `rgba(54,192,199,${p.a * flicker * 0.65})`
          : `rgba(63,139,195,${p.a * flicker * 0.70})`;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = col;
        ctx!.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
    />
  );
}

// ─── Reusable pill CTA button ──────────────────────────────────────────────────
function CtaButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "solid" | "outline";
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  const solidBase = {
    backgroundColor: "#FFFFFF",
    color: "#0D1118",
    border: "1px solid #FFFFFF",
  };
  const solidHover = {
    backgroundColor: "#163556",
    color: "#FFFFFF",
    border: "1px solid #1F4A78",
  };
  const outlineBase = {
    backgroundColor: "transparent",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.55)",
  };
  const outlineHover = {
    backgroundColor: "#163556",
    color: "#FFFFFF",
    border: "1px solid #1F4A78",
  };

  const base = variant === "solid" ? solidBase : outlineBase;
  const hover = variant === "solid" ? solidHover : outlineHover;
  const current = hovered ? hover : base;

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 24px",
        borderRadius: "9999px",
        fontFamily: "'General Sans', 'Inter', sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textDecoration: "none",
        whiteSpace: "nowrap",
        transition: "background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease",
        ...current,
      }}
    >
      {children}
    </a>
  );
}

export function HeroSection() {
  const [textVisible, setTextVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  // ── Bidirectional scroll trigger ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.38;
      const isOver = window.scrollY > threshold;
      setTextVisible(isOver);
      // CTA appears slightly after headline
      const ctaThreshold = window.innerHeight * 0.44;
      setCtaVisible(window.scrollY > ctaThreshold);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Trigger once on mount in case page reloads mid-scroll
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    /*
     * 240vh tall wrapper — lets user scroll ~140vh inside the hero
     * before the About section appears. The inner sticky div
     * keeps the video pinned at the top throughout.
     */
    <div style={{ height: "240vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* ── Background: 3D Gold Diamond Canvas ────────────────────── */}
        <GoldDiamondHeroCanvas />

        {/* ── keyframe CSS ──────────────────────────────────────────── */}
        <style>{`
          @keyframes scrollBar {
            0% { transform: scaleY(0); transform-origin: top; }
            49% { transform: scaleY(1); transform-origin: top; }
            50% { transform: scaleY(1); transform-origin: bottom; }
            100% { transform: scaleY(0); transform-origin: bottom; }
          }
        `}</style>

        {/* ── Cinematic overlays (z-index above canvas) ─────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(5,6,8,0.55) 100%)",
          }}
        />
        {/* Bottom gradient — strong, for text legibility */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "65%",
            zIndex: 2,
            background:
              "linear-gradient(to top, rgba(8,10,13,1) 0%, rgba(8,10,13,0.8) 35%, transparent 100%)",
          }}
        />
        {/* Top gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "180px",
            zIndex: 2,
            background:
              "linear-gradient(to bottom, rgba(8,10,13,0.55) 0%, transparent 100%)",
          }}
        />

        {/* ── Hero text content ───────────────��─────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: "0 clamp(32px, 5vw, 80px) clamp(48px, 6vh, 72px)",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "40px",
            }}
          >
            {/* LEFT — Headline + subtext */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
              {/* Headline line 1 */}
              <div
                style={{
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? "translateY(0)" : "translateY(24px)",
                  transition:
                    "opacity 0.85s cubic-bezier(0.22,1,0.36,1) 0.05s, transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.05s",
                }}
              >
                <h1
                  style={{
                    fontFamily: "'Melodrama', 'Georgia', serif",
                    fontSize: "clamp(30px, 5vw, 60px)",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    margin: 0,
                    display: "block",
                  }}
                >
                  Where Every Facet
                </h1>
              </div>

              {/* Headline line 2 — gradient fill */}
              <div
                style={{
                  opacity: textVisible ? 1 : 0,
                  transform: textVisible ? "translateY(0)" : "translateY(30px)",
                  transition:
                    "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.12s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.12s",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Melodrama', 'Georgia', serif",
                    fontSize: "clamp(30px, 5vw, 60px)",
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    display: "block",
                    background:
                      "linear-gradient(95deg, #FFFFFF 0%, #C8E8EC 35%, #30B8BF 70%, #3880BE 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Tells a Story.
                </span>
              </div>

              {/* Subtext below headline, left-aligned */}
              <div
                style={{
                  opacity: ctaVisible ? 1 : 0,
                  transform: ctaVisible ? "translateY(0)" : "translateY(16px)",
                  transition:
                    "opacity 0.85s cubic-bezier(0.22,1,0.36,1) 0.08s, transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.08s",
                }}
              >
                <p
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 400,
                    color: "#A8B0BF",
                    lineHeight: 1.75,
                    margin: 0,
                    maxWidth: "340px",
                  }}
                >
                  A private B2B jewellery platform for the world's most discerning
                  diamond traders, curators, and luxury maisons.
                </p>
              </div>
            </div>

            {/* RIGHT — CTAs only, aligned to bottom */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexShrink: 0,
                opacity: ctaVisible ? 1 : 0,
                transform: ctaVisible ? "translateY(0)" : "translateY(20px)",
                transition:
                  "opacity 0.85s cubic-bezier(0.22,1,0.36,1) 0.15s, transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.15s",
              }}
            >
              <CtaButton href="#collections" variant="solid">
                Explore Collection
              </CtaButton>
              <CtaButton href="#about" variant="outline">
                Our Maison
              </CtaButton>
            </div>
          </div>
        </div>

        {/* ── Scroll indicator — hides when text appears ────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: "8px",
            opacity: textVisible ? 0 : 1,
            transition: "opacity 0.5s ease",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "9px",
              fontWeight: 500,
              color: "#636B7A",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            Scroll
          </span>
          <div
            style={{
              width: "1px",
              height: "44px",
              backgroundColor: "rgba(28,37,53,0.6)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#30B8BF",
                animation: "scrollBar 1.8s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ── Diagonal watermark ────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            pointerEvents: "none",
            userSelect: "none",
            overflow: "hidden",
            opacity: 0.022,
          }}
        >
          <span
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(70px, 14vw, 180px)",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              transform: "rotate(-18deg)",
              whiteSpace: "nowrap",
            }}
          >
            57 FACETS
          </span>
        </div>
      </div>
    </div>
  );
}