import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AuthProvider } from "../context/AuthContext";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminRetailers } from "./components/admin/AdminRetailers";
import { AdminProducts } from "./components/admin/AdminProducts";
import { AdminProductWizard } from "./components/admin/AdminProductWizard";
import { AdminOrders } from "./components/admin/AdminOrders";
import { AdminNotifications } from "./components/admin/AdminNotifications";
import { RetailerNotifications } from "./components/RetailerNotifications";
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
import { CategoryGallery } from "./components/CategoryGallery";
import { ThemeProvider } from "../context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

function HomePage() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
    const state = location.state as any;
    const section = state?.scrollTo || (state?.scrollToContact ? "contact" : null);
    if (section) {
      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [location.state]);

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
  const [hovered, setHovered] = useState(false);
  const location = useLocation();

  // Hide on admin and retailer routes
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/retailer")) {
    return null;
  }

  return (
    <a
      href="https://wa.me/919952222385"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 9999,
        height: "52px",
        borderRadius: "9999px",
        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 20px 0 16px",
        boxShadow: hovered
          ? "0 8px 32px rgba(37,211,102,0.65), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 4px 24px rgba(37,211,102,0.5), 0 1px 6px rgba(0,0,0,0.3)",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease",
        textDecoration: "none",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.49.69 4.82 1.89 6.81L3 29l6.38-1.67A12.94 12.94 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white" fillOpacity="0.15"/>
        <path d="M16 5C9.925 5 5 9.925 5 16c0 2.196.63 4.244 1.72 5.97L5.5 26.5l4.65-1.215A10.95 10.95 0 0016 27c6.075 0 11-4.925 11-11S22.075 5 16 5z" fill="white"/>
        <path d="M21.5 18.8c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-1.54-.77-2.55-1.37-3.56-3.11-.27-.46.27-.43.77-1.43.08-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.58-.44H14c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.93.62.27 1.1.43 1.48.55.62.2 1.19.17 1.63.1.5-.07 1.54-.63 1.75-1.24.22-.6.22-1.12.15-1.23-.07-.11-.24-.17-.5-.3z" fill="#25D366"/>
      </svg>
      <span style={{
        fontFamily: "'General Sans', 'Inter', sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        color: "#FFFFFF",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}>
        Chat with us
      </span>
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
        <Route path="/category/:name" element={<CategoryGallery />} />
        <Route path="/retailer/login" element={<RetailerLogin />} />
        <Route path="/retailer" element={<ThemeProvider><RetailerLayout /></ThemeProvider>}>
          <Route path="dashboard" element={<RetailerDashboard />} />
          <Route path="catalog" element={<ProductCatalog />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="collections" element={<RetailerCollections />} />
          <Route path="wishlist" element={<RetailerWishlist />} />
          <Route path="orders" element={<RetailerOrders />} />
          <Route path="notifications" element={<RetailerNotifications />} />
        </Route>
        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
        <Route path="/admin" element={<AdminAuthProvider><AdminLayout /></AdminAuthProvider>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="retailers" element={<AdminRetailers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductWizard />} />
          <Route path="products/:id/edit" element={<AdminProductWizard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </BrowserRouter>
    </AuthProvider>
  );
}
