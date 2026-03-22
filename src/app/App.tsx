import { useState, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { StoneCategories } from "./components/StoneCategories";
import { ManagementSection } from "./components/ManagementSection";
import { WhyPartnerSection } from "./components/WhyPartnerSection";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";
import { LoadingScreen } from "./components/LoadingScreen";

export default function App() {
  const [loading, setLoading] = useState(true);
  const handleLoadComplete = useCallback(() => setLoading(false), []);

  return (
    <>
      {loading && <LoadingScreen onComplete={handleLoadComplete} />}
      <div
        style={{
          backgroundColor: "#080A0D",
          minHeight: "100vh",
          fontFamily: "'General Sans', 'Inter', sans-serif",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.5s ease 0.1s",
        }}
      >
        <Navbar />
        <HeroSection />
        <AboutSection />
        <StoneCategories />
        <ManagementSection />
        <WhyPartnerSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  );
}
