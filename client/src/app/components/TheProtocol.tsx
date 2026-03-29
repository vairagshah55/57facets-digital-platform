import { useEffect, useRef, useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
function ApplyIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {/* Document body */}
      <path
        d="M11 2H3.5A.5.5 0 003 2.5V16a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V6L11 2z"
        fill={color}
        fillOpacity="0.15"
      />
      {/* Folded corner */}
      <path d="M11 2v3.5a.5.5 0 00.5.5H15L11 2z" fill={color} fillOpacity="0.55" />
      {/* Full shape filled */}
      <path
        d="M11 2H3.5A.5.5 0 003 2.5V16a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V6L11 2z"
        fill={color}
        fillOpacity="0.18"
      />
      <path d="M11 2v3.5a.5.5 0 00.5.5H15L11 2z" fill={color} />
      {/* Lines */}
      <rect x="5.5" y="8" width="7" height="1.2" rx="0.6" fill={color} />
      <rect x="5.5" y="11" width="4.5" height="1.2" rx="0.6" fill={color} />
    </svg>
  );
}

function ShieldCheckIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {/* Shield filled */}
      <path
        d="M9 1.5L2.5 4.5V9c0 3.9 2.9 7 6.5 7.5C12.6 16 15.5 12.9 15.5 9V4.5L9 1.5z"
        fill={color}
      />
      {/* Check mark in white/contrast */}
      <path
        d="M6 9l2 2 4-4"
        stroke="#080A0D"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TerminalIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {/* Screen filled */}
      <rect x="1.5" y="3" width="15" height="12" rx="1.5" fill={color} />
      {/* Prompt caret in dark contrast */}
      <path
        d="M4.5 7L7 9l-2.5 2"
        stroke="#080A0D"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cursor line in dark contrast */}
      <rect x="9.5" y="11.9" width="4" height="1.2" rx="0.6" fill="#080A0D" />
    </svg>
  );
}

// ─── Step card with hover state ───────────────────────────────────────────────
interface StepData {
  number: string;
  title: string;
  body: string;
  status: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  icon: React.ReactNode;
}

