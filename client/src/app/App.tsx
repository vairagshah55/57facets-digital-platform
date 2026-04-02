import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "../context/AuthContext";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminRetailers } from "./components/admin/AdminRetailers";
import { AdminProducts } from "./components/admin/AdminProducts";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { StoneCategories } from "./components/StoneCategories";
import { ManagementSection } from "./components/ManagementSection";
import { WhyPartnerSection } from "./components/WhyPartnerSection";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";
import { LoadingScreen } from "./components/LoadingScreen";
import { RetailerLogin } from "./components/RetailerLogin";
import { RetailerLayout } from "./components/RetailerLayout";
import { RetailerDashboard } from "./components/RetailerDashboard";
import { ProductCatalog } from "./components/ProductCatalog";
import { ProductDetail } from "./components/ProductDetail";
import { RetailerWishlist } from "./components/RetailerWishlist";
import { RetailerOrders } from "./components/RetailerOrders";
import { RetailerCollections } from "./components/RetailerCollections";

function HomePage() {
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
        <WhyPartnerSection />
        <StoneCategories />
        <ManagementSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  );
}

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/919952222385"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 9999,
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 24px rgba(37,211,102,0.5), 0 1px 6px rgba(0,0,0,0.3)",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.12)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(37,211,102,0.65), 0 2px 8px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 24px rgba(37,211,102,0.5), 0 1px 6px rgba(0,0,0,0.3)";
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.49.69 4.82 1.89 6.81L3 29l6.38-1.67A12.94 12.94 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white" fillOpacity="0.15"/>
        <path d="M16 5C9.925 5 5 9.925 5 16c0 2.196.63 4.244 1.72 5.97L5.5 26.5l4.65-1.215A10.95 10.95 0 0016 27c6.075 0 11-4.925 11-11S22.075 5 16 5z" fill="white"/>
        <path d="M21.5 18.8c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-1.54-.77-2.55-1.37-3.56-3.11-.27-.46.27-.43.77-1.43.08-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.58-.44H14c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.93.62.27 1.1.43 1.48.55.62.2 1.19.17 1.63.1.5-.07 1.54-.63 1.75-1.24.22-.6.22-1.12.15-1.23-.07-.11-.24-.17-.5-.3z" fill="#25D366"/>
      </svg>
    </a>
  );
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <WhatsAppButton />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/retailer/login" element={<RetailerLogin />} />
        <Route path="/retailer" element={<RetailerLayout />}>
          <Route path="dashboard" element={<RetailerDashboard />} />
          <Route path="catalog" element={<ProductCatalog />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="collections" element={<RetailerCollections />} />
          <Route path="wishlist" element={<RetailerWishlist />} />
          <Route path="orders" element={<RetailerOrders />} />
        </Route>
        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
        <Route path="/admin" element={<AdminAuthProvider><AdminLayout /></AdminAuthProvider>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="retailers" element={<AdminRetailers />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
