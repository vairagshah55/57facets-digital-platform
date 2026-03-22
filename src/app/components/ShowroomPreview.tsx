import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const FILTERS = ["All", "Bangles", "Pendants", "Earrings", "Necklaces", "Rings", "Bracelets", "Stories"] as const;
type Filter = (typeof FILTERS)[number];

const PIECES = [
  {
    id: 1,
    sku: "57F-BG-0118",
    category: "Bangles",
    name: "Diamond Bangle",
    subtitle: "Pavé Set, 18K White Gold",
    totalCarat: "3.20 ct tw",
    metal: "18K White Gold",
    finish: "High Polish",
    priceINR: "₹18,40,000",
    img: "https://images.unsplash.com/photo-1665703156495-d0be1572257c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwYmFuZ2xlJTIwYnJhY2VsZXQlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBkYXJrfGVufDF8fHx8MTc3MzkyODY0Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: 2,
    sku: "57F-PD-0244",
    category: "Pendants",
    name: "Solitaire Pendant",
    subtitle: "Round Brilliant, 950 Platinum",
    totalCarat: "1.50 ct",
    metal: "950 Platinum",
    finish: "Matte",
    priceINR: "₹9,75,000",
    img: "https://images.unsplash.com/photo-1636298313371-0c9b029f7676?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwcGVuZGFudCUyMG5lY2tsYWNlJTIwbHV4dXJ5JTIwamV3ZWxsZXJ5JTIwZGFyayUyMGJhY2tncm91bmR8ZW58MXx8fHwxNzczOTI4NjQyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: 3,
    sku: "57F-ER-0391",
    category: "Earrings",
    name: "Drop Earrings",
    subtitle: "Emerald Cut, 18K Rose Gold",
    totalCarat: "2.40 ct tw",
    metal: "18K Rose Gold",
    finish: "Satin",
    priceINR: "₹14,20,000",
    img: "https://images.unsplash.com/photo-1736449497832-6ae92abb8507?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwZWFycmluZ3MlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NzM5Mjg2NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: 4,
    sku: "57F-NK-0077",
    category: "Necklaces",
    name: "Statement Necklace",
    subtitle: "Multi-stone, 18K Yellow Gold",
    totalCarat: "5.80 ct tw",
    metal: "18K Yellow Gold",
    finish: "High Polish",
    priceINR: "₹34,50,000",
    img: "https://images.unsplash.com/photo-1718698028514-7b5029017de5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwbmVja2xhY2UlMjBsdXh1cnklMjBmaW5lJTIwamV3ZWxsZXJ5JTIwZGFya3xlbnwxfHx8fDE3NzM5Mjg2NDN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: 5,
    sku: "57F-RG-0205",
    category: "Rings",
    name: "Solitaire Ring",
    subtitle: "Round Brilliant, 950 Platinum",
    totalCarat: "2.01 ct",
    metal: "950 Platinum",
    finish: "High Polish",
    priceINR: "₹21,80,000",
    img: "https://images.unsplash.com/photo-1669738202871-1997517de7d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwZW5nYWdlbWVudCUyMHJpbmclMjBsdXh1cnklMjBzb2xpdGFpcmUlMjBkYXJrfGVufDF8fHx8MTc3MzkyODY0M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: 6,
    sku: "57F-BR-0162",
    category: "Bracelets",
    name: "Tennis Bracelet",
    subtitle: "Channel Set, 18K White Gold",
    totalCarat: "4.50 ct tw",
    metal: "18K White Gold",
    finish: "High Polish",
    priceINR: "₹26,90,000",
    img: "https://images.unsplash.com/photo-1763029513623-37d488cb97b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWFtb25kJTIwdGVubmlzJTIwYnJhY2VsZXQlMjBsdXh1cnklMjBqZXdlbGxlcnklMjBlbGVnYW50fGVufDF8fHx8MTc3MzkyODY0NHww&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
  {
    id: 7,
    sku: "57F-ST-0033",
    category: "Stories",
    name: "Heritage Collection",
    subtitle: "Editorial Bridal Suite",
    totalCarat: "Bespoke",
    metal: "Mixed Metals",
    finish: "Artisan",
    priceINR: "Price on Request",
    img: "https://images.unsplash.com/photo-1770062422860-92c107ef02cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBqZXdlbGxlcnklMjBlZGl0b3JpYWwlMjBsaWZlc3R5bGUlMjBzdG9yeSUyMGRhcmt8ZW58MXx8fHwxNzczOTI4NjQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: false,
  },
];

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "#30B8BF" : "none"}
      stroke={active ? "#30B8BF" : "rgba(255,255,255,0.6)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h12l4 6-10 13L2 9z"
        fill="none"
        stroke="#30B8BF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductCard({
  piece,
  style,
  delay = 0,
  visible,
  large = false,
}: {
  piece: (typeof PIECES)[0];
  style?: React.CSSProperties;
  delay?: number;
  visible: boolean;
  large?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: `1px solid ${hovered ? "#3880BE" : "#1C2535"}`,
        boxShadow: "none",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, border-color 0.3s ease`,
        backgroundColor: "#0D1118",
        ...style,
      }}
    >
      {/* Image */}
      <ImageWithFallback
        src={piece.img}
        alt={piece.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      />

      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(8,10,13,0.60) 0%, transparent 28%, rgba(8,10,13,0.55) 45%, rgba(8,10,13,0.97) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top row: SKU + Shortlist */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'General Sans', 'Inter', monospace",
            fontSize: large ? "11px" : "10px",
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.55)",
            backgroundColor: "rgba(8,10,13,0.6)",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(6px)",
          }}
        >
          {piece.sku}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShortlisted(!shortlisted);
          }}
          style={{
            background: "rgba(8,10,13,0.6)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            transition: "border-color 0.2s ease, background 0.2s ease",
            ...(shortlisted
              ? {
                  borderColor: "rgba(48,184,191,0.4)",
                  background: "rgba(48,184,191,0.1)",
                }
              : {}),
          }}
        >
          <BookmarkIcon active={shortlisted} />
        </button>
      </div>

      {/* GIA badge */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 14,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          backgroundColor: "rgba(8,10,13,0.55)",
          border: "1px solid rgba(48,184,191,0.25)",
          borderRadius: "4px",
          padding: "3px 8px",
          backdropFilter: "blur(6px)",
        }}
      >
        <DiamondIcon />
        <span
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.14em",
            color: "#30B8BF",
          }}
        >
          GIA CERTIFIED
        </span>
      </div>

      {/* Bottom info panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: large ? "20px 18px" : "16px 14px",
          zIndex: 2,
          backgroundColor: "rgba(8,10,13,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Category label */}
        <div
          style={{
            fontFamily: "'General Sans', 'Inter', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.18em",
            color: "#3F8BC3",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {piece.category}
        </div>

        {/* Piece name */}
        <div
          style={{
            fontFamily: "'Google Sans', 'General Sans', sans-serif",
            fontSize: "17px",
            fontWeight: 500,
            color: "#FFFFFF",
            lineHeight: 1.1,
            marginBottom: "6px",
            letterSpacing: "-0.01em",
          }}
        >
          {piece.name}
        </div>

        {/* Specs row */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          {[piece.subtitle, piece.totalCarat].map((spec) => (
            <span
              key={spec}
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.62)",
                textTransform: "uppercase",
              }}
            >
              {spec}
            </span>
          ))}
        </div>

        {/* Price + Enquire */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.10)",
            paddingTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
            }}
          >
            {piece.priceINR}
          </span>
          <div
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: hovered ? "#30B8BF" : "rgba(255,255,255,0.50)",
              textTransform: "uppercase",
              transition: "color 0.25s ease",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            Enquire
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowroomPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

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

  const filtered =
    activeFilter === "All"
      ? PIECES
      : PIECES.filter((p) => p.category === activeFilter);

  const displayPieces = filtered.slice(0, 5);

  return (
    <section
      id="showroom"
      ref={sectionRef}
      style={{
        backgroundColor: "#0D1118",
        position: "relative",
        overflow: "hidden",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 80px)",
      }}
    >
      {/* Subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1320px", margin: "0 auto" }}>

        {/* ── Section Header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            marginBottom: "clamp(32px, 5vw, 56px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0s",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(36px, 5vw, 68px)",
                fontWeight: 500,
                color: "#FFFFFF",
                lineHeight: 1.0,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              The Collection.
            </h2>
          </div>

          {/* Filter pills + CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "16px" }}>
            <button
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "13px 32px",
                borderRadius: "999px",
                border: "1px solid #FFFFFF",
                backgroundColor: "#FFFFFF",
                color: "#0D1118",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.25s ease, color 0.25s ease, border-color 0.25s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#163556";
                (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#1F4A78";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF";
                (e.currentTarget as HTMLButtonElement).style.color = "#0D1118";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#FFFFFF";
              }}
            >
              View Collection
            </button>

            {/* Filter pills row */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    padding: "8px 16px",
                    borderRadius: "999px",
                    border: `1px solid ${activeFilter === f ? "#3880BE" : "#1C2535"}`,
                    backgroundColor:
                      activeFilter === f ? "rgba(56,128,190,0.12)" : "transparent",
                    color: activeFilter === f ? "#3880BE" : "#636B7A",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textTransform: "uppercase",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Product Grid ─────────────────────────────────────────────────── */}
        {displayPieces.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "#636B7A",
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "14px",
              letterSpacing: "0.06em",
            }}
          >
            No pieces found for this category.
          </div>
        ) : displayPieces.length === 1 ? (
          <div style={{ height: "520px" }}>
            <ProductCard
              piece={displayPieces[0]}
              style={{ height: "100%" }}
              delay={0.1}
              visible={visible}
              large
            />
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "284px 284px",
              gap: "12px",
            }}
          >
            {displayPieces[0] && (
              <ProductCard
                piece={displayPieces[0]}
                style={{ gridColumn: "1 / 3", gridRow: "1 / 3", height: "100%" }}
                delay={0.1}
                visible={visible}
                large
              />
            )}
            {displayPieces[1] && (
              <ProductCard
                piece={displayPieces[1]}
                style={{ gridColumn: "3 / 4", gridRow: "1 / 2", height: "100%" }}
                delay={0.2}
                visible={visible}
              />
            )}
            {displayPieces[2] && (
              <ProductCard
                piece={displayPieces[2]}
                style={{ gridColumn: "3 / 4", gridRow: "2 / 3", height: "100%" }}
                delay={0.3}
                visible={visible}
              />
            )}
          </div>
        )}

        {/* Second row — cards 4 & 5 */}
        {displayPieces.length > 3 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            {displayPieces[3] && (
              <ProductCard
                piece={displayPieces[3]}
                style={{ height: "360px" }}
                delay={0.4}
                visible={visible}
              />
            )}
            {displayPieces[4] && (
              <ProductCard
                piece={displayPieces[4]}
                style={{ height: "360px" }}
                delay={0.5}
                visible={visible}
              />
            )}
          </div>
        )}

        {/* Bottom divider */}
        <div
          style={{
            marginTop: "clamp(48px, 6vw, 72px)",
            height: "1px",
            backgroundColor: "#1C2535",
            opacity: visible ? 1 : 0,
            transition: "opacity 1s ease 0.7s",
          }}
        />
      </div>
    </section>
  );
}
