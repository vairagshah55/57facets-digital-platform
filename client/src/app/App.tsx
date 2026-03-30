import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "../context/AuthContext";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminRetailers } from "./components/admin/AdminRetailers";
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
        <StoneCategories />
        <ManagementSection />
        <WhyPartnerSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
