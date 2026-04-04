import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { AmbientOrbs } from "./AmbientOrbs";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

import bracelatesImg from "@/assets/Images/bracelates.jpg";
import banglesImg from "@/assets/Images/bengals.jpg";

const ringsGlob = import.meta.glob("/src/assets/Rings/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const rings1Glob = import.meta.glob("/src/assets/Rings_1/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const necklaceGlob = import.meta.glob("/src/assets/Necklace/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const necklace1Glob = import.meta.glob("/src/assets/Necklace_1/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const earringsGlob = import.meta.glob("/src/assets/Earrings/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const pendantsGlob = import.meta.glob("/src/assets/Pendants/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const CATEGORY_IMAGES: Record<string, string[]> = {
  rings: [...Object.values(ringsGlob), ...Object.values(rings1Glob)],
  necklaces: [...Object.values(necklaceGlob), ...Object.values(necklace1Glob)],
  earrings: Object.values(earringsGlob),
  pendants: Object.values(pendantsGlob),
  bracelets: [bracelatesImg],
  bangles: [banglesImg],
};

const TABS = [
  { key: "rings",     label: "Rings",     descriptor: "Symbols of love and commitment" },
  { key: "necklaces", label: "Necklaces", descriptor: "A statement of grace and heritage" },
  { key: "earrings",  label: "Earrings",  descriptor: "Effortless radiance, every angle" },
  { key: "bracelets", label: "Bracelets", descriptor: "Diamond-set, timelessly worn" },
  { key: "pendants",  label: "Pendants",  descriptor: "Close to the heart, far above the rest" },
  { key: "bangles",   label: "Bangles",   descriptor: "Stacked elegance, wrist-worn brilliance" },
];

function ImageCard({ src, alt, delay }: { src: string; alt: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setCtaHovered(false); }}
      className="card-shimmer-wrap"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "8px",
        border: `1px solid ${hovered ? "#2E6DA4" : "#1a2a3f"}`,
        backgroundColor: "#0D1118",
        transition: `border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        boxShadow: hovered ? "0 8px 40px rgba(46,109,164,0.18)" : "none",
        aspectRatio: "4 / 5",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(36px)",
        cursor: "default",
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "2px",
          background: "linear-gradient(to right, #2E6DA4, #30B8BF, transparent)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.35s ease",
          zIndex: 3,
        }}
      />

      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.65s cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Dark gradient overlay — deepens on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: hovered
            ? "linear-gradient(to top, rgba(8,10,13,0.85) 0%, rgba(8,10,13,0.18) 55%, transparent 100%)"
            : "linear-gradient(to top, rgba(8,10,13,0.55) 0%, transparent 60%)",
          transition: "background 0.4s ease",
          zIndex: 1,
        }}
      />

      {/* Inquire Now CTA — slides up on hover */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          right: "16px",
          zIndex: 2,
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          pointerEvents: hovered ? "auto" : "none",
        }}
      >
        <a
          href="/#contact"
          aria-label="Inquire Now"
          onClick={(e) => { e.preventDefault(); navigate("/", { state: { scrollToContact: true } }); }}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "12px",
            borderRadius: "9999px",
            backgroundColor: ctaHovered ? "#163556" : "#FFFFFF",
            border: `1px solid ${ctaHovered ? "#1F4A78" : "#FFFFFF"}`,
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: ctaHovered ? "#FFFFFF" : "#0D1118",
            textDecoration: "none",
            transition: "background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease",
          }}
        >
          Inquire Now
        </a>
      </div>
    </div>
  );
}

export function CategoryGallery() {
  const { name } = useParams<{ name: string }>();
  const [pageVisible, setPageVisible] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(false);

  const key = name?.toLowerCase() ?? "";
  const activeTab = TABS.find((t) => t.key === key) ?? TABS[0];
  const images = CATEGORY_IMAGES[activeTab.key] ?? [];

  // Scroll to top instantly on mount (bypasses css scroll-behavior: smooth)
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = '';
  }, []);

  // Page fade-in on mount
  useEffect(() => {
    const t1 = setTimeout(() => setPageVisible(true), 30);
    const t2 = setTimeout(() => setHeadingVisible(true), 120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Re-trigger heading animation on tab change
  useEffect(() => {
    setHeadingVisible(false);
    const t = setTimeout(() => setHeadingVisible(true), 80);
    return () => clearTimeout(t);
  }, [activeTab.key]);

  return (
    <>
      {/* ── Navbar — fixed, completely outside any stacking context ── */}
      <Navbar />

      {/* ── Outer shell — provides background + offsets content below fixed Navbar ── */}
      <div
        style={{
          backgroundColor: "#080A0D",
          minHeight: "100vh",
          fontFamily: "'General Sans', 'Inter', sans-serif",
          paddingTop: "80px", // equal to Navbar h-20
        }}
      >
        {/* ── Sticky tabs bar — lives outside the opacity wrapper so sticky isn't broken ── */}
        <div
          style={{
            position: "sticky",
            top: "80px",
            zIndex: 40,
            backgroundColor: "rgba(8,10,13,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid #1a2a3f",
          }}
        >
          {/* Title row */}
          <div
            style={{
              padding: "20px clamp(24px, 6vw, 80px) 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Melodrama', 'Georgia', serif",
                  fontSize: "clamp(20px, 2.5vw, 30px)",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  opacity: headingVisible ? 1 : 0,
                  transform: headingVisible ? "translateY(0)" : "translateY(10px)",
                  transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <span className="gradient-text">{activeTab.label}</span>
              </h1>
              <p
                style={{
                  color: "#8A929F",
                  margin: "4px 0 0",
                  fontSize: "13px",
                  fontWeight: 400,
                  opacity: headingVisible ? 1 : 0,
                  transition: "opacity 0.5s ease 0.1s",
                }}
              >
                {activeTab.descriptor}
              </p>
            </div>

            {/* Count badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexShrink: 0,
                opacity: headingVisible ? 1 : 0,
                transition: "opacity 0.6s ease 0.2s",
              }}
            >
              <div style={{ height: "1px", width: "24px", background: "linear-gradient(to right, #2E6DA4, #30B8BF)" }} />
              <span
                style={{
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#30B8BF",
                }}
              >
                {images.length} {images.length === 1 ? "Design" : "Designs"}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              scrollbarWidth: "none",
              padding: "0 clamp(24px, 6vw, 80px)",
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab.key;
              return (
                <Link
                  key={tab.key}
                  to={`/category/${tab.key}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "12px 20px",
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#FFFFFF" : "#8A929F",
                    textDecoration: "none",
                    borderBottom: isActive ? "2px solid #30B8BF" : "2px solid transparent",
                    transition: "color 0.2s ease, border-color 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#C8E8EC";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#8A929F";
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Fade-in content wrapper ── */}
        <div
          style={{
            opacity: pageVisible ? 1 : 0,
            transition: "opacity 0.45s ease",
          }}
        >
          {/* ── Page body ── */}
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "48px clamp(24px, 6vw, 80px) 80px",
            }}
          >
            <AmbientOrbs variant="mixed" />

            {/* Background grid */}
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

            {/* Centre ambient glow */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "20%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "700px",
                height: "400px",
                borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(46,109,164,0.07) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto" }}>
              {images.length === 0 ? (
                <p style={{ color: "#8A929F", textAlign: "center", marginTop: "80px", fontSize: "15px" }}>
                  No images available for this category.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "clamp(24px, 3vw, 40px) clamp(16px, 2vw, 28px)",
                  }}
                >
                  {images.map((src, i) => (
                    <ImageCard
                      key={`${activeTab.key}-${i}`}
                      src={src}
                      alt={`${activeTab.label} ${i + 1}`}
                      delay={Math.min(i * 0.07, 0.5)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <Footer />
        </div>
      </div>

      <style>{`
        .gallery-tabs-bar::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
