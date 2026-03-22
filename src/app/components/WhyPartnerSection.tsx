import { useEffect, useRef, useState } from "react";

const reasons = [
  {
    index: "01",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="11,2 20,7.5 20,14.5 11,20 2,14.5 2,7.5" stroke="#3F8BC3" strokeWidth="1.2" fill="none" />
        <polygon points="11,5.5 17,9.5 17,12.5 11,16.5 5,12.5 5,9.5" stroke="#36C0C7" strokeWidth="0.7" fill="none" />
        <line x1="2" y1="7.5" x2="11" y2="11" stroke="#2E6DA4" strokeWidth="0.7" />
        <line x1="20" y1="7.5" x2="11" y2="11" stroke="#2E6DA4" strokeWidth="0.7" />
        <line x1="2" y1="14.5" x2="11" y2="11" stroke="#2E6DA4" strokeWidth="0.7" />
        <line x1="20" y1="14.5" x2="11" y2="11" stroke="#2E6DA4" strokeWidth="0.7" />
        <circle cx="11" cy="11" r="1.4" fill="#36C0C7" />
      </svg>
    ),
    headline: "Export-Grade Finishing",
    body: "Every piece meets global export standards — uncompromising in cut, setting, and polish, ready for the world's most discerning markets.",
    accent: "#2E6DA4",
    accentLight: "#3F8BC3",
  },
  {
    index: "02",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="16" height="14" rx="2" stroke="#3F8BC3" strokeWidth="1.2" fill="none" />
        <path d="M7 9h8M7 13h5" stroke="#36C0C7" strokeWidth="1" strokeLinecap="round" />
        <circle cx="17" cy="5" r="3" fill="#0D1118" stroke="#36C0C7" strokeWidth="1" />
        <path d="M15.5 5l1 1 2-2" stroke="#36C0C7" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    headline: "Custom Orders & Design Flexibility",
    body: "From bespoke bridalwear to contemporary statement pieces, our design team works closely with retailers to craft jewellery tailored to your clientele.",
    accent: "#2E6DA4",
    accentLight: "#3F8BC3",
  },
  {
    index: "03",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 11h14M15 7l4 4-4 4" stroke="#3F8BC3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="11" r="2.5" stroke="#36C0C7" strokeWidth="1" fill="none" />
      </svg>
    ),
    headline: "Transparent Pricing & Reliable Logistics",
    body: "No hidden costs, no ambiguity. Our supply chain is built on honesty — clear pricing structures and prompt, dependable delivery every time.",
    accent: "#36C0C7",
    accentLight: "#4DD6DC",
  },
  {
    index: "04",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 2l1.8 5.4H18l-4.6 3.3 1.8 5.4L11 13l-4.2 3.1 1.8-5.4L4 7.4h5.2z" stroke="#3F8BC3" strokeWidth="1.1" fill="none" strokeLinejoin="round" />
        <circle cx="11" cy="18.5" r="1.2" fill="#36C0C7" />
      </svg>
    ),
    headline: "GIA Certified Jewellery",
    body: "Every diamond we supply carries the assurance of GIA certification — internationally recognised grading that guarantees authenticity and quality.",
    accent: "#36C0C7",
    accentLight: "#4DD6DC",
  },
];

function ReasonCard({
  reason,
  delay,
}: {
  reason: (typeof reasons)[0];
  delay: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 220px",
        minWidth: "220px",
        backgroundColor: hovered ? "#0F1720" : "#0D1118",
        border: `1px solid ${hovered ? reason.accent : "#1a2a3f"}`,
        borderRadius: "6px",
        padding: "clamp(28px, 3vw, 40px) clamp(24px, 2.5vw, 32px)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}s, background-color 0.3s ease, border-color 0.3s ease`,
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(to right, ${reason.accent}, ${reason.accentLight}, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          left: "-20px",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${reason.accent}12 0%, transparent 70%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      />

      {/* Index + Icon row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            color: reason.accentLight,
            opacity: 0.6,
          }}
        >
          {reason.index}
        </span>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: `1px solid ${hovered ? reason.accent : "#1a2a3f"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hovered ? `${reason.accent}18` : "transparent",
            transition: "border-color 0.3s ease, background-color 0.3s ease",
          }}
        >
          {reason.icon}
        </div>
      </div>

      {/* Headline */}
      <h3
        style={{
          fontFamily: "'Melodrama', 'Georgia', serif",
          fontSize: "clamp(20px, 2vw, 26px)",
          fontWeight: 500,
          color: "#e8ecf0",
          lineHeight: 1.18,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        {reason.headline}
      </h3>

      {/* Body */}
      <p
        style={{
          fontFamily: "'General Sans', 'Inter', sans-serif",
          fontSize: "clamp(13px, 1vw, 14.5px)",
          fontWeight: 400,
          color: "#6b7d93",
          lineHeight: 1.75,
          margin: 0,
          flex: 1,
        }}
      >
        {reason.body}
      </p>

      {/* Bottom rule */}
      <div
        style={{
          height: "1px",
          background: `linear-gradient(to right, ${reason.accent}55, transparent)`,
          opacity: hovered ? 1 : 0.3,
          transition: "opacity 0.35s ease",
        }}
      />
    </div>
  );
}

export function WhyPartnerSection() {
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
      id="why-partner"
      ref={sectionRef}
      style={{
        backgroundColor: "#080A0D",
        position: "relative",
        overflow: "hidden",
        padding: "clamp(80px, 10vw, 136px) clamp(24px, 6vw, 80px)",
      }}
    >
      {/* Background grid */}
      <div
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

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(46,109,164,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "clamp(12px, 2vw, 18px)",
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
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.22em",
              color: "#3F8BC3",
              textTransform: "uppercase",
            }}
          >
            Our Partnership Promise
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "clamp(48px, 7vw, 72px)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 500,
              color: "#f0f2f5",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: "700px",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(28px)",
              transition:
                "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
          >
            Why Retailers Partner
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #3F8BC3 0%, #36C0C7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              With 57 Facets.
            </span>
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "clamp(13px, 1.05vw, 15px)",
              fontWeight: 400,
              color: "#5e7089",
              lineHeight: 1.7,
              margin: 0,
              maxWidth: "340px",
              opacity: visible ? 1 : 0,
              transition: "opacity 1s ease 0.3s",
            }}
          >
            Long-term relationships built not just on diamonds, but on the
            values of honesty, consistency, and mutual respect.
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(14px, 2vw, 24px)",
          }}
        >
          {reasons.map((reason, i) => (
            <ReasonCard key={reason.index} reason={reason} delay={0.15 + i * 0.1} />
          ))}
        </div>

        {/* Bottom rule */}
        <div
          style={{
            marginTop: "clamp(56px, 8vw, 96px)",
            height: "1px",
            background:
              "linear-gradient(to right, transparent, #1c3252, #1c3252, transparent)",
            opacity: visible ? 1 : 0,
            transition: "opacity 1s ease 0.8s",
          }}
        />
      </div>
    </section>
  );
}
