import logoImg from "@/assets/Images/logo_png.png";

const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Collections", href: "#collections" },
  { label: "Management", href: "#management" },
  { label: "Why Partner", href: "#why-partner" },
  { label: "Inquire", href: "#contact" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "#080A0D",
        padding: "clamp(48px, 6vw, 80px) clamp(24px, 6vw, 80px) clamp(32px, 4vw, 48px)",
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
                style={{ height: "40px", width: "auto", objectFit: "contain" }}
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
                { label: "Mumbai, India", icon: "📍" },
                { label: "St. Louis, USA", icon: "📍" },
              ].map(({ label, icon }) => (
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
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </p>
              ))}
              <a
                href="#contact"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "8px",
                  padding: "10px 20px",
                  borderRadius: "9999px",
                  border: "1px solid #2E6DA4",
                  backgroundColor: "transparent",
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#3F8BC3",
                  textDecoration: "none",
                  transition: "background-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = "#2E6DA4";
                  el.style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.backgroundColor = "transparent";
                  el.style.color = "#3F8BC3";
                }}
              >
                Inquire Now
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "linear-gradient(to right, transparent, #1C2535 20%, #1C2535 80%, transparent)",
            marginBottom: "clamp(24px, 3vw, 36px)",
          }}
        />

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

      <style>{`
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
