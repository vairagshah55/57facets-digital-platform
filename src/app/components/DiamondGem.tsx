import { useEffect, useRef } from "react";

type Vec3 = [number, number, number];

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
}
function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}
function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}
function project(
  v: Vec3,
  fov: number,
  cx: number,
  cy: number,
  sc: number
): [number, number, number] {
  const z = v[2] + fov;
  const f = fov / z;
  return [cx + v[0] * f * sc, cy + v[1] * f * sc, z];
}
function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return cross(sub(b, a), sub(c, a));
}

interface GemFace {
  verts: number[];
  isCrown: boolean;
  isPavilion: boolean;
  isTable: boolean;
}

function buildBrilliant(N: number): { vertices: Vec3[]; faces: GemFace[] } {
  const apexY    = -1.08;
  const tableY   = -0.65;
  const crownY   = -0.44;
  const girdleY  =  0.00;
  const pavY     =  0.52;
  const culetY   =  1.06;
  const tableR   =  0.38;
  const crownR   =  0.60;
  const girdleR  =  0.64;
  const pavR     =  0.32;

  const vertices: Vec3[] = [];

  vertices.push([0, apexY, 0]); // 0: apex

  // table ring
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * tableR, tableY, Math.sin(a) * tableR]);
  }
  // crown ring
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * crownR, crownY, Math.sin(a) * crownR]);
  }
  // girdle ring
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * girdleR, girdleY, Math.sin(a) * girdleR]);
  }
  // pavilion ring
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    vertices.push([Math.cos(a) * pavR, pavY, Math.sin(a) * pavR]);
  }
  vertices.push([0, culetY, 0]); // culet

  const apex   = 0;
  const table  = (i: number) => 1           + (i % N);
  const crown  = (i: number) => N + 1       + (i % N);
  const girdle = (i: number) => 2 * N + 1   + (i % N);
  const pav    = (i: number) => 3 * N + 1   + (i % N);
  const culet  = 4 * N + 1;

  const faces: GemFace[] = [];

  // table star faces
  for (let i = 0; i < N; i++)
    faces.push({ verts: [apex, table(i + 1), table(i)], isCrown: false, isPavilion: false, isTable: true });

  // star facets (table → crown)
  for (let i = 0; i < N; i++)
    faces.push({ verts: [table(i), table(i + 1), crown(i)], isCrown: true, isPavilion: false, isTable: false });

  // bezel facets (crown → girdle)
  for (let i = 0; i < N; i++) {
    faces.push({ verts: [crown(i), girdle(i), girdle(i + 1)], isCrown: true, isPavilion: false, isTable: false });
    faces.push({ verts: [crown(i), girdle(i + 1), crown(i + 1)], isCrown: true, isPavilion: false, isTable: false });
  }

  // pavilion main facets
  for (let i = 0; i < N; i++) {
    faces.push({ verts: [girdle(i), pav(i), girdle(i + 1)], isCrown: false, isPavilion: true, isTable: false });
    faces.push({ verts: [pav(i), pav(i + 1), girdle(i + 1)], isCrown: false, isPavilion: true, isTable: false });
  }

  // pavilion → culet
  for (let i = 0; i < N; i++)
    faces.push({ verts: [pav(i), culet, pav(i + 1)], isCrown: false, isPavilion: true, isTable: false });

  return { vertices, faces };
}

// ── Spectral fire palette ────────────────────────────────────────────────────
const FIRE: [number, number, number][] = [
  [255, 55,  55],   // red
  [255, 145,  0],   // amber
  [255, 225,  0],   // yellow
  [ 70, 220, 65],   // green
  [ 50, 160, 255],  // sky blue
  [150,  70, 255],  // violet
  [255, 110, 190],  // rose
];

// ── Three light sources ──────────────────────────────────────────────────────
const LIGHTS = [
  { dir: normalize([-0.55, -1.0,  0.80] as Vec3), rgb: [255, 255, 255] as [number,number,number], intensity: 0.85 },
  { dir: normalize([ 0.80, -0.35, 0.65] as Vec3), rgb: [170, 210, 255] as [number,number,number], intensity: 0.45 },
  { dir: normalize([ 0.00,  0.80, 0.55] as Vec3), rgb: [ 45,  90, 200] as [number,number,number], intensity: 0.28 },
];

// ── Sparkle dots ─────────────────────────────────────────────────────────────
const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2,
  dist:  0.62 + Math.random() * 0.28,
  speed: 0.003 + Math.random() * 0.005,
  size:  0.8 + Math.random() * 1.8,
}));

