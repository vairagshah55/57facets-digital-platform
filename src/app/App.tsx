import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { StoneCategories } from "./components/StoneCategories";
import { ManagementSection } from "./components/ManagementSection";
import { WhyPartnerSection } from "./components/WhyPartnerSection";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div
      style={{
        backgroundColor: "#080A0D",
        minHeight: "100vh",
        fontFamily: "'General Sans', 'Inter', sans-serif",
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
  );
}
