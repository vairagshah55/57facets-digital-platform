import { useEffect, useRef, useState } from "react";
import bannerVideo from "@/assets/Videos/banne video.mp4";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.05;
      setTextVisible(window.scrollY > threshold);
      setCtaVisible(window.scrollY > window.innerHeight * 0.08);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ height: "110vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* ── Background video ──────────────────────────────────── */}
        <video
          ref={videoRef}
          src={bannerVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            zIndex: 1,
          }}
        />

        {/* ── keyframe CSS ──────────────────────────────────────────── */}
        <style>{`
          @keyframes scrollBar {
            0% { transform: scaleY(0); transform-origin: top; }
            49% { transform: scaleY(1); transform-origin: top; }
            50% { transform: scaleY(1); transform-origin: bottom; }
            100% { transform: scaleY(0); transform-origin: bottom; }
          }
          @media (max-width: 768px) {
            .hero-inner {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 24px !important;
            }
          }
          @media (max-width: 480px) {
            .hero-cta-group {
              flex-direction: column !important;
              width: 100% !important;
            }
            .hero-cta-group a {
              width: 100% !important;
              justify-content: center !important;
            }
          }
        `}</style>

        {/* ── Cinematic overlays ─────────────────────────────────── */}
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

        {/* ── Hero text content ──────────────────────────────────── */}
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
            className="hero-inner"
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

              {/* Subtext */}
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
                  A trusted B2B diamond jewellery partner for retailers across India 
                  and international markets — built on three decades of integrity, 
                  craftsmanship, and excellence
                </p>
              </div>
            </div>

            {/* RIGHT — CTAs */}
            <div
              className="hero-cta-group"
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
              <CtaButton href="#contact" variant="outline">
                Inquire Now
              </CtaButton>
            </div>
          </div>
        </div>

        {/* ── Scroll indicator ──────────────────────────────────── */}
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
              color: "#8A929F",
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

        {/* ── Diagonal watermark ────────────────────────────────── */}
        <div
          aria-hidden="true"
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
