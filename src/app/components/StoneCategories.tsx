import { useState } from "react";

const CATEGORIES = [
  {
    id: 1,
    name: "Bangles",
    descriptor: "Stacked elegance, wrist-worn brilliance",
    count: "18 Designs",
    img: "https://images.unsplash.com/photo-1665703156495-d0be1572257c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwYmFuZ2xlJTIwYnJhY2VsZXQlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBkYXJrfGVufDF8fHx8MTc3MzkyODY0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 2,
    name: "Pendants",
    descriptor: "Close to the heart, far above the rest",
    count: "24 Designs",
    img: "https://images.unsplash.com/photo-1636298313371-0c9b029f7676?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwcGVuZGFudCUyMG5lY2tsYWNlJTIwbHV4dXJ5JTIwamV3ZWxsZXJ5JTIwZGFyayUyMGJhY2tncm91bmR8ZW58MXx8fHwxNzczOTI4NjQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 3,
    name: "Earrings",
    descriptor: "Effortless radiance, every angle",
    count: "31 Designs",
    img: "https://images.unsplash.com/photo-1736449497832-6ae92abb8507?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwZWFycmluZ3MlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NzM5Mjg2NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 4,
    name: "Necklaces",
    descriptor: "A statement of grace and heritage",
    count: "22 Designs",
    img: "https://images.unsplash.com/photo-1718698028514-7b5029017de5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwbmVja2xhY2UlMjBsdXh1cnklMjBmaW5lJTIwamV3ZWxsZXJ5JTIwZGFya3xlbnwxfHx8fDE3NzM5Mjg2NDN8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 5,
    name: "Rings",
    descriptor: "Symbols of love and commitment",
    count: "47 Designs",
    img: "https://images.unsplash.com/photo-1669738202871-1997517de7d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwZW5nYWdlbWVudCUyMHJpbmclMjBsdXh1cnklMjBzb2xpdGFpcmUlMjBkYXJrfGVufDF8fHx8MTc3MzkyODY0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 6,
    name: "Bracelets",
    descriptor: "Diamond-set, timelessly worn",
    count: "19 Designs",
    img: "https://images.unsplash.com/photo-1763029513623-37d488cb97b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwdGVubmlzJTIwYnJhY2VsZXQlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBlbGVnYW50fGVufDF8fHx8MTc3MzkyODY0NHww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 7,
    name: "Stories",
    descriptor: "Heritage pieces with a narrative",
    count: "8 Edits",
    img: "https://images.unsplash.com/photo-1770062422860-92c107ef02cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbGxlcnklMjBlZGl0b3JpYWwlMjBsaWZlc3R5bGUlMjBzdG9yeSUyMGRhcmt8ZW58MXx8fHwxNzczOTI4NjQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
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

        {/* Dark gradient overlay — intensifies on hover */}
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
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            padding: "3px 9px",
            borderRadius: "9999px",
            backgroundColor: "rgba(8,10,13,0.8)",
            border: "1px solid rgba(28,37,53,0.9)",
            backdropFilter: "blur(8px)",
            opacity: hovered ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        ><span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#636B7A",
            }}
          >{category.count}</span></div>
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
            fontSize: "12px",
            fontWeight: 400,
            color: "#636B7A",
            margin: 0,
            lineHeight: 1.6,
            transition: "color 0.3s ease",
          }}
        >
          {category.descriptor}
        </p>

        {/* Divider + CTA — always reserves space, visible only on hover */}
        <div
          style={{
            opacity: hovered ? 1 : 0,
            visibility: hovered ? "visible" : "hidden",
            transition: "opacity 0.35s ease, visibility 0.35s ease",
          }}
        >
          {/* Thin divider */}
          <div
            style={{
              height: "1px",
              backgroundColor: "#1C2535",
              margin: "14px 0 12px",
            }}
          />

          {/* Row: count + Inquire Now */}
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
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#A8B0BF",
              }}
            >
              {category.count}
            </span>

            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 16px",
                borderRadius: "9999px",
                backgroundColor: "#2660A0",
                border: "1px solid #3880BE",
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "10px",
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
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
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
      style={{
        backgroundColor: "#080A0D",
        padding: "120px clamp(32px, 5vw, 80px) 120px",
        position: "relative",
      }}
    >
      {/* Top divider */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "clamp(32px, 5vw, 80px)",
          right: "clamp(32px, 5vw, 80px)",
          height: "1px",
          background:
            "linear-gradient(to right, transparent, #1C2535 20%, #1C2535 80%, transparent)",
        }}
      />

      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            {/* Eyebrow */}
            

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

          {/* Right: total stones */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p
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
                color: "#636B7A",
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px 24px",
          }}
          className="stone-grid"
        >
          {CATEGORIES.filter((cat) => cat.name !== "Stories").map((cat) => (
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
            gap: 24px 16px !important;
          }
        }
        @media (max-width: 420px) {
          .stone-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px 12px !important;
          }
        }
      `}</style>
    </section>
  );
}