function StepCard({ step }: { step: StepData }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: hovered ? "#0D1118" : "transparent",
        border: `1px solid ${hovered ? step.accentBorder : "#1C2535"}`,
        borderLeft: `2px solid ${hovered ? step.accentColor : "#1C2535"}`,
        borderRadius: "12px",
        padding: "24px 28px 24px 28px",
        cursor: "default",
        transition:
          "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: hovered
          ? `0 0 32px rgba(0,0,0,0.4), inset 0 0 0 1px ${step.accentBorder}`
          : "none",
        overflow: "hidden",
      }}
    >
      {/* Ghost step number */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "-8px",
          top: "-20px",
          fontFamily: "'Melodrama', 'Georgia', serif",
          fontSize: "108px",
          fontWeight: 800,
          color: "#FFFFFF",
          opacity: hovered ? 0.045 : 0.025,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          pointerEvents: "none",
          userSelect: "none",
          transition: "opacity 0.3s ease",
        }}
      >
        {step.number}
      </div>

      {/* Top row: icon + status pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        {/* Icon container */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: step.accentBg,
            border: `1px solid ${step.accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {step.icon}
        </div>

        {/* Status pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "9999px",
            backgroundColor: step.accentBg,
            border: `1px solid ${step.accentBorder}`,
          }}
        >
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: step.accentColor,
              boxShadow: `0 0 6px ${step.accentColor}`,
            }}
          />
          <span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: step.accentColor,
            }}
          >
            {step.status}
          </span>
        </div>
      </div>

      {/* Step title */}
      <h3
        style={{
          fontFamily: "'Google Sans', sans-serif",
          fontSize: "17px",
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          margin: "0 0 10px",
        }}
      >
        {step.title}
      </h3>

      {/* Body copy */}
      <p
        style={{
          fontFamily: "'General Sans', 'Inter', sans-serif",
          fontSize: "13px",
          fontWeight: 400,
          color: "#A8B0BF",
          lineHeight: 1.75,
          margin: 0,
          maxWidth: "480px",
        }}
      >
        {step.body}
      </p>
    </div>
  );
}

// ─── CTA button (matches hero pill style) ─────────────────────────────────────
function SubmitCta() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#apply"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 32px",
        borderRadius: "9999px",
        fontFamily: "'General Sans', 'Inter', sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        textDecoration: "none",
        backgroundColor: hovered ? "#163556" : "#FFFFFF",
        color: hovered ? "#FFFFFF" : "#0D1118",
        border: hovered ? "1px solid #1F4A78" : "1px solid #FFFFFF",
        transition: "background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease",
        whiteSpace: "nowrap" as const,
      }}
    >
      Submit Application
    </a>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
const STEPS: StepData[] = [
  {
    number: "01",
    title: "Apply",
    body: "Submit your trade credentials and business profile through our secure intake form. Every application is reviewed personally by our team — no automated filters, no exceptions.",
    status: "INTAKE OPEN",
    accentColor: "#30B8BF",
    accentBg: "rgba(48,184,191,0.07)",
    accentBorder: "rgba(48,184,191,0.22)",
    icon: <ApplyIcon color="#30B8BF" />,
  },
  {
    number: "02",
    title: "Get Verified",
    body: "Our compliance team validates your trade license, professional references, and transaction history within 48–72 hours. Manual review, zero exceptions.",
    status: "48–72 HRS",
    accentColor: "#3880BE",
    accentBg: "rgba(56,128,190,0.07)",
    accentBorder: "rgba(56,128,190,0.22)",
    icon: <ShieldCheckIcon color="#3880BE" />,
  },
  {
    number: "03",
    title: "Access the Terminal",
    body: "Receive your private access credentials. Browse live inventory, request GIA certificates, and transact directly with 57 Facets — no intermediaries, no delays.",
    status: "IMMEDIATE ACCESS",
    accentColor: "#2660A0",
    accentBg: "rgba(38,96,160,0.07)",
    accentBorder: "rgba(38,96,160,0.22)",
    icon: <TerminalIcon color="#2660A0" />,
  },
];

export function TheProtocol() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [lineDrawn, setLineDrawn] = useState(false);
  const [stepsVisible, setStepsVisible] = useState([false, false, false]);
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Trigger line draw when section enters view
    if (sectionRef.current) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setLineDrawn(true);
        },
        { threshold: 0.08 }
      );
      obs.observe(sectionRef.current);
      observers.push(obs);
    }

    // Stagger-reveal each step card
    stepRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setStepsVisible((prev) => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, i * 160);
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(ref.current);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        backgroundColor: "#080A0D",
        padding: "120px clamp(32px, 5vw, 80px) 120px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Top divider ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "clamp(32px, 5vw, 80px)",
          right: "clamp(32px, 5vw, 80px)",
          height: "1px",
          background:
            "linear-gradient(to right, transparent, #1C2535 20%, #1C2535 80%, transparent)",
        }}
      />

      {/* ── Background facet geometry ────────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.04,
          pointerEvents: "none",
        }}
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="proto-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#30B8BF" stopOpacity="0" />
            <stop offset="50%" stopColor="#30B8BF" stopOpacity="1" />
            <stop offset="100%" stopColor="#30B8BF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="720" y1="0" x2="0" y2="450" stroke="url(#proto-grad)" strokeWidth="0.8" />
        <line x1="720" y1="0" x2="1440" y2="450" stroke="url(#proto-grad)" strokeWidth="0.8" />
        <line x1="720" y1="0" x2="720" y2="900" stroke="url(#proto-grad)" strokeWidth="0.5" />
        <line x1="0" y1="450" x2="720" y2="900" stroke="url(#proto-grad)" strokeWidth="0.5" />
        <line x1="1440" y1="450" x2="720" y2="900" stroke="url(#proto-grad)" strokeWidth="0.5" />
        <line x1="360" y1="0" x2="0" y2="450" stroke="url(#proto-grad)" strokeWidth="0.3" />
        <line x1="1080" y1="0" x2="1440" y2="450" stroke="url(#proto-grad)" strokeWidth="0.3" />
      </svg>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Section header */}
        <div style={{ marginBottom: "72px", textAlign: "center" }}>
          {/* Eyebrow */}
          

          {/* Headline */}
          <h2
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(30px, 4vw, 50px)",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 16px",
            }}
          >
            Access by{" "}
            <span
              style={{
                background:
                  "linear-gradient(95deg, #FFFFFF 0%, #C8E8EC 35%, #30B8BF 70%, #3880BE 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Invitation Only
            </span>
          </h2>

          {/* Subtext */}
          <p
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 400,
              color: "#636B7A",
              lineHeight: 1.75,
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            57 Facets operates on a closed B2B model. Every relationship begins
            with a verified trade identity.
          </p>
        </div>

        {/* Steps flow */}
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Vertical connecting line */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "43px",
              top: "18px",
              bottom: "18px",
              width: "1px",
              backgroundColor: "#1C2535",
              zIndex: 0,
              overflow: "hidden",
            }}
          >
            {/* Animated teal fill */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, #30B8BF 0%, #3880BE 50%, #2660A0 100%)",
                transformOrigin: "top center",
                transform: lineDrawn ? "scaleY(1)" : "scaleY(0)",
                transition: "transform 2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s",
              }}
            />
          </div>

          {/* Step rows */}
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              ref={stepRefs[i]}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0",
                marginBottom: i < STEPS.length - 1 ? "32px" : "0",
                opacity: stepsVisible[i] ? 1 : 0,
                transform: stepsVisible[i] ? "translateY(0)" : "translateY(22px)",
                transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s`,
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Left gutter — dot */}
              <div
                style={{
                  width: "88px",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: "28px",
                  gap: "8px",
                }}
              >
                {/* Outer ring + dot */}
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: `1px solid ${step.accentColor}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 12px ${step.accentColor}40`,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: step.accentColor,
                      boxShadow: `0 0 8px ${step.accentColor}`,
                    }}
                  />
                </div>
              </div>

              {/* Card */}
              <StepCard step={step} />
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "72px",
            gap: "12px",
          }}
        >
          <SubmitCta />
          <span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "11px",
              color: "#636B7A",
              letterSpacing: "0.06em",
            }}
          >
            Applications reviewed within 5 business days
          </span>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </section>
  );
}