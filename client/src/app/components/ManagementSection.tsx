import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { AmbientOrbs } from "./AmbientOrbs";
import maleImg from "../../assets/partner/57-male.jpeg";
import femaleImg from "../../assets/partner/57-frmale.jpeg";

const leaders = [
  {
    name: "Bipin Jain",
    role: "Founder",
    index: "01",
    bio: [
      "At the helm is Mr. Bipin Jain, a veteran with over 35 years of experience in the diamond jewellery industry. Beyond his business acumen, Mr. Jain is an internationally renowned Jain scholar, who has been sharing the wisdom of Jainism in India and the USA for over three decades.",
      "His deep-rooted values of integrity, honesty, and ethical living form the foundation of 57 Facets, making him a sourcing partner that jewellers can trust wholeheartedly.",
    ],
    image: maleImg,
    facePosition: "center 10%",
    accent: "#2E6DA4",
    accentLight: "#3F8BC3",
  },
  {
    name: "Anupreksha Jain",
    role: "Global Business Head",
    index: "02",
    bio: [
      "Ms. Anupreksha Jain, an MBA from Flame University, Pune, has been an integral part of the business for the last 15 years. She manages the operational and strategic aspects with precision and foresight.",
      "She is a Jain scholar too, sharing the wisdom of Jainism in India and the USA for the past 15 years. Her Jain values and operational strength make her the perfect partner.",
    ],
    image: femaleImg,
    facePosition: "center 70%",
    accent: "#36C0C7",
    accentLight: "#4DD6DC",
  },
];

function LeaderCard({
  leader,
  delay,
  index,
}: {
  leader: (typeof leaders)[0];
  delay: number;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
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
        flex: "1 1 0",
        minWidth: "280px",
        maxWidth: "540px",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translate(0, 0)"
          : index % 2 === 0
          ? "translate(-60px, 24px)"
          : "translate(60px, 24px)",
        transition: `opacity 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Portrait frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(300px, 32vw, 400px)",
          borderRadius: "4px 4px 0 0",
          overflow: "hidden",
          borderTop: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderRight: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderBottom: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderLeft: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          transition: "border-color 0.4s ease",
        }}
      >
        <ImageWithFallback
          src={leader.image}
          alt={leader.name}
          className={`leader-img leader-img-${index}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: leader.facePosition,
            filter: "grayscale(20%) brightness(0.85)",
            transition: "filter 0.5s ease, transform 0.6s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, #0D1118 0%, transparent 55%)`,
          }}
        />
        {/* Index number */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: leader.accentLight,
            opacity: 0.7,
          }}
        >
          {leader.index}
        </div>
        {/* Accent corner line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(to right, ${leader.accent}, ${leader.accentLight}, transparent)`,
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.4s ease",
          }}
        />
      </div>

      {/* Content block */}
      <div
        style={{
          backgroundColor: "#0D1118",
          borderLeft: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderRight: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderBottom: `1px solid ${hovered ? leader.accent : "#1c2e44"}`,
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
          padding: "clamp(24px, 3vw, 36px)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          transition: "border-color 0.4s ease",
          flex: 1,
        }}
      >
        {/* Name & role */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "1px",
                backgroundColor: leader.accent,
              }}
            />
            <span
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                color: leader.accentLight,
                textTransform: "uppercase",
              }}
            >
              {leader.role}
            </span>
          </div>
          <h3
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(26px, 3vw, 36px)",
              fontWeight: 500,
              color: "#f0f2f5",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {leader.name}
          </h3>
        </div>

        {/* Bio paragraphs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {leader.bio.map((paragraph, i) => (
            <p
              key={i}
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "clamp(13px, 1.05vw, 15px)",
                fontWeight: 400,
                color: "#8A929F",
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManagementSection() {
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
      id="management"
      ref={sectionRef}
      style={{
        backgroundColor: "#080A0D",
        position: "relative",
        overflow: "hidden",
        padding: "80px clamp(24px, 6vw, 80px)",
      }}
    >
      <AmbientOrbs variant="teal" />
      {/* Background grid texture */}
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

      {/* Radial glow — left */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(46,109,164,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Radial glow — right */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "-8%",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(54,192,199,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Section header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "clamp(48px, 7vw, 80px)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              fontSize: "clamp(36px, 5vw, 68px)",
              fontWeight: 500,
              color: "#f0f2f5",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: "640px",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(28px)",
              transition:
                "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
          >
            The People Behind
            <br />
            <span className="gradient-text">the Brilliance.</span>
          </h2>

          {/* Decorative diamond glyph */}
          <div
            style={{
              opacity: visible ? 0.18 : 0,
              transition: "opacity 1.2s ease 0.4s",
              flexShrink: 0,
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="32,4 60,22 60,42 32,60 4,42 4,22"
                stroke="#3F8BC3"
                strokeWidth="1"
                fill="none"
              />
              <polygon
                points="32,12 52,26 52,38 32,52 12,38 12,26"
                stroke="#36C0C7"
                strokeWidth="0.5"
                fill="none"
              />
              <line
                x1="4"
                y1="22"
                x2="32"
                y2="32"
                stroke="#2E6DA4"
                strokeWidth="0.5"
              />
              <line
                x1="60"
                y1="22"
                x2="32"
                y2="32"
                stroke="#2E6DA4"
                strokeWidth="0.5"
              />
              <line
                x1="4"
                y1="42"
                x2="32"
                y2="32"
                stroke="#2E6DA4"
                strokeWidth="0.5"
              />
              <line
                x1="60"
                y1="42"
                x2="32"
                y2="32"
                stroke="#2E6DA4"
                strokeWidth="0.5"
              />
              <circle cx="32" cy="32" r="2" fill="#36C0C7" />
            </svg>
          </div>
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(20px, 3vw, 36px)",
            justifyContent: "center",
          }}
        >
          {leaders.map((leader, i) => (
            <LeaderCard key={leader.name} leader={leader} delay={0.2 + i * 0.15} index={i} />
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          /* Taller portrait on mobile so face has room */
          .leader-img {
            height: 100%;
          }
          /* Bipin Jain — face is in the center-upper area */
          .leader-img-0 {
            object-position: center 10% !important;
          }
          /* Anupreksha Jain — face is in the lower portion */
          .leader-img-1 {
            object-position: center 70% !important;
            filter: grayscale(10%) brightness(1.05) !important;
          }
        }
      `}</style>
    </section>
  );
}