import { useEffect, useRef, useState } from "react";
import diamondImg from "figma:asset/67d3a317d60076587aea0df47e1ffaaeb84b590a.png";

export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
        else setVisible(false);
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
        backgroundColor: "#0a0c10",
        position: "relative",
        overflow: "hidden",
        minHeight: "clamp(680px, 80vw, 920px)",
      }}
    >
      {/* ── Left-bleeding pill image frame ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: "clamp(-160px, -14vw, -100px)",
          top: "calc(50% + clamp(80px, 10vw, 148px))",
          transform: "translateY(-50%)",
          width: "clamp(480px, 68vw, 951px)",
          height: "clamp(300px, 38vw, 545px)",
          border: "1px solid #3880be",
          borderRadius: "0 999px 999px 0",
          overflow: "hidden",
          zIndex: 5,
          transition: "opacity 1.1s cubic-bezier(0.22,1,0.36,1) 0.1s",
        }}
      >
        <img
          src={diamondImg}
          alt="Diamond collection"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>

      {/* ── Large Melodrama headline — top left ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "clamp(64px, 8vw, 113px)",
          left: "clamp(32px, 5vw, 60px)",
          zIndex: 10,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(28px)",
          transition:
            "opacity 1s cubic-bezier(0.22,1,0.36,1) 0s, transform 1s cubic-bezier(0.22,1,0.36,1) 0s",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(16px, 2.5vw, 32px)",
          }}
        >
          <p
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(36px, 5.6vw, 76px)",
              fontWeight: 500,
              color: "#f4f4f4",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Precision is the Point.
          </p>
          <p
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(36px, 5.6vw, 76px)",
              fontWeight: 500,
              color: "#f4f4f4",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Every Diamond Has 57 Facets.
          </p>
        </div>
      </div>

      {/* ── Body copy — right side, mid-lower ───────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          right: "clamp(32px, 5vw, 60px)",
          top: "clamp(300px, 38vw, 364px)",
          width: "clamp(260px, 25vw, 348px)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(24px, 3.5vw, 47px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s",
        }}
      >
        <p
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "clamp(13px, 1.1vw, 16px)",
            fontWeight: 400,
            color: "#9ba2ad",
            lineHeight: 1.73,
            margin: 0,
          }}
        >
          For over three decades, 57 Facets has stood as a symbol of trust, legacy, and excellence in the world of fine diamond jewellery. Based in Mumbai, we proudly supply retailers across India and international markets, offering jewellery that blends modern design innovation with exceptional craftsmanship and integrity. We have our offices in Mumbai and St. Louis (USA).
        </p>
        <p
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "clamp(13px, 1.1vw, 16px)",
            fontWeight: 400,
            color: "#9ba2ad",
            lineHeight: 1.73,
            margin: 0,
          }}
        >
          From timeless solitaires to contemporary statement pieces, every jewel is created to global export standards, with uncompromising finishing, transparency in pricing, and reliable logistics. Our long-standing relationships with reputed jewellers are built not just on diamonds, but on the values of honesty, consistency, and mutual respect.
        </p>
        <p
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "clamp(13px, 1.1vw, 16px)",
            fontWeight: 400,
            color: "#9ba2ad",
            lineHeight: 1.73,
            margin: 0,
          }}
        >
          We carry forward a vision that balances heritage with innovation, ensuring that every client experiences not just jewellery, but a relationship built on transparency, values, and brilliance. At 57 Facets, we don't just deliver jewellery — we deliver trust, long-term partnerships, and brilliance that lasts generations.
        </p>
      </div>

      {/* ── Bottom rule ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          backgroundColor: "#1a2a3f",
          opacity: visible ? 1 : 0,
          transition: "opacity 1s ease 0.5s",
        }}
      />
    </section>
  );
}