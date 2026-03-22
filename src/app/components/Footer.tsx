import logoImg from "@/assets/Images/logo_png.png";

const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Collections", href: "#collections" },
  { label: "Management", href: "#management" },
  { label: "Why Partner", href: "#why-partner" },
  { label: "Inquire", href: "#contact" },
];

const TICKER_ITEM = "57 Facets";
const SEPARATOR = "◆";
const REPEAT = 8;

function SignatureText() {
  return (
    <div
      aria-hidden="true"
      style={{
        overflow: "hidden",
        marginTop: "clamp(48px, 6vw, 72px)",
        marginLeft: "calc(-1 * clamp(24px, 6vw, 80px))",
        marginRight: "calc(-1 * clamp(24px, 6vw, 80px))",
        marginBottom: "calc(-1 * 96px)",
        userSelect: "none",
        pointerEvents: "none",
        borderTop: "1px solid #1C2535",
        borderBottom: "1px solid #1C2535",
        paddingTop: "18px",
        paddingBottom: "18px",
      }}
    >
      <div className="footer-ticker">
        {Array.from({ length: REPEAT }).map((_, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "20px", paddingRight: "20px" }}>
            <span
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(28px, 3.5vw, 48px)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.22)",
                whiteSpace: "nowrap",
              }}
            >
              {TICKER_ITEM}
            </span>
            <span
              style={{
                fontSize: "clamp(8px, 1vw, 12px)",
                color: "rgba(54,192,199,0.25)",
              }}
            >
              {SEPARATOR}
            </span>
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {Array.from({ length: REPEAT }).map((_, i) => (
          <span key={`dup-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "20px", paddingRight: "20px" }}>
            <span
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "clamp(28px, 3.5vw, 48px)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.22)",
                whiteSpace: "nowrap",
              }}
            >
              {TICKER_ITEM}
            </span>
            <span
              style={{
                fontSize: "clamp(8px, 1vw, 12px)",
                color: "rgba(54,192,199,0.25)",
              }}
            >
              {SEPARATOR}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "#080A0D",
        padding: "96px clamp(24px, 6vw, 80px)",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top row — logo + links */}
        <div
          className="footer-top"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "48px",
            marginBottom: "clamp(40px, 5vw, 64px)",
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: "320px" }}>
            <a href="#" aria-label="57 Facets home" style={{ display: "inline-block", marginBottom: "20px" }}>
              <img
                src={logoImg}
                alt="57 Facets"
                style={{ height: "56px", width: "auto", objectFit: "contain" }}
              />
            </a>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "13px",
                fontWeight: 400,
                color: "#8A929F",
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              A trusted B2B diamond jewellery partner for retailers across India and
              international markets — built on three decades of integrity,
              craftsmanship, and excellence.
            </p>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation">
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#3F8BC3",
                margin: "0 0 20px",
              }}
            >
              Navigation
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    style={{
                      fontFamily: "'General Sans', 'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 400,
                      color: "#8A929F",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "#FFFFFF")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "#8A929F")
                    }
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact info */}
          <div>
            <p
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#3F8BC3",
                margin: "0 0 20px",
              }}
            >
              Get in Touch
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[
                { label: "Mumbai, India" },
                { label: "St. Louis, USA" },
              ].map(({ label }) => (
                <p
                  key={label}
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "13px",
                    color: "#8A929F",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#3F8BC3" strokeWidth="1.5" fill="none" />
                    <circle cx="12" cy="9" r="2.5" stroke="#3F8BC3" strokeWidth="1.5" fill="none" />
                  </svg>
                  {label}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "clamp(24px, 3vw, 36px)" }} />

        {/* Bottom row */}
        <div
          className="footer-bottom"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "12px",
              color: "#8A929F",
              margin: 0,
            }}
          >
            © {year} 57 Facets. All rights reserved.
          </p>
          <p
            style={{
              fontFamily: "'General Sans', 'Inter', sans-serif",
              fontSize: "12px",
              color: "#8A929F",
              margin: 0,
              letterSpacing: "0.04em",
            }}
          >
            GIA Certified · B2B Only · Strictly Confidential
          </p>
        </div>
      </div>

      {/* Decorative signature — full bleed below footer content */}
      <SignatureText />

      <style>{`
        .footer-ticker {
          display: inline-flex;
          animation: footer-scroll 30s linear infinite;
          will-change: transform;
        }
        @keyframes footer-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .footer-top {
            flex-direction: column !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </footer>
  );
}