export function DiamondGem() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef     = useRef({ x: 0, y: 0 });
  const rotRef       = useRef({ rx: 0.14, ry: 0 });
  const animRef      = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = 16;
    const { vertices: base, faces } = buildBrilliant(N);

    const onMouse = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width  - 0.5) * 2,
        y: ((e.clientY - rect.top)  / rect.height - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMouse);

    let tick = 0;

    function draw() {
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const W   = canvas.offsetWidth;
      const H   = canvas.offsetHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      tick += 0.005;

      // Smooth rotation
      const targetRx = mouseRef.current.y * 0.22 + Math.sin(tick * 0.28) * 0.07;
      const targetRy = mouseRef.current.x * 0.32 + tick * 0.38;
      rotRef.current.rx += (targetRx - rotRef.current.rx) * 0.04;
      rotRef.current.ry += (targetRy - rotRef.current.ry) * 0.04;

      const fov = 4.6;
      const cx  = W / 2;
      const cy  = H / 2;
      const sc  = Math.min(W, H) * 0.37;

      ctx.clearRect(0, 0, W, H);

      // ── Deep background ────────────────────────────────────────────────────
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.85);
      bgGrad.addColorStop(0,   "rgba(6,14,38,0.96)");
      bgGrad.addColorStop(0.5, "rgba(3,8,20,0.97)");
      bgGrad.addColorStop(1,   "rgba(2,4,12,0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Ambient halo ───────────────────────────────────────────────────────
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 1.5);
      halo.addColorStop(0,   "rgba(48,120,190,0.22)");
      halo.addColorStop(0.45,"rgba(28,70,140,0.10)");
      halo.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      // ── Secondary teal glow ────────────────────────────────────────────────
      const teal = ctx.createRadialGradient(cx * 0.6, cy * 1.6, 0, cx * 0.6, cy * 1.6, sc * 0.9);
      teal.addColorStop(0, "rgba(48,184,191,0.10)");
      teal.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = teal;
      ctx.fillRect(0, 0, W, H);

      // ── Transform & project ────────────────────────────────────────────────
      const transformed = base.map(v => {
        let r = rotX(v, rotRef.current.rx);
        r = rotY(r, rotRef.current.ry);
        return r;
      });
      const projected = transformed.map(v => project(v, fov, cx, cy, sc));

      // ── Build face data ────────────────────────────────────────────────────
      const viewDir: Vec3 = [0, 0, 1];

      const faceData = faces.map(face => {
        const vA = transformed[face.verts[0]];
        const vB = transformed[face.verts[1]];
        const vC = transformed[face.verts[2]];
        const rawN = faceNormal(vA, vB, vC);
        const n    = normalize(rawN);
        const backfacing = n[2] > 0;

        // Multi-light diffuse
        let lr = 0, lg2 = 0, lb = 0;
        for (const l of LIGHTS) {
          const d = Math.max(0, dot(n, l.dir));
          lr  += l.rgb[0] * d * l.intensity;
          lg2 += l.rgb[1] * d * l.intensity;
          lb  += l.rgb[2] * d * l.intensity;
        }
        const lightness = Math.min(1, Math.sqrt(lr * lr + lg2 * lg2 + lb * lb) / 380);

        // Phong specular
        const h = normalize([
          LIGHTS[0].dir[0] + viewDir[0],
          LIGHTS[0].dir[1] + viewDir[1],
          LIGHTS[0].dir[2] + viewDir[2],
        ] as Vec3);
        const specular = backfacing ? 0 : Math.pow(Math.max(0, dot(n, h)), 80);

        const avgZ = face.verts.reduce((s, i) => s + projected[i][2], 0) / face.verts.length;

        return { face, n, backfacing, lightness, specular, avgZ };
      });

      faceData.sort((a, b) => b.avgZ - a.avgZ);

      // ── Draw faces ─────────────────────────────────────────────────────────
      faceData.forEach(({ face, backfacing, lightness, specular }) => {
        const pts = face.verts.map(i => projected[i]);
        const fcx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const fcy = pts.reduce((s, p) => s + p[1], 0) / pts.length;

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.closePath();

        // ── Fill ──────────────────────────────────────────────────────────────
        if (backfacing) {
          ctx.fillStyle = `rgba(6,16,50,${0.16 + lightness * 0.10})`;
        } else if (face.isTable) {
          const g = ctx.createRadialGradient(fcx, fcy, 0, fcx, fcy, sc * 0.38);
          g.addColorStop(0,   `rgba(228,246,255,${0.72 * lightness + 0.18})`);
          g.addColorStop(0.45,`rgba(140,205,255,${0.55 * lightness + 0.10})`);
          g.addColorStop(1,   `rgba(35,90,195,${0.38 * lightness})`);
          ctx.fillStyle = g;
        } else if (face.isCrown) {
          const fi  = (face.verts[0] * 3 + face.verts[1] * 7) % FIRE.length;
          const [fr, fg, fb] = FIRE[fi];
          const fireStrength  = Math.max(0, lightness - 0.18) * 1.35;

          const g = ctx.createRadialGradient(fcx - sc*0.04, fcy - sc*0.04, 0, fcx, fcy, sc * 0.32);
          g.addColorStop(0,    `rgba(230,248,255,${0.88 * lightness})`);
          g.addColorStop(0.28, `rgba(${fr},${fg},${fb},${fireStrength * 0.80})`);
          g.addColorStop(0.62, `rgba(55,125,230,${0.48 * lightness})`);
          g.addColorStop(1,    `rgba(18,48,130,${0.32 * lightness})`);
          ctx.fillStyle = g;
        } else {
          // Pavilion front
          const g = ctx.createLinearGradient(fcx, fcy - sc*0.12, fcx, fcy + sc*0.12);
          g.addColorStop(0, `rgba(28,82,210,${0.68 * lightness + 0.05})`);
          g.addColorStop(1, `rgba(6,22,80,${0.52 * lightness})`);
          ctx.fillStyle = g;
        }
        ctx.fill();

        // ── Edge lines ────────────────────────────────────────────────────────
        if (backfacing) {
          ctx.strokeStyle = "rgba(30,60,160,0.04)";
          ctx.lineWidth   = 0.3;
        } else if (face.isTable) {
          ctx.strokeStyle = "rgba(200,238,255,0.35)";
          ctx.lineWidth   = 0.8;
        } else if (face.isCrown) {
          ctx.strokeStyle = `rgba(200,235,255,${0.22 + lightness * 0.18})`;
          ctx.lineWidth   = 0.5;
        } else {
          ctx.strokeStyle = "rgba(70,140,230,0.12)";
          ctx.lineWidth   = 0.4;
        }
        ctx.stroke();

        // ── Specular hot-spot ─────────────────────────────────────────────────
        if (!backfacing && specular > 0.18) {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
          ctx.closePath();
          const sp = ctx.createRadialGradient(fcx - sc*0.04, fcy - sc*0.04, 0, fcx, fcy, sc * 0.14);
          sp.addColorStop(0, `rgba(255,255,252,${Math.min(1, specular * 0.95)})`);
          sp.addColorStop(0.5,`rgba(210,238,255,${specular * 0.45})`);
          sp.addColorStop(1,  "rgba(210,238,255,0)");
          ctx.fillStyle = sp;
          ctx.fill();
        }
      });

      // ── Caustic light rays ────────────────────────────────────────────────
      for (let i = 0; i < 12; i++) {
        const ang  = (i / 12) * Math.PI * 2 + tick * 0.10;
        const rLen = sc * (0.92 + Math.sin(tick * 1.1 + i * 0.75) * 0.14);
        const rl = ctx.createLinearGradient(
          cx + Math.cos(ang) * sc * 0.04,
          cy + Math.sin(ang) * sc * 0.04,
          cx + Math.cos(ang) * rLen,
          cy + Math.sin(ang) * rLen
        );
        const alpha = 0.025 + Math.abs(Math.sin(tick * 0.55 + i)) * 0.055;
        rl.addColorStop(0, `rgba(130,200,255,${alpha})`);
        rl.addColorStop(1, "rgba(130,200,255,0)");
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * sc * 0.04, cy + Math.sin(ang) * sc * 0.04);
        ctx.lineTo(cx + Math.cos(ang) * rLen,      cy + Math.sin(ang) * rLen);
        ctx.strokeStyle = rl;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // ── Orbiting sparkle ring ─────────────────────────────────────────────
      SPARKS.forEach(s => {
        s.angle += s.speed;
        const sx = cx + Math.cos(s.angle) * sc * s.dist;
        const sy = cy + Math.sin(s.angle) * sc * s.dist * 0.52;
        const fa = 0.22 + Math.abs(Math.sin(s.angle * 2.1)) * 0.78;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,230,255,${fa * 0.65})`;
        ctx.fill();
      });

      // ── 4-point apex star sparkle ─────────────────────────────────────────
      const apexPt = projected[0];
      const sSz  = sc * 0.065 * (1 + Math.sin(tick * 2.4) * 0.28);
      const sAlp = 0.72 + Math.sin(tick * 2.4) * 0.28;
      [[1,0],[0,1],[0.707,0.707],[0.707,-0.707]].forEach(([dx, dy]) => {
        const lg = ctx.createLinearGradient(
          apexPt[0] - dx * sSz * 2.6, apexPt[1] - dy * sSz * 2.6,
          apexPt[0] + dx * sSz * 2.6, apexPt[1] + dy * sSz * 2.6,
        );
        lg.addColorStop(0,   "rgba(255,255,245,0)");
        lg.addColorStop(0.5, `rgba(255,255,245,${sAlp})`);
        lg.addColorStop(1,   "rgba(255,255,245,0)");
        ctx.beginPath();
        ctx.moveTo(apexPt[0] - dx * sSz * 2.6, apexPt[1] - dy * sSz * 2.6);
        ctx.lineTo(apexPt[0] + dx * sSz * 2.6, apexPt[1] + dy * sSz * 2.6);
        ctx.strokeStyle = lg;
        ctx.lineWidth   = 1.6;
        ctx.stroke();
      });
      // apex glow dot
      const dot2 = ctx.createRadialGradient(apexPt[0], apexPt[1], 0, apexPt[0], apexPt[1], sSz * 0.7);
      dot2.addColorStop(0, `rgba(255,255,245,${sAlp})`);
      dot2.addColorStop(1, "rgba(255,255,245,0)");
      ctx.beginPath();
      ctx.arc(apexPt[0], apexPt[1], sSz * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = dot2;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
