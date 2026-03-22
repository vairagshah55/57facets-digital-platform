import { useState } from "react";
import img1 from "@/assets/Images/pexels-the-glorious-studio-3584518-5442447.jpg";
import img2 from "@/assets/Images/pexels-the-glorious-studio-3584518-7541803.jpg";
import img3 from "@/assets/Images/pexels-the-glorious-studio-3584518-11504786.jpg";
import img4 from "@/assets/Images/pexels-the-glorious-studio-3584518-12427696.jpg";
import img5 from "@/assets/Images/pexels-the-glorious-studio-3584518-31677627.jpg";
import img6 from "@/assets/Images/pexels-the-glorious-studio-3584518-32492521.jpg";

const CATEGORIES = [
  {
    id: 1,
    name: "Bangles",
    descriptor: "Stacked elegance, wrist-worn brilliance",
    count: "18 Designs",
    img: img1,
  },
  {
    id: 2,
    name: "Pendants",
    descriptor: "Close to the heart, far above the rest",
    count: "24 Designs",
    img: img2,
  },
  {
    id: 3,
    name: "Earrings",
    descriptor: "Effortless radiance, every angle",
    count: "31 Designs",
    img: img3,
  },
  {
    id: 4,
    name: "Necklaces",
    descriptor: "A statement of grace and heritage",
    count: "22 Designs",
    img: img4,
  },
  {
    id: 5,
    name: "Rings",
    descriptor: "Symbols of love and commitment",
    count: "47 Designs",
    img: img5,
  },
  {
    id: 6,
    name: "Bracelets",
    descriptor: "Diamond-set, timelessly worn",
    count: "19 Designs",
    img: img6,
  },
];

function CategoryCard({ category }: { category: (typeof CATEGORIES)[number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
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

        {/* Divider + CTA — visible only on hover */}
        <div
          style={{
            opacity: hovered ? 1 : 0,
            visibility: hovered ? "visible" : "hidden",
            transition: "opacity 0.35s ease, visibility 0.35s ease",
          }}
        >
          <div
            style={{
              height: "1px",
              backgroundColor: "#1C2535",
              margin: "14px 0 12px",
            }}
          />

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
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#A8B0BF",
              }}
            >
              {category.count}
            </span>

            <button
              aria-label={`Inquire about ${category.name}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "9999px",
                backgroundColor: "#2660A0",
                border: "1px solid #3880BE",
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#FFFFFF",
                cursor: "pointer",
                outline: "none",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1A4A80")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2660A0")
              }
            >
              Inquire Now
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoneCategories() {
  return (
    <section
      id="collections"
      style={{
        backgroundColor: "#080A0D",
        padding: "clamp(80px, 10vw, 136px) clamp(24px, 6vw, 80px)",
        position: "relative",
      }}
    >

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ width: "32px", height: "1px", backgroundColor: "#2E6DA4" }} />
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
                Our Collection
              </span>
            </div>

            {/* Headline */}
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
                  background:
                    "linear-gradient(95deg, #FFFFFF 0%, #C8E8EC 40%, #30B8BF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Category
              </span>
            </h2>
          </div>

          {/* Right: total designs */}
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

        {/* ── Grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "clamp(24px, 3vw, 40px) clamp(16px, 2vw, 28px)",
          }}
          className="stone-grid"
        >
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          .stone-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 720px) {
          .stone-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 420px) {
          .stone-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
