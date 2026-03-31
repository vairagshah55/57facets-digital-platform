import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import aboutImg from "@/assets/Images/About section image..jpg";

// ── Per-word animated span — each calls its own useTransform ─────────────────
function AnimatedWord({
  word,
  scrollYProgress,
  start,
  end,
  gradient = false,
}: {
  word: string;
  scrollYProgress: MotionValue<number>;
  start: number;
  end: number;
  gradient?: boolean;
}) {
  const opacity = useTransform(scrollYProgress, [start, end], [0.1, 1]);
  const y = useTransform(scrollYProgress, [start, end], [6, 0]);

  return (
    <motion.span
      className={gradient ? "gradient-text" : undefined}
      style={{
        opacity,
        y,
        display: "inline-block",
        willChange: "opacity, transform",
        ...(gradient ? {} : { color: "#f4f4f4" }),
      }}
    >
      {word}
      &nbsp;
    </motion.span>
  );
}

// ── Animated headline line — splits into words ────────────────────────────────
function AnimatedHeadline({
  text,
  scrollYProgress,
  wordOffset,
  totalWords,
  gradient = false,
  style,
}: {
  text: string;
  scrollYProgress: MotionValue<number>;
  wordOffset: number;
  totalWords: number;
  gradient?: boolean;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");
  const rangeEnd = 0.72;
  const wordSpan = rangeEnd / totalWords;

  return (
    <p style={{ margin: 0, lineHeight: 1.06, ...style }}>
      {words.map((word, i) => {
        const globalIdx = wordOffset + i;
        const start = globalIdx * wordSpan;
        const end = start + wordSpan * 1.6;
        // gradient only on the very last word of this line when gradient=true
        const isGradientWord = gradient && i === words.length - 1;
        return (
          <AnimatedWord
            key={i}
            word={word}
            scrollYProgress={scrollYProgress}
            start={Math.min(start, 0.95)}
            end={Math.min(end, 1)}
            gradient={isGradientWord}
          />
        );
      })}
    </p>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyVisible, setBodyVisible] = useState(false);

  // Scroll-linked progress scoped to the headlines block
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.5", "start -0.1"],
  });

  // Body row observer — resets every time row enters/leaves viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setBodyVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (bodyRef.current) observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, []);

  // const line1 = "Precision is the Point.";
  // const line2 = "Every Diamond Has";
  // const line3 = "57 Facets.";
  const line1 = "Innovation";
   const line2 = "in Every Cut";
  // const line3 = "57 Facets.";
  const line1Words = line1.split(" ");
  const line2Words = line2.split(" ");
  // const line3Words = line3.split(" ");
  // const totalWords = line1Words.length + line2Words.length + line3Words.length;
   const totalWords = line1Words.length  + line2Words.length;

  const headlineStyle: React.CSSProperties = {
    fontFamily: "'Melodrama', 'Georgia', serif",
    fontSize: "clamp(46px, 5.6vw, 76px)",
    fontWeight: 500,
    letterSpacing: "-0.02em",
    lineHeight: 1.06,
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{
        backgroundColor: "#080A0D",
        padding: "80px clamp(24px, 6vw, 80px)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── Scroll-revealed headlines ── */}
        <div ref={headlineRef} style={{ marginBottom: "52px" }}>
            <AnimatedHeadline
            text={line1}
            scrollYProgress={scrollYProgress}
            wordOffset={0}
            totalWords={totalWords}
            gradient={false}
            style={{ ...headlineStyle, marginBottom: "0.1em" }}
          />
           <AnimatedHeadline
            text={line2}
            scrollYProgress={scrollYProgress}
            wordOffset={line1Words.length}
            totalWords={totalWords}
            gradient={false}
            style={{ ...headlineStyle, marginBottom: "0.05em" }}
          />
          {/* <AnimatedHeadline
            text={line3}
            scrollYProgress={scrollYProgress}
            wordOffset={line1Words.length + line2Words.length}
            totalWords={totalWords}
            gradient={true}
            style={headlineStyle}
          /> ── */}
        </div>

        {/* ── Row: image left + text right ── */}
        <div
          ref={bodyRef}
          className="about-body"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "clamp(40px, 5vw, 72px)",
          }}
        >
          {/* Image */}
          <div
            style={{
              flex: "0 0 auto",
              alignSelf: "flex-start",
              opacity: bodyVisible ? 1 : 0,
              transform: bodyVisible ? "translateX(0)" : "translateX(-72px)",
              transition:
                "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
          >
            <img
              src={aboutImg}
              alt="57 Facets diamond jewellery"
              style={{
                height: "clamp(220px, 26vw, 340px)",
                width: "auto",
                display: "block",
                borderRadius: "8px",
              }}
            />
          </div>

          {/* Body text */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: "clamp(280px, 34vw, 460px)",
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "clamp(14px, 2vw, 20px)",
              opacity: bodyVisible ? 1 : 0,
              transform: bodyVisible ? "translateX(0)" : "translateX(72px)",
              transition:
                "opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.22s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.22s",
            }}
          >
            {[
              "For over three decades, 57 Facets has stood as a symbol of trust, legacy, and excellence in the world of fine diamond jewellery. Based in Mumbai, we proudly supply retailers across India and international markets, offering jewellery that blends modern design innovation with exceptional craftsmanship and integrity. We have our offices in Mumbai and St. Louis (USA).",
              "From timeless solitaires to contemporary statement pieces, every jewel is created to global export standards, with uncompromising finishing, transparency in pricing, and reliable logistics. Our long-standing relationships with reputed jewellers are built not just on diamonds, but on the values of honesty, consistency, and mutual respect.",
              "We carry forward a vision that balances heritage with innovation, ensuring that every client experiences not just jewellery, but a relationship built on transparency, values, and brilliance. At 57 Facets, we don't just deliver jewellery — we deliver trust, long-term partnerships, and brilliance that lasts generations.",
            ].map((text, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "'General Sans', 'Inter', sans-serif",
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  fontWeight: 400,
                  color: "#8A929F",
                  lineHeight: 1.78,
                  margin: 0,
                }}
              >
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-body {
            flex-direction: column !important;
          }
          .about-body > div:first-child img {
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .about-body > div:last-child {
            padding: 24px 0 !important;
            min-height: unset !important;
          }
        }
      `}</style>
    </section>
  );
}
