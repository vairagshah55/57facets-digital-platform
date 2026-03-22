import { useEffect, useState } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Collections", href: "#collections" },
  { label: "New Arrivals", href: "#new-arrivals" },
  { label: "Sell Your Jewelry", href: "#sell" },
  { label: "Maison", href: "#maison" },
];

function DiamondMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,2 10,12 18,12" fill="#3880BE" />
      <polygon points="18,2 26,12 18,12" fill="#2660A0" />
      <polygon points="10,12 2,22 14,22" fill="#2660A0" />
      <polygon points="10,12 14,22 18,12" fill="#30B8BF" opacity="0.9" />
      <polygon points="26,12 18,12 22,22" fill="#30B8BF" opacity="0.9" />
      <polygon points="26,12 22,22 34,22" fill="#3880BE" />
      <polygon points="2,22 14,22 18,34" fill="#2660A0" opacity="0.65" />
      <polygon points="14,22 22,22 18,34" fill="#A8B0BF" opacity="0.4" />
      <polygon points="22,22 34,22 18,34" fill="#3880BE" opacity="0.65" />
    </svg>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? "rgba(8,10,13,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(28,37,53,0.9)" : "1px solid transparent",
      }}
    >
      <div className="max-w-screen-xl mx-auto px-8 h-20 flex items-center justify-between">

        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
          <DiamondMark />
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                fontSize: "17px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              57 Facets
            </span>
            <span
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "9px",
                fontWeight: 400,
                color: "#636B7A",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                marginTop: "3px",
              }}
            >
              Diamond Jewellery
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-10" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
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
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.color = "#A8B0BF";
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right Side — Cart only */}
        <div className="flex items-center gap-5">
          <button
            className="relative hidden md:flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
            style={{
              border: "1px solid rgba(28,37,53,0.9)",
              backgroundColor: "rgba(19,26,37,0.5)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3880BE";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(38,96,160,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(28,37,53,0.9)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(19,26,37,0.5)";
            }}
          >
            <ShoppingBag size={15} color="#A8B0BF" />
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "#30B8BF",
                fontFamily: "'General Sans', sans-serif",
                fontSize: "9px",
                fontWeight: 600,
                color: "#080A0D",
              }}
            >
              0
            </span>
          </button>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#A8B0BF", background: "none", border: "none", cursor: "pointer" }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-8 pb-8 pt-2 flex flex-col gap-6"
          style={{
            backgroundColor: "rgba(8,10,13,0.98)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(28,37,53,0.5)",
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: "'General Sans', 'Inter', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "#A8B0BF",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
