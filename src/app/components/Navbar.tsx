import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logoImg from "@/assets/Images/logo_png.png";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Management", href: "#management" },
  { label: "Why Partner", href: "#why-partner" },
  { label: "Collections", href: "#collections" },
  { label: "Contact", href: "#contact" },
];

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
        <a href="#" className="flex items-center" style={{ textDecoration: "none" }}>
          <img
            src={logoImg}
            alt="57 Facets"
            style={{
              height: "44px",
              width: "auto",
              objectFit: "contain",
            }}
          />
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

        {/* Mobile menu toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "#A8B0BF", background: "none", border: "none", cursor: "pointer" }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
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
