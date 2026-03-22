import { useEffect, useRef, useState } from "react";
import { RingViewer } from "./RingViewer";

export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{
        backgroundColor: "#080A0D",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <div
        className="about-inner"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "clamp(80px, 10vw, 136px) clamp(24px, 6vw, 80px)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(40px, 6vw, 80px)",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* ── Left: Text ────────────────────────────────────────────────── */}
        <div
          className="about-text"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(20px, 3vw, 36px)",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(18px)",
              transition:
                "opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0s",
            }}
          >
            <div
              style={{ width: "32px", height: "1px", backgroundColor: "#2E6DA4" }}
            />
            <span
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.22em",
                color: "#3F8BC3",
                textTransform: "uppercase",
              }}
            >
              About Us
            </span>
          </div>

          {/* Headlines */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(28px)",
              transition:
                "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.08s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.08s",
            }}
          >
            <p
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(32px, 4.5vw, 64px)",
                fontWeight: 500,
                color: "#f4f4f4",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                margin: "0 0 0.12em",
              }}
            >
              Precision is the Point.
            </p>
            <p
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(32px, 4.5vw, 64px)",
                fontWeight: 500,
                color: "#f4f4f4",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Every Diamond Has{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #3F8BC3 0%, #36C0C7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                57 Facets.
              </span>
            </p>
          </div>

          {/* Body paragraphs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(16px, 2vw, 24px)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s",
            }}
          >
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 400,
                color: "#9ba2ad",
                lineHeight: 1.73,
                margin: 0,
              }}
            >
              For over three decades, 57 Facets has stood as a symbol of trust,
              legacy, and excellence in the world of fine diamond jewellery.
              Based in Mumbai, we proudly supply retailers across India and
              international markets, offering jewellery that blends modern design
              innovation with exceptional craftsmanship and integrity. We have
              our offices in Mumbai and St. Louis (USA).
            </p>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 400,
                color: "#9ba2ad",
                lineHeight: 1.73,
                margin: 0,
              }}
            >
              From timeless solitaires to contemporary statement pieces, every
              jewel is created to global export standards, with uncompromising
              finishing, transparency in pricing, and reliable logistics. Our
              long-standing relationships with reputed jewellers are built not
              just on diamonds, but on the values of honesty, consistency, and
              mutual respect.
            </p>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 400,
                color: "#9ba2ad",
                lineHeight: 1.73,
                margin: 0,
              }}
            >
              We carry forward a vision that balances heritage with innovation,
              ensuring that every client experiences not just jewellery, but a
              relationship built on transparency, values, and brilliance. At 57
              Facets, we don't just deliver jewellery — we deliver trust,
              long-term partnerships, and brilliance that lasts generations.
            </p>
          </div>
        </div>

        {/* ── Right: 3D Ring Canvas ──────────────────────────────────────── */}
        <div
          className="about-canvas"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            minHeight: "clamp(400px, 55vh, 700px)",
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            background:
              "radial-gradient(ellipse at 60% 40%, rgba(46,109,164,0.10) 0%, rgba(8,10,13,0) 70%)",
          }}
        >
          <RingViewer />
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .about-inner {
            flex-direction: column !important;
          }
          .about-canvas {
            width: 100% !important;
            min-height: clamp(320px, 60vw, 480px) !important;
          }
        }
      `}</style>
    </section>
  );
}
