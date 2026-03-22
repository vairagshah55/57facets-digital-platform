import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logoImg from "@/assets/Images/logo_png.png";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Collections", href: "#collections" },
  { label: "Management", href: "#management" },
  { label: "Why Partner", href: "#why-partner" },
  { label: "Inquire", href: "#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled || mobileOpen ? "rgba(8,10,13,0.96)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(28,37,53,0.9)" : "1px solid transparent",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <a href="#" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img
              src={logoImg}
              alt="57 Facets"
              style={{ height: "44px", width: "auto", objectFit: "contain" }}
            />
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-10" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="nav-desktop-link"
                  style={{
                    fontFamily: "'General Sans', 'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#A8B0BF",
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#A8B0BF")}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Hamburger toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            style={{
              color: "#A8B0BF",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              zIndex: 60,
              position: "relative",
            }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Full-height mobile overlay */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
          backgroundColor: "#080A0D",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "clamp(32px, 8vw, 64px)",
          paddingRight: "clamp(32px, 8vw, 64px)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Subtle grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(46,109,164,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(46,109,164,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            pointerEvents: "none",
          }}
        />

        <nav style={{ position: "relative", zIndex: 1 }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {navLinks.map((link, i) => (
              <li
                key={link.label}
                style={{
                  borderBottom: i < navLinks.length - 1 ? "1px solid rgba(28,37,53,0.6)" : "none",
                  opacity: mobileOpen ? 1 : 0,
                  transform: mobileOpen ? "translateX(0)" : "translateX(-24px)",
                  transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.07}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.07}s`,
                }}
              >
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="nav-mobile-link"
                  style={{
                    display: "inline-block",
                    fontFamily: "'Melodrama', 'Georgia', serif",
                    fontSize: "clamp(36px, 10vw, 56px)",
                    fontWeight: 500,
                    color: "#e8ecf0",
                    letterSpacing: "-0.01em",
                    textDecoration: "none",
                    padding: "clamp(16px, 3vw, 24px) 0",
                    lineHeight: 1.1,
                    transition: "color 0.2s ease",
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Bottom detail */}
          <div
            style={{
              marginTop: "clamp(32px, 6vw, 48px)",
              display: "flex",
              gap: "24px",
              opacity: mobileOpen ? 1 : 0,
              transition: `opacity 0.5s ease ${0.08 + navLinks.length * 0.07}s`,
            }}
          >
            {["Mumbai", "St. Louis"].map((city) => (
              <span
                key={city}
                style={{
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#3F8BC3",
                  opacity: 0.7,
                }}
              >
                {city}
              </span>
            ))}
          </div>
        </nav>
      </div>

      <style>{`
        .nav-desktop-link {
          position: relative;
        }
        .nav-desktop-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -3px;
          width: 0;
          height: 1px;
          background: #FFFFFF;
          transition: width 0.25s ease;
        }
        .nav-desktop-link:hover::after {
          width: 100%;
        }
        .nav-mobile-link:hover {
          color: #36C0C7 !important;
        }
        .nav-mobile-link {
          position: relative;
        }
        .nav-mobile-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 14px;
          width: 0;
          height: 1px;
          background: #36C0C7;
          transition: width 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .nav-mobile-link:hover::after {
          width: 100%;
        }
      `}</style>
    </>
  );
}
