import { useState, useEffect, useRef, useCallback } from "react";
import { AmbientOrbs } from "./AmbientOrbs";
import imgRings from "@/assets/Images/rings.jpg";
import imgNecklace from "@/assets/Images/necklace.jpg";
import imgEarings from "@/assets/Images/earings.jpg";
import imgBracelets from "@/assets/Images/bracelates.jpg";
import imgBangles from "@/assets/Images/bengals.jpg";
import imgPendants from "@/assets/Images/pendants.jpg";

const CATEGORIES = [
  {
    id: 1,
    name: "Rings",
    descriptor: "Symbols of love and commitment",
    count: "47 Designs",
    img: imgRings,
  },
  {
    id: 2,
    name: "Necklaces",
    descriptor: "A statement of grace and heritage",
    count: "22 Designs",
    img: imgNecklace,
  },
  {
    id: 3,
    name: "Earrings",
    descriptor: "Effortless radiance, every angle",
    count: "31 Designs",
    img: imgEarings,
  },
  {
    id: 4,
    name: "Bracelets",
    descriptor: "Diamond-set, timelessly worn",
    count: "19 Designs",
    img: imgBracelets,
  },
  {
    id: 5,
    name: "Pendants",
    descriptor: "Close to the heart, far above the rest",
    count: "24 Designs",
    img: imgPendants,
  },
  {
    id: 6,
    name: "Bangles",
    descriptor: "Stacked elegance, wrist-worn brilliance",
    count: "18 Designs",
    img: imgBangles,
  },
];

function CategoryCard({ category, delay }: { category: (typeof CATEGORIES)[number]; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card-shimmer-wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {/* ── Image block ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          backgroundColor: "#0D1118",
        }}
      >
        <img
          src={category.img}
          alt={category.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            transform: hovered ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />

        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: hovered
              ? "linear-gradient(to top, rgba(8,10,13,0.82) 0%, rgba(8,10,13,0.18) 55%, transparent 100%)"
              : "linear-gradient(to top, rgba(8,10,13,0.55) 0%, transparent 60%)",
            transition: "background 0.4s ease",
          }}
        />

        {/* Stone count badge — top left */}
        <div
          aria-label={`${category.count} available`}
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            padding: "4px 10px",
            borderRadius: "9999px",
            backgroundColor: "rgba(8,10,13,0.8)",
            border: "1px solid rgba(28,37,53,0.9)",
            backdropFilter: "blur(8px)",
            opacity: hovered ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#A8B0BF",
            }}
          >
            {category.count}
          </span>
        </div>

        {/* Inquire Now CTA — bottom of image, appears on hover */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            right: "16px",
            display: "flex",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <a
            href="#contact"
            aria-label={`Inquire about ${category.name}`}
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

      {/* ── Text + CTA block ── */}
      <div
        style={{
          paddingTop: "16px",
          paddingBottom: "4px",
        }}
      >
        {/* Name */}
        <p
          style={{
            fontFamily: "'Melodrama', 'Georgia', serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "#FFFFFF",
            margin: "0 0 4px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {category.name}
        </p>

        {/* Descriptor */}
        <p
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: 400,
            color: "#8A929F",
            margin: 0,
            lineHeight: 1.6,
            transition: "color 0.3s ease",
          }}
        >
          {category.descriptor}
        </p>

      </div>
    </div>
  );
}

export function StoneCategories() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / CATEGORIES.length;
    setActiveIndex(Math.round(el.scrollLeft / cardWidth));
  }, []);

  const scrollTo = (i: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / CATEGORIES.length;
    el.scrollTo({ left: cardWidth * i, behavior: "smooth" });
  };

  return (
    <section
      id="collections"
      style={{
        backgroundColor: "#080A0D",
        padding: "96px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AmbientOrbs variant="blue" />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 clamp(24px, 6vw, 80px)" }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "clamp(40px, 6vw, 64px)",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(28px, 3.5vw, 46px)",
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Browse by{" "}
              <span
                style={{
                  background: "linear-gradient(95deg, #FFFFFF 0%, #C8E8EC 40%, #30B8BF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Category
              </span>
            </h2>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p
              aria-label="363 stones live"
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "32px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: "0 0 2px",
                lineHeight: 1,
              }}
            >
              363
            </p>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8A929F",
                margin: 0,
              }}
            >
              Stones Live
            </p>
          </div>
        </div>

        {/* ── Desktop Grid ── */}
        <div
          className="stone-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(24px, 3vw, 40px) clamp(16px, 2vw, 28px)",
          }}
        >
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.id} category={cat} delay={i * 0.1} />
          ))}
        </div>
      </div>

      {/* ── Mobile Carousel ── */}
      <div className="stone-carousel-wrap">
        <div
          ref={carouselRef}
          className="stone-carousel"
          onScroll={handleCarouselScroll}
        >
          {CATEGORIES.map((cat, i) => (
            <div key={cat.id} className="stone-carousel-item">
              <CategoryCard category={cat} delay={0} />
            </div>
          ))}
        </div>

        {/* Dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginTop: "24px",
          }}
        >
          {CATEGORIES.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: activeIndex === i ? "24px" : "8px",
                height: "8px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                padding: 0,
                backgroundColor: activeIndex === i ? "#30B8BF" : "rgba(255,255,255,0.2)",
                transition: "width 0.3s ease, background-color 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        /* Desktop grid — visible */
        .stone-grid {
          display: grid;
        }
        /* Mobile carousel — hidden on desktop */
        .stone-carousel-wrap {
          display: none;
        }

        @media (max-width: 768px) {
          /* Hide desktop grid, show carousel */
          .stone-grid {
            display: none !important;
          }
          .stone-carousel-wrap {
            display: block;
          }
          .stone-carousel {
            display: flex;
            overflow-x: scroll;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 16px;
            padding: 0 clamp(24px, 6vw, 48px);
            padding-right: clamp(48px, 10vw, 80px);
          }
          .stone-carousel::-webkit-scrollbar {
            display: none;
          }
          .stone-carousel-item {
            flex: 0 0 72vw;
            scroll-snap-align: start;
          }
        }

        @media (max-width: 420px) {
          .stone-carousel-item {
            flex: 0 0 80vw;
          }
        }
      `}</style>
    </section>
  );
}
