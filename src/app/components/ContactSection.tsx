import { useEffect, useRef, useState } from "react";
import { AmbientOrbs } from "./AmbientOrbs";

// ─── 3D Diamond Geometry ────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function buildDiamond(): { vertices: Vec3[]; faces: number[][] } {
  const vertices: Vec3[] = [];
  const faces: number[][] = [];
  const N = 8;

  const apexY = -1.08;
  const crownY = -0.72;
  const girdleY = 0.0;
  const pavY = 0.55;
  const culetY = 1.05;
  const crownR = 0.38;
  const girdleR = 0.60;
  const pavR = 0.32;

  vertices.push([0, apexY, 0]);
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
  vertices.push([0, culetY, 0]);

  const apex = 0;
  const crown = (i: number) => 1 + (i % N);
  const girdle = (i: number) => N + 1 + (i % N);
  const pav = (i: number) => 2 * N + 1 + (i % N);
  const culet = 3 * N + 1;

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

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}
function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}
function project(v: Vec3, fov: number, cx: number, cy: number, scale: number): [number, number, number] {
  const z = v[2] + fov;
  const factor = fov / z;
  return [cx + v[0] * factor * scale, cy + v[1] * factor * scale, z];
}
function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u: Vec3 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const w: Vec3 = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
  return [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]];
}
function dot(a: Vec3, b: Vec3) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

// ─── Diamond Canvas ───────────────────────────────────────────────────────────

function DiamondCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ rx: 0.18, ry: 0.0 });
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { vertices: baseVerts, faces } = buildDiamond();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouse.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    let autoAngle = 0;

    function draw() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      autoAngle += 0.004;
      const targetRx = mouse.current.y * 0.45 + Math.sin(autoAngle * 0.4) * 0.1;
      const targetRy = mouse.current.x * 0.55 + autoAngle;
      rotation.current.rx += (targetRx - rotation.current.rx) * 0.06;
      rotation.current.ry += (targetRy - rotation.current.ry) * 0.06;

      const fov = 4.2;
      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.38;

      const transformed = baseVerts.map((v) => {
        let r = rotateX(v, rotation.current.rx);
        r = rotateY(r, rotation.current.ry);
        return r;
      });
      const projected = transformed.map((v) => project(v, fov, cx, cy, scale));

      const faceData = faces.map((face) => {
        const a = transformed[face[0]];
        const b = transformed[face[1]];
        const c = transformed[face[2]];
        const normal = faceNormal(a, b, c);
        const len = Math.sqrt(dot(normal, normal));
        const nNorm: Vec3 = len > 0 ? [normal[0]/len, normal[1]/len, normal[2]/len] : [0, 0, 1];
        const light: Vec3 = [-0.4, -0.8, 0.5];
        const lLen = Math.sqrt(dot(light, light));
        const lNorm: Vec3 = [light[0]/lLen, light[1]/lLen, light[2]/lLen];
        const diffuse = Math.max(0, dot(nNorm, lNorm));
        const avgZ = (projected[face[0]][2] + projected[face[1]][2] + projected[face[2]][2]) / 3;
        const backfacing = nNorm[2] > 0;
        return { face, diffuse, avgZ, backfacing, normal: nNorm };
      });

      faceData.sort((a, b) => b.avgZ - a.avgZ);

      const glowGrad = ctx.createRadialGradient(cx, cy + scale * 0.2, 0, cx, cy, scale * 0.9);
      glowGrad.addColorStop(0, "rgba(46,109,164,0.12)");
      glowGrad.addColorStop(0.5, "rgba(46,109,164,0.05)");
      glowGrad.addColorStop(1, "rgba(46,109,164,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);

      const goldColors = [
        "#3F8BC3", "#5AABDE", "#2E6DA4", "#6BC1E8", "#1A5280",
        "#36C0C7", "#4A9AD4", "#2A7FB8", "#7DD4F0",
      ];

      faceData.forEach(({ face, diffuse, backfacing }) => {
        const pts = face.map((i) => projected[i]);
        const minVIdx = Math.min(...face);
        const maxVIdx = Math.max(...face);
        const NF = 8;
        const isCrown = maxVIdx <= 2 * NF;
        const isPavilion = minVIdx >= 2 * NF + 1;
        const baseIdx = Math.abs(face[0] + face[1]) % goldColors.length;
        void baseIdx; // suppress unused warning

        let brightness = 0.25 + diffuse * 0.75;
        if (backfacing) brightness *= 0.35;

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.closePath();

        if (!backfacing && isCrown) {
          const cx1 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy1 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          const grad = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, scale * 0.25);
          grad.addColorStop(0, `rgba(180,225,255,${0.55 * brightness})`);
          grad.addColorStop(0.5, `rgba(63,139,195,${0.45 * brightness})`);
          grad.addColorStop(1, `rgba(20,70,130,${0.3 * brightness})`);
          ctx.fillStyle = grad;
        } else if (!backfacing && isPavilion) {
          ctx.fillStyle = `rgba(18,60,120,${0.65 * brightness})`;
        } else if (backfacing) {
          ctx.fillStyle = `rgba(8,16,40,0.25)`;
        } else {
          ctx.fillStyle = `rgba(46,109,164,${0.5 * brightness})`;
        }

        ctx.fill();
        ctx.strokeStyle = backfacing ? "rgba(46,109,164,0.06)" : "rgba(100,190,240,0.22)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      faceData.forEach(({ face, backfacing, diffuse }) => {
        if (backfacing || diffuse < 0.65) return;
        const pts = face.map((i) => projected[i]);
        const cx1 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy1 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const specular = ctx.createRadialGradient(cx1 - 4, cy1 - 4, 0, cx1, cy1, 16);
        specular.addColorStop(0, `rgba(200,235,255,${(diffuse - 0.65) * 0.7})`);
        specular.addColorStop(1, "rgba(200,235,255,0)");
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.closePath();
        ctx.fillStyle = specular;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: "50%",
          transform: "translate(-50%,-50%)",
          width: "340px",
          height: "340px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(46,109,164,0.12) 0%, rgba(46,109,164,0.04) 50%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

// ─── Floating Label Input ────────────────────────────────────────────────────

function FloatingInput({
  label,
  type = "text",
  name,
  id,
  value,
  onChange,
  textarea = false,
  required = false,
}: {
  label: string;
  type?: string;
  name: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  textarea?: boolean;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${focused ? "#3F8BC3" : "rgba(63,139,195,0.28)"}`,
    outline: "none",
    color: "#F0EDE8",
    fontFamily: "'General Sans', 'Inter', sans-serif",
    fontSize: "15px",
    fontWeight: 400,
    padding: "22px 0 8px",
    resize: "none",
    transition: "border-color 0.3s ease",
  };

  return (
    <div style={{ position: "relative", marginBottom: "32px" }}>
      <label
        htmlFor={id}
        style={{
          position: "absolute",
          left: 0,
          top: lifted ? "2px" : "22px",
          fontFamily: "'General Sans', 'Inter', sans-serif",
          fontSize: lifted ? "11px" : "14px",
          fontWeight: lifted ? 600 : 400,
          letterSpacing: lifted ? "0.14em" : "0.04em",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.85)",
          pointerEvents: "none",
          transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {label}
        {required && <span aria-hidden="true" style={{ color: "#36C0C7", marginLeft: "3px" }}>*</span>}
      </label>

      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          rows={3}
          required={required}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={sharedStyle}
          aria-required={required}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          required={required}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={sharedStyle}
          aria-required={required}
        />
      )}

      {/* Focus underline accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: focused ? "100%" : "0%",
          height: "1px",
          backgroundColor: "#3F8BC3",
          transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

export function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      aria-label="Contact and inquiry form"
      style={{
        backgroundColor: "#080A0D",
        padding: "96px clamp(24px, 6vw, 80px)",
        position: "relative",
        overflow: "hidden",

        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(36px)",
        transition: "opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <AmbientOrbs variant="mixed" />
      {/* Background grid texture */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(46,109,164,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46,109,164,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          pointerEvents: "none",
        }}
      />


      {/* Corner ornaments */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", top: "40px", left: "clamp(24px,6vw,80px)", opacity: 0.18 }}
        width="48" height="48" viewBox="0 0 48 48" fill="none"
      >
        <path d="M0 48 L0 0 L48 0" stroke="#3F8BC3" strokeWidth="1" fill="none" />
      </svg>
      <svg
        aria-hidden="true"
        style={{ position: "absolute", top: "40px", right: "clamp(24px,6vw,80px)", opacity: 0.18 }}
        width="48" height="48" viewBox="0 0 48 48" fill="none"
      >
        <path d="M48 48 L48 0 L0 0" stroke="#3F8BC3" strokeWidth="1" fill="none" />
      </svg>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          className="contact-flex"
          style={{
            display: "flex",
            gap: "clamp(40px, 6vw, 80px)",
            alignItems: "center",
          }}
        >
          {/* ── LEFT: 3D Diamond ─────────────────────────────── */}
          <div
            className="contact-left"
            style={{
              flex: "1 1 45%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "520px",
            }}
          >
            <div style={{ width: "100%", maxWidth: "440px", aspectRatio: "1/1" }}>
              <DiamondCanvas />
            </div>

            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <p
                style={{
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                }}
              >
                57 Facets · Private Inquiry
              </p>
            </div>
          </div>

          {/* ── RIGHT: Form ───────────────────────────────────── */}
          <div
            className="contact-right"
            style={{ flex: "1 1 50%", maxWidth: "540px" }}
          >
            {/* Heading — consistent with rest of site */}
            <h2
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(34px, 3.8vw, 56px)",
                fontWeight: 500,
                color: "#F0EDE8",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                margin: "0 0 10px",
              }}
            >
              Begin the{" "}
              <span className="gradient-text">Conversation.</span>
            </h2>

            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.05vw, 15px)",
                fontWeight: 400,
                color: "#8A929F",
                lineHeight: 1.75,
                margin: "0 0 48px",
                maxWidth: "380px",
              }}
            >
              Every exceptional stone deserves a dedicated dialogue. Share your
              requirements and our specialists will respond within 24 hours.
            </p>

            {submitted ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: "40px 32px",
                  border: "1px solid rgba(46,109,164,0.22)",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ marginBottom: "20px" }}>
                  <polygon points="20,2 38,20 20,38 2,20" stroke="#3F8BC3" strokeWidth="1.2" fill="rgba(46,109,164,0.08)" />
                  <path d="M13 20.5 L18 25.5 L27 15" stroke="#3F8BC3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p
                  style={{
                    fontFamily: "'Melodrama', 'Georgia', serif",
                    fontSize: "22px",
                    fontWeight: 500,
                    color: "#F0EDE8",
                    margin: "0 0 8px",
                  }}
                >
                  Inquiry Received
                </p>
                <p
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "14px",
                    color: "#8A929F",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  A 57 Facets specialist will be in touch within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <FloatingInput label="Full Name" id="contact-name" name="name" value={form.name} onChange={handleChange} required />
                  <FloatingInput label="Company / House" id="contact-company" name="company" value={form.company} onChange={handleChange} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <FloatingInput label="Email Address" type="email" id="contact-email" name="email" value={form.email} onChange={handleChange} required />
                  <FloatingInput label="Phone Number" type="tel" id="contact-phone" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <FloatingInput label="Your Inquiry" id="contact-message" name="message" value={form.message} onChange={handleChange} textarea />

                <button
                  type="submit"
                  onMouseEnter={() => setBtnHovered(true)}
                  onMouseLeave={() => setBtnHovered(false)}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "14px 32px",
                    borderRadius: "9999px",
                    border: btnHovered ? "1px solid #1F4A78" : "1px solid #FFFFFF",
                    backgroundColor: btnHovered ? "#163556" : "#FFFFFF",
                    color: btnHovered ? "#FFFFFF" : "#0D1118",
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Send Inquiry
                </button>

                <p
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.35)",
                    textAlign: "center",
                    marginTop: "16px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Strictly confidential. By appointment only.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>


      <style>{`
        @media (max-width: 900px) {
          .contact-flex {
            flex-direction: column !important;
            gap: 56px !important;
          }
          .contact-left {
            min-height: 340px !important;
          }
          .contact-right {
            max-width: 100% !important;
            width: 100%;
          }
        }
        @media (max-width: 520px) {
          .contact-flex form > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
