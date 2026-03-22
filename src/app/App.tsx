import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { ManagementSection } from "./components/ManagementSection";
import { WhyPartnerSection } from "./components/WhyPartnerSection";
import { ShowroomPreview } from "./components/ShowroomPreview";
import { StoneCategories } from "./components/StoneCategories";
import { ContactSection } from "./components/ContactSection";

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
      <ManagementSection />
      <WhyPartnerSection />
      <ShowroomPreview />
      <StoneCategories />
      <ContactSection />
    </div>
  );
}