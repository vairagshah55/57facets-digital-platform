import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 2000);
    const t3 = setTimeout(() => onComplete(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#080A0D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.5s cubic-bezier(0.4,0,1,1)" : "none",
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* Ambient glow behind diamond */}
      <div
        style={{
          position: "absolute",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(54,192,199,0.12) 0%, transparent 70%)",
          animation: "orb-pulse 2.4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Diamond SVG — stroke-draw animation */}
      <div
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.85)" : "scale(1)",
          transition: "opacity 0.5s ease 0.1s, transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s",
          animation: phase !== "enter" ? "diamond-glow-pulse 2.5s ease-in-out infinite" : "none",
        }}
      >
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer octagon */}
          <polygon
            points="36,4 60,18 64,36 60,54 36,68 12,54 8,36 12,18"
            stroke="#36C0C7"
            strokeWidth="1.4"
            fill="none"
            strokeDasharray="400"
            strokeLinecap="round"
            style={{ animation: "diamond-draw 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
          />
          {/* Inner facet lines */}
          <polygon
            points="36,14 54,24 56,36 54,48 36,58 18,48 16,36 18,24"
            stroke="#3F8BC3"
            strokeWidth="0.8"
            fill="none"
            strokeDasharray="400"
            strokeLinecap="round"
            style={{ animation: "diamond-draw 1.4s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
          />
          {/* Cross lines */}
          <line x1="36" y1="4"  x2="36" y2="68" stroke="#2E6DA4" strokeWidth="0.5" strokeOpacity="0.5"
            strokeDasharray="400"
            style={{ animation: "diamond-draw 1.2s ease 0.7s both" }}
          />
          <line x1="8"  y1="36" x2="64" y2="36" stroke="#2E6DA4" strokeWidth="0.5" strokeOpacity="0.5"
            strokeDasharray="400"
            style={{ animation: "diamond-draw 1.2s ease 0.7s both" }}
          />
          {/* Centre dot */}
          <circle cx="36" cy="36" r="2.5" fill="#36C0C7"
            style={{ animation: "loader-fade-up 0.4s ease 1.1s both" }}
          />
        </svg>
      </div>

      {/* Brand name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(12px)" : "translateY(0)",
          transition: "opacity 0.55s ease 0.6s, transform 0.55s cubic-bezier(0.22,1,0.36,1) 0.6s",
        }}
      >
        <span
          style={{
            fontFamily: "'Melodrama', 'Georgia', serif",
            fontSize: "28px",
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: "#f4f4f4",
            textTransform: "uppercase",
          }}
        >
          57 Facets
        </span>
        <span
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "10px",
            fontWeight: 400,
            letterSpacing: "0.3em",
            color: "#3F8BC3",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          Fine Diamond Jewellery
        </span>
      </div>

      {/* Loading dots */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.4s ease 0.9s",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: "#3F8BC3",
              animation: `loader-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Scan line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(54,192,199,0.25) 30%, rgba(54,192,199,0.25) 70%, transparent)",
          animation: "scan-line 2s linear infinite",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
