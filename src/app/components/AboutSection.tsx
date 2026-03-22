import { useEffect, useRef, useState } from "react";
import aboutImg from "@/assets/Images/About section image..jpg";

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
        padding: "clamp(48px, 6vw, 80px) clamp(24px, 6vw, 80px)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── Eyebrow + Headlines — 32px below before the row ── */}
        <div
          style={{
            marginBottom: "32px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Headlines */}
          <p
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(36px, 5.6vw, 76px)",
              fontWeight: 500,
              color: "#f4f4f4",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              margin: "0 0 0.1em",
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

        {/* ── Row: image left + text right — same height, text 24px inset ── */}
        <div
          className="about-body"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "clamp(40px, 5vw, 72px)",
          }}
        >
          {/* Image — left, height follows text column, width auto from aspect ratio */}
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 1s cubic-bezier(0.22,1,0.36,1) 0.12s, transform 1s cubic-bezier(0.22,1,0.36,1) 0.12s",
            }}
          >
            <img
              src={aboutImg}
              alt="57 Facets diamond jewellery"
              style={{
                height: "100%",
                width: "auto",
                display: "block",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Text — right, exactly 24px from top and bottom of image */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "clamp(14px, 2vw, 20px)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.95s cubic-bezier(0.22,1,0.36,1) 0.28s",
            }}
          >
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 400,
                color: "#9ba2ad",
                lineHeight: 1.78,
                margin: 0,
              }}
            >
              For over three decades, 57 Facets has stood as a symbol of trust,
              legacy, and excellence in the world of fine diamond jewellery.
              Based in Mumbai, we proudly supply retailers across India and
              international markets, offering jewellery that blends modern
              design innovation with exceptional craftsmanship and integrity. We
              have our offices in Mumbai and St. Louis (USA).
            </p>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.1vw, 15px)",
                fontWeight: 400,
                color: "#9ba2ad",
                lineHeight: 1.78,
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
                lineHeight: 1.78,
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
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-body {
            flex-direction: column !important;
          }
          .about-body > div:first-child img {
            height: auto !important;
            width: 100% !important;
          }
          .about-body > div:last-child {
            padding: 24px 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
