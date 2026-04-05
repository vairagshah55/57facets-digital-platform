import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Share2,
  Play,
  RotateCcw,
  Minus,
  Plus,
  ShoppingCart,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
  Diamond,
  Gem,
  Ruler,
  Weight,
  Palette,
  Shield,
  Award,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { products as productsApi, wishlist as wishlistApi, orders as ordersApi, imageUrl } from "../../lib/api";
import { useCart } from "../../context/CartContext";

import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img5 from "../../assets/Images/5.jpg";
import img7 from "../../assets/Images/7.jpg";
import productVideo from "../../assets/Videos/5327599-hd_1280_720_30fps.mp4";

/* ═══════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════ */

const FALLBACK_IMAGES = [img1, img3, img5, img7];

const CARAT_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

interface ProductData {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  availability: string;
  basePrice: number;
  images: string[];
  video: string;
  isNew: boolean;
  goldPricePerGram: number;
  specs: {
    metalType: string;
    metalWeight: string;
    diamondType: string;
    diamondShape: string;
    diamondClarity: string;
    diamondColor: string;
    diamondCarat: number;
    diamondCertification: string;
    settingType: string;
    hallmark: string;
    width: string;
    height: string;
  };
  customization: {
    goldTypes: string[];
    goldColours: string[];
    diamondShapes: string[];
    diamondShades: string[];
    diamondQualities: string[];
    colorStoneNames: string[];
    colorStoneQualities: string[];
    caratOptions: number[];
  };
}

/** Map API response to the shape our component expects */
function mapApiProduct(raw: any): ProductData {
  const apiImages =
    raw.images && raw.images.length > 0
      ? raw.images
          .filter((img: any) => img.media_type !== "video")
          .map((img: any) => imageUrl(img.image_url))
      : [];
  const videoEntry =
    raw.images && raw.images.find((img: any) => img.media_type === "video");

  return {
    id: raw.id,
    name: raw.name || "Untitled Product",
    description: raw.description || "",
    category: raw.category || "",
    sku: raw.sku || "",
    availability: raw.availability || "in-stock",
    basePrice: Number(raw.base_price) || 0,
    images: apiImages.length > 0 ? apiImages : FALLBACK_IMAGES,
    video: videoEntry ? imageUrl(videoEntry.image_url) : productVideo,
    isNew: Boolean(raw.is_new),
    goldPricePerGram: Number(raw.goldPricePerGram) || 6250,
    specs: {
      metalType: raw.metal_type || "18K White Gold",
      metalWeight: raw.metal_weight ? `${raw.metal_weight} g` : "0 g",
      diamondType: raw.diamond_type || "Natural Diamond",
      diamondShape: raw.diamond_shape || "Round Brilliant",
      diamondClarity: raw.diamond_clarity || "-",
      diamondColor: raw.diamond_color || "-",
      diamondCarat: Number(raw.carat) || 1.0,
      diamondCertification: raw.diamond_certification || "-",
      settingType: raw.setting_type || "-",
      hallmark: raw.hallmark || "-",
      width: raw.width_mm ? `${raw.width_mm} mm` : "-",
      height: raw.height_mm ? `${raw.height_mm} mm` : "-",
    },
    customization: {
      goldTypes: raw.metal_type ? String(raw.metal_type).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      goldColours: raw.gold_colour ? String(raw.gold_colour).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      diamondShapes: raw.diamond_shape ? String(raw.diamond_shape).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      diamondShades: raw.diamond_color ? String(raw.diamond_color).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      diamondQualities: raw.diamond_clarity ? String(raw.diamond_clarity).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      colorStoneNames: raw.color_stone_name ? String(raw.color_stone_name).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      colorStoneQualities: raw.color_stone_quality ? String(raw.color_stone_quality).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      caratOptions: Array.isArray(raw.carat_options) ? raw.carat_options.map(Number) : [],
    },
  };
}

/* ═══════════════════════════════════════════════════════
   PRICE CALCULATION
   ═══════════════════════════════════════════════════════ */

function calculatePrice(
  baseCarat: number,
  selectedCarat: number,
  basePrice: number,
  metalWeight: number,
  goldPrice: number
) {
  const caratMultiplier = selectedCarat / baseCarat;
  const diamondPrice = basePrice * 0.65 * caratMultiplier;
  const metalPrice = metalWeight * goldPrice;
  const makingCharges = basePrice * 0.12;
  return Math.round(diamondPrice + metalPrice + makingCharges);
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data fetching state
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image gallery
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Customization
  const [selectedCarat, setSelectedCarat] = useState(1.0);
  const [selectedGoldType, setSelectedGoldType] = useState("");
  const [selectedGoldColour, setSelectedGoldColour] = useState("");
  const [selectedDiamondShape, setSelectedDiamondShape] = useState("");
  const [selectedDiamondShade, setSelectedDiamondShade] = useState("");
  const [selectedDiamondQuality, setSelectedDiamondQuality] = useState("");
  const [selectedColorStone, setSelectedColorStone] = useState("");
  const [selectedColorStoneQuality, setSelectedColorStoneQuality] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  // Cart
  const { addItem, items: cartItems } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [existingOrder, setExistingOrder] = useState<{ order_number: string; status: string } | null>(null);

  // Is this product already in the current (not yet placed) cart?
  const alreadyInCart = cartItems.some((i) => i.productId === id);

  // ── Fetch product on mount ─────────────────────────
  useEffect(() => {
    if (!id) {
      setError("No product ID provided");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        const raw = await productsApi.detail(id!);
        if (cancelled) return;

        const mapped = mapApiProduct(raw);
        setProduct(mapped);
        setSelectedCarat(mapped.specs.diamondCarat);
        if (mapped.customization.goldTypes.length) setSelectedGoldType(mapped.customization.goldTypes[0]);
        if (mapped.customization.goldColours.length) setSelectedGoldColour(mapped.customization.goldColours[0]);
        if (mapped.customization.diamondShapes.length) setSelectedDiamondShape(mapped.customization.diamondShapes[0]);
        if (mapped.customization.diamondShades.length) setSelectedDiamondShade(mapped.customization.diamondShades[0]);
        if (mapped.customization.diamondQualities.length) setSelectedDiamondQuality(mapped.customization.diamondQualities[0]);
        if (mapped.customization.colorStoneNames.length) setSelectedColorStone(mapped.customization.colorStoneNames[0]);
        if (mapped.customization.colorStoneQualities.length) setSelectedColorStoneQuality(mapped.customization.colorStoneQualities[0]);

        // Check if retailer has an active (non-final) order for this product
        try {
          const check = await ordersApi.checkProduct(id!);
          if (!cancelled && check.hasActiveOrder && check.order) {
            setExistingOrder(check.order);
          }
        } catch { /* not logged in or no orders — ignore */ }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProduct();
    return () => { cancelled = true; };
  }, [id]);

  // ── Wishlist toggle ────────────────────────────────
  const handleWishlistToggle = useCallback(async () => {
    if (!product || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await wishlistApi.remove(product.id);
      } else {
        await wishlistApi.add(product.id);
      }
      setWishlisted((prev) => !prev);
    } catch (err: any) {
      console.error("Wishlist error:", err.message);
    } finally {
      setWishlistLoading(false);
    }
  }, [product, wishlisted, wishlistLoading]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    return (
      calculatePrice(
        product.specs.diamondCarat,
        selectedCarat,
        product.basePrice,
        parseFloat(product.specs.metalWeight),
        product.goldPricePerGram
      ) * quantity
    );
  }, [product, selectedCarat, quantity]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productImage: product.images[0] || "",
      quantity,
      unitPrice: Math.round(totalPrice / quantity),
      carat: selectedCarat,
      metalType: selectedGoldType || null,
      goldColour: selectedGoldColour || null,
      diamondShape: selectedDiamondShape || null,
      diamondShade: selectedDiamondShade || null,
      diamondQuality: selectedDiamondQuality || null,
      colorStoneName: selectedColorStone || null,
      colorStoneQuality: selectedColorStoneQuality || null,
      note: note || null,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, addItem, quantity, totalPrice, selectedCarat, selectedGoldType, selectedGoldColour, selectedDiamondShape, selectedDiamondShade, selectedDiamondQuality, selectedColorStone, selectedColorStoneQuality, note]);

  const formatPrice = (p: number) =>
    "₹" + p.toLocaleString("en-IN");

  const prevImage = useCallback(() => {
    if (!product) return;
    setShowVideo(false);
    setActiveImage((i) => (i === 0 ? product.images.length - 1 : i - 1));
  }, [product]);

  const nextImage = useCallback(() => {
    if (!product) return;
    setShowVideo(false);
    setActiveImage((i) => (i === product.images.length - 1 ? 0 : i + 1));
  }, [product]);

  // ── Loading state ──────────────────────────────────
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2
            className="w-10 h-10 animate-spin"
            style={{ color: "var(--sf-teal)" }}
          />
          <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
            Loading product details...
          </p>
        </div>
      </main>
    );
  }

  // ── Error state ────────────────────────────────────
  if (error || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Diamond className="w-12 h-12" style={{ color: "var(--sf-text-muted)" }} />
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--sf-text-primary)" }}
          >
            Product Not Found
          </h2>
          <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>
            {error || "The product you're looking for doesn't exist or has been removed."}
          </p>
        </div>
      </main>
    );
  }

  return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ═══ LEFT: Image Gallery ═══════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Main Image / Video */}
            <div
              className="relative aspect-square rounded-2xl overflow-hidden mb-3"
              style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
            >
              <AnimatePresence mode="wait">
                {showVideo ? (
                  <motion.video
                    key="video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={product.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <motion.img
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    src={product.images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </AnimatePresence>

              {/* Nav arrows */}
              {!showVideo && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{
                      backgroundColor: "rgba(8, 10, 13, 0.6)",
                      color: "var(--sf-text-primary)",
                    }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
                    style={{
                      backgroundColor: "rgba(8, 10, 13, 0.6)",
                      color: "var(--sf-text-primary)",
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              {product.isNew && (
                <Badge
                  className="absolute top-3 left-3 text-xs"
                  style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
                >
                  NEW
                </Badge>
              )}

              {/* Image counter */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(8, 10, 13, 0.6)",
                  color: "var(--sf-text-secondary)",
                }}
              >
                {showVideo ? "Video" : `${activeImage + 1} / ${product.images.length}`}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveImage(i); setShowVideo(false); }}
                  className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all"
                  style={{
                    borderColor:
                      !showVideo && activeImage === i
                        ? "var(--sf-teal)"
                        : "var(--sf-divider)",
                    opacity: !showVideo && activeImage === i ? 1 : 0.6,
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {/* Video thumb */}
              <button
                onClick={() => setShowVideo(true)}
                className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all relative"
                style={{
                  borderColor: showVideo ? "var(--sf-teal)" : "var(--sf-divider)",
                  opacity: showVideo ? 1 : 0.6,
                  backgroundColor: "var(--sf-bg-surface-2)",
                }}
              >
                <video src={product.video} muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-5 h-5" style={{ color: "var(--sf-text-primary)" }} fill="white" />
                </div>
              </button>
              {/* 360° placeholder */}
              <button
                className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 flex flex-col items-center justify-center gap-1"
                style={{
                  borderColor: "var(--sf-divider)",
                  backgroundColor: "var(--sf-bg-surface-2)",
                  opacity: 0.6,
                }}
              >
                <RotateCcw className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                  360°
                </span>
              </button>
            </div>
          </motion.div>

          {/* ═══ RIGHT: Product Info ═══════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            {/* Header */}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--sf-teal)" }}>
                {product.category}
              </p>
              <h1
                className="text-2xl sm:text-3xl font-semibold mb-2"
                style={{
                  fontFamily: "'Melodrama', 'Georgia', serif",
                  color: "var(--sf-text-primary)",
                }}
              >
                {product.name}
              </h1>
              <p className="text-sm mb-3" style={{ color: "var(--sf-text-secondary)" }}>
                {product.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <AvailabilityBadge status={product.availability} />
                <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                  SKU: {product.sku}
                </span>
              </div>
            </div>

            <Separator className="mb-5" style={{ backgroundColor: "var(--sf-divider)" }} />

            {/* Price */}
            <div className="mb-6">
              <p className="text-xs mb-1" style={{ color: "var(--sf-text-muted)" }}>
                Estimated Price
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-semibold"
                  style={{ color: "var(--sf-text-primary)" }}
                >
                  {formatPrice(totalPrice)}
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Price includes diamond, metal, and making charges.</p>
                    <p>Gold rate: {formatPrice(product.goldPricePerGram)}/g (live)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>
                Gold rate: {formatPrice(product.goldPricePerGram)}/g (live) &bull; Making charges: 12%
              </p>
            </div>

            {/* ── Customization ────────────────────────── */}
            <div className="rounded-2xl border mb-5 overflow-hidden"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                borderColor: existingOrder ? "rgba(245,158,11,0.3)" : "var(--sf-divider)",
              }}>

              {/* Header */}
              <div className="px-5 py-3.5 flex items-center gap-2.5"
                style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                {existingOrder ? (
                  <>
                    <Shield className="w-4 h-4" style={{ color: "#f59e0b" }} />
                    <span className="text-[13px] font-semibold" style={{ color: "#f59e0b", fontFamily: "'Melodrama', 'Georgia', serif" }}>
                      Order Locked
                    </span>
                    <span className="ml-auto text-[10px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                      {existingOrder.order_number} · {existingOrder.status}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                    <span className="text-[13px] font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
                      Customize Your Piece
                    </span>
                  </>
                )}
              </div>

              {/* Locked overlay notice */}
              {existingOrder && (
                <div className="px-5 py-3 flex items-center gap-2.5"
                  style={{ background: "rgba(245,158,11,0.06)", borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
                  <Info className="w-3.5 h-3.5 shrink-0" style={{ color: "#f59e0b" }} />
                  <p className="text-[11px]" style={{ color: "#f59e0b" }}>
                    Customization is locked because this product has an active order. Cancel the order to make changes.
                  </p>
                </div>
              )}

              {/* Lock wrapper — disables all interaction when order exists */}
              <div style={{ pointerEvents: existingOrder ? "none" : "auto", opacity: existingOrder ? 0.55 : 1, transition: "opacity 0.2s" }}>

              {/* ─── Metal ──────────────────────────────── */}
              {(product.customization.goldTypes.length > 0 || product.customization.goldColours.length > 0) && (() => {
                const swatchMap: Record<string, { bg: string; label: string }> = {
                  YELLOW: { bg: "linear-gradient(145deg, #F5D66B, #B8860B)", label: "Yellow" },
                  ROSE: { bg: "linear-gradient(145deg, #EDAFB8, #8B4557)", label: "Rose" },
                  WHITE: { bg: "linear-gradient(145deg, #F0F0F0, #9E9E9E)", label: "White" },
                  "TWO TONE": { bg: "linear-gradient(145deg, #F5D66B 42%, #D0D0D0 58%)", label: "Two Tone" },
                };
                const sw = swatchMap[selectedGoldColour || product.customization.goldColours[0]] || swatchMap.YELLOW;
                const purity = selectedGoldType || product.customization.goldTypes[0] || "";
                return (
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.25), rgba(212,168,67,0.07))", border: "1px solid rgba(212,168,67,0.28)" }}>
                          <Palette className="w-4 h-4" style={{ color: "#D4A843" }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Metal</p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Select purity & colour</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                        style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.26)" }}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sw.bg }} />
                        <span className="text-[11px] font-bold" style={{ color: "#D4A843" }}>
                          {[purity, sw.label].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </div>

                    {/* Single row: Purity | Colour */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {product.customization.goldTypes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--sf-text-muted)" }}>Purity</span>
                          <div className="flex gap-1.5">
                            {product.customization.goldTypes.map((opt) => {
                              const active = selectedGoldType === opt;
                              return (
                                <button key={opt} onClick={() => setSelectedGoldType(opt)}
                                  className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-200"
                                  style={{
                                    background: active ? "linear-gradient(135deg, rgba(212,168,67,0.22), rgba(212,168,67,0.07))" : "rgba(255,255,255,0.03)",
                                    border: active ? "1.5px solid rgba(212,168,67,0.58)" : "1px solid rgba(255,255,255,0.08)",
                                    color: active ? "#D4A843" : "var(--sf-text-secondary)",
                                    boxShadow: active ? "0 0 0 3px rgba(212,168,67,0.1), 0 4px 12px rgba(212,168,67,0.2)" : "none",
                                    transform: active ? "translateY(-1px)" : "none",
                                  }}>{opt}</button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {product.customization.goldTypes.length > 0 && product.customization.goldColours.length > 0 && (
                        <div className="w-px self-stretch rounded-full" style={{ background: "rgba(255,255,255,0.08)", minHeight: 28 }} />
                      )}

                      {product.customization.goldColours.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--sf-text-muted)" }}>Colour</span>
                          <div className="flex gap-1.5">
                            {product.customization.goldColours.map((opt) => {
                              const active = selectedGoldColour === opt;
                              const s = swatchMap[opt] || swatchMap.YELLOW;
                              return (
                                <button key={opt} onClick={() => setSelectedGoldColour(opt)}
                                  className="relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                                  style={{
                                    background: active ? "linear-gradient(135deg, rgba(212,168,67,0.18), rgba(212,168,67,0.05))" : "rgba(255,255,255,0.03)",
                                    border: active ? "1.5px solid rgba(212,168,67,0.52)" : "1px solid rgba(255,255,255,0.08)",
                                    boxShadow: active ? "0 0 0 3px rgba(212,168,67,0.08), 0 4px 12px rgba(212,168,67,0.18)" : "none",
                                    transform: active ? "translateY(-1px)" : "none",
                                  }}>
                                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: s.bg }} />
                                  <span className="text-[11px] font-bold" style={{ color: active ? "#D4A843" : "var(--sf-text-secondary)" }}>{s.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ─── Diamond ─────────────────────────────── */}
              {(product.customization.diamondShapes.length > 0 || product.customization.diamondShades.length > 0 || product.customization.diamondQualities.length > 0) && (() => {
                const shape = selectedDiamondShape || product.customization.diamondShapes[0] || "";
                const shade = selectedDiamondShade || product.customization.diamondShades[0] || "";
                const clarity = selectedDiamondQuality || product.customization.diamondQualities[0] || "";
                const fields = [
                  { label: "Shape", options: product.customization.diamondShapes, selected: selectedDiamondShape, set: setSelectedDiamondShape },
                  { label: "Shade", options: product.customization.diamondShades, selected: selectedDiamondShade, set: setSelectedDiamondShade },
                  { label: "Clarity", options: product.customization.diamondQualities, selected: selectedDiamondQuality, set: setSelectedDiamondQuality },
                ].filter((f) => f.options.length > 0);
                return (
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, rgba(48,184,191,0.25), rgba(48,184,191,0.07))", border: "1px solid rgba(48,184,191,0.28)" }}>
                          <Diamond className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Diamond</p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Select cut, shade & clarity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                        style={{ background: "rgba(48,184,191,0.08)", border: "1px solid rgba(48,184,191,0.22)" }}>
                        <span className="text-[11px] font-bold" style={{ color: "var(--sf-teal)" }}>
                          {[shape, shade, clarity].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </div>

                    {/* Single row: Shape | Shade | Clarity */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {fields.map((field, fi) => (
                        <>
                          {fi > 0 && (
                            <div key={`div-${fi}`} className="w-px self-stretch rounded-full" style={{ background: "rgba(255,255,255,0.08)", minHeight: 28 }} />
                          )}
                          <div key={field.label} className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--sf-text-muted)" }}>{field.label}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {field.options.map((opt) => {
                                const active = field.selected === opt;
                                return (
                                  <button key={opt} onClick={() => field.set(opt)}
                                    className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-200"
                                    style={{
                                      background: active
                                        ? "linear-gradient(135deg, rgba(48,184,191,0.22), rgba(48,184,191,0.07))"
                                        : "rgba(255,255,255,0.03)",
                                      border: active ? "1.5px solid rgba(48,184,191,0.6)" : "1px solid rgba(255,255,255,0.08)",
                                      color: active ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                                      boxShadow: active ? "0 0 0 3px rgba(48,184,191,0.1), 0 4px 12px rgba(48,184,191,0.2)" : "none",
                                      transform: active ? "translateY(-1px)" : "none",
                                    }}>{opt}</button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ))}
                    </div>
                    {/* Carat */}
                    <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(48,184,191,0.25), rgba(48,184,191,0.07))", border: "1px solid rgba(48,184,191,0.28)" }}>
                            <Sparkles className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Carat Weight</p>
                            <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Select diamond weight</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1 px-4 py-2 rounded-full"
                          style={{ background: "rgba(48,184,191,0.1)", border: "1px solid rgba(48,184,191,0.24)" }}>
                          <span className="text-[18px] font-black leading-none" style={{ color: "var(--sf-teal)" }}>{selectedCarat}</span>
                          <span className="text-[11px] font-bold" style={{ color: "rgba(48,184,191,0.6)" }}>ct</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {(product.customization.caratOptions.length ? product.customization.caratOptions : CARAT_OPTIONS)
                          .sort((a, b) => a - b)
                          .map((ct) => {
                            const active = selectedCarat === ct;
                            return (
                              <button key={ct} onClick={() => setSelectedCarat(ct)}
                                className="relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200"
                                style={{
                                  width: 68, height: 68,
                                  background: active
                                    ? "linear-gradient(145deg, rgba(48,184,191,0.26), rgba(48,184,191,0.08))"
                                    : "rgba(255,255,255,0.025)",
                                  border: active ? "1.5px solid rgba(48,184,191,0.65)" : "1px solid rgba(255,255,255,0.07)",
                                  boxShadow: active
                                    ? "0 0 0 4px rgba(48,184,191,0.1), 0 8px 28px rgba(48,184,191,0.28), inset 0 1px 0 rgba(255,255,255,0.12)"
                                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                                  transform: active ? "translateY(-2px)" : "translateY(0)",
                                }}>
                                <span className="text-[16px] font-black leading-none"
                                  style={{ color: active ? "var(--sf-teal)" : "var(--sf-text-secondary)" }}>{ct}</span>
                                <span className="text-[9px] font-semibold tracking-widest mt-1.5 leading-none uppercase"
                                  style={{ color: active ? "rgba(48,184,191,0.65)" : "var(--sf-text-muted)" }}>ct</span>
                                {active && (
                                  <span className="absolute flex items-center justify-center rounded-full"
                                    style={{ top: -8, right: -8, width: 20, height: 20, background: "var(--sf-teal)", boxShadow: "0 2px 10px rgba(48,184,191,0.6)" }}>
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── Color Stones ─────────────────────────── */}
              {product.customization.colorStoneNames.length > 0 && (() => {
                const pairs = product.customization.colorStoneNames.map((name, i) => ({
                  name,
                  quality: product.customization.colorStoneQualities[i] || "",
                }));
                const gemPalette: Record<string, { dot: string; glow: string; bg: string; activeBg: string; border: string; text: string; tag: string }> = {
                  "Precious Stones":      { dot: "#27AE60", glow: "rgba(39,174,96,0.45)",   bg: "rgba(39,174,96,0.06)",   activeBg: "rgba(39,174,96,0.13)",   border: "rgba(39,174,96,0.38)",   text: "#2ECC71", tag: "rgba(39,174,96,0.15)"   },
                  "Semi Precious Stones": { dot: "#2980B9", glow: "rgba(41,128,185,0.45)",  bg: "rgba(41,128,185,0.06)",  activeBg: "rgba(41,128,185,0.13)",  border: "rgba(41,128,185,0.38)",  text: "#5DADE2", tag: "rgba(41,128,185,0.15)"  },
                  "Synthetic Stones":     { dot: "#C0392B", glow: "rgba(192,57,43,0.45)",   bg: "rgba(192,57,43,0.06)",   activeBg: "rgba(192,57,43,0.13)",   border: "rgba(192,57,43,0.38)",   text: "#E74C3C", tag: "rgba(192,57,43,0.15)"   },
                  "Pearl":                { dot: "#D4B896", glow: "rgba(212,184,150,0.45)", bg: "rgba(212,184,150,0.06)", activeBg: "rgba(212,184,150,0.13)", border: "rgba(212,184,150,0.38)", text: "#C9A882", tag: "rgba(212,184,150,0.15)" },
                  "Beads":                { dot: "#D68910", glow: "rgba(214,137,16,0.45)",  bg: "rgba(214,137,16,0.06)",  activeBg: "rgba(214,137,16,0.13)",  border: "rgba(214,137,16,0.38)",  text: "#F39C12", tag: "rgba(214,137,16,0.15)"  },
                  "Kundan":               { dot: "#B7950B", glow: "rgba(183,149,11,0.45)",  bg: "rgba(183,149,11,0.06)",  activeBg: "rgba(183,149,11,0.13)",  border: "rgba(183,149,11,0.38)",  text: "#D4A843", tag: "rgba(183,149,11,0.15)"  },
                };
                const fallback = { dot: "#8E44AD", glow: "rgba(142,68,173,0.45)", bg: "rgba(142,68,173,0.06)", activeBg: "rgba(142,68,173,0.13)", border: "rgba(142,68,173,0.38)", text: "#9B59B6", tag: "rgba(142,68,173,0.15)" };
                const selectedPair = pairs.find(p => p.name === selectedColorStone && p.quality === selectedColorStoneQuality);
                const selC = selectedPair ? (gemPalette[selectedPair.name] || fallback) : fallback;

                // Short label for category tag
                const categoryShort: Record<string, string> = {
                  "Precious Stones": "Precious",
                  "Semi Precious Stones": "Semi Precious",
                  "Synthetic Stones": "Synthetic",
                  "Pearl": "Pearl",
                  "Beads": "Beads",
                  "Kundan": "Kundan",
                };

                return (
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Section header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${selC.activeBg}, ${selC.bg})`,
                            border: `1px solid ${selC.border}`,
                            boxShadow: selectedColorStone ? `0 2px 10px ${selC.glow.replace("0.45", "0.3")}` : "none",
                          }}>
                          <Gem className="w-4 h-4 transition-colors duration-300" style={{ color: selC.dot }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Color Stones</p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Select stone & quality</p>
                        </div>
                      </div>
                      {selectedColorStone && (
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                          style={{ background: selC.activeBg, border: `1px solid ${selC.border}` }}>
                          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                            style={{ background: selC.dot, boxShadow: `0 0 6px ${selC.glow}` }} />
                          <span className="text-[11px] font-bold truncate max-w-[110px]" style={{ color: selC.text }}>
                            {selectedColorStoneQuality || selectedColorStone}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stone cards — 2-column grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {pairs.map((pair, i) => {
                        const active = selectedColorStone === pair.name && selectedColorStoneQuality === pair.quality;
                        const c = gemPalette[pair.name] || fallback;
                        const shortCat = categoryShort[pair.name] || pair.name;
                        return (
                          <button key={i}
                            onClick={() => { setSelectedColorStone(pair.name); setSelectedColorStoneQuality(pair.quality); }}
                            className="relative flex items-start gap-3 px-3.5 py-3.5 rounded-2xl text-left transition-all duration-200"
                            style={{
                              background: active
                                ? `linear-gradient(135deg, ${c.activeBg}, ${c.bg})`
                                : "rgba(255,255,255,0.025)",
                              border: active ? `1.5px solid ${c.border}` : "1px solid rgba(255,255,255,0.07)",
                              boxShadow: active ? `0 0 0 3px ${c.bg}, 0 8px 24px ${c.glow.replace("0.45", "0.2")}` : "none",
                              transform: active ? "translateY(-1px)" : "none",
                            }}>

                            {/* Gem orb */}
                            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 transition-all duration-200"
                              style={{
                                background: active
                                  ? `radial-gradient(circle at 32% 32%, ${c.dot}DD, ${c.dot}77)`
                                  : "rgba(255,255,255,0.05)",
                                boxShadow: active ? `0 4px 14px ${c.glow}` : "none",
                                border: active ? `1px solid ${c.dot}55` : "1px solid rgba(255,255,255,0.08)",
                              }}>
                              <Gem className="w-4.5 h-4.5" style={{ color: active ? "#fff" : "var(--sf-text-muted)", opacity: active ? 1 : 0.45, width: 18, height: 18 }} />
                            </div>

                            {/* Labels */}
                            <div className="flex flex-col min-w-0 flex-1 gap-1">
                              {/* Category tag */}
                              <span className="inline-flex self-start text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                style={{ background: active ? c.tag : "rgba(255,255,255,0.05)", color: active ? c.text : "var(--sf-text-muted)" }}>
                                {shortCat}
                              </span>
                              {/* Quality — primary */}
                              <span className="text-[12px] font-bold leading-snug truncate"
                                style={{ color: active ? c.text : "var(--sf-text-primary)" }}>
                                {pair.quality || "—"}
                              </span>
                            </div>

                            {/* Active check badge */}
                            {active && (
                              <span className="absolute flex items-center justify-center rounded-full"
                                style={{ top: -8, right: -8, width: 20, height: 20, background: c.dot, boxShadow: `0 2px 10px ${c.glow}` }}>
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ─── Quantity ─────────────────────────────── */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>Quantity</span>
                </div>
                <div className="flex items-center rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[rgba(48,184,191,0.08)]"
                    style={{ color: "var(--sf-text-muted)" }}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-11 h-9 flex items-center justify-center text-xs font-bold border-x"
                    style={{ color: "var(--sf-text-primary)", borderColor: "rgba(255,255,255,0.08)" }}>
                    {quantity}
                  </span>
                  <button onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[rgba(48,184,191,0.08)]"
                    style={{ color: "var(--sf-text-muted)" }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              </div>{/* end lock wrapper */}
            </div>

            {/* ── Note Section ─────────────────────────── */}
            <div className="mb-5">
              <button
                onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-2 text-sm font-medium mb-2"
                style={{ color: "var(--sf-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
              >
                <StickyNote className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                {showNote ? "Hide note" : "Add a note for this order"}
              </button>
              <AnimatePresence>
                {showNote && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      placeholder="E.g., engraving text, size preferences, special requests..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="border-[var(--sf-divider)] min-h-[80px]"
                      style={{
                        backgroundColor: "var(--sf-bg-surface-1)",
                        color: "var(--sf-text-primary)",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Action Buttons ───────────────────────── */}
            <div className="flex gap-3 mb-8">
              {existingOrder ? (
                /* Active order exists → block re-ordering */
                <Button
                  className="flex-1 h-12 text-base font-semibold gap-2"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.12)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                  onClick={() => navigate("/retailer/orders")}
                >
                  <Check className="w-5 h-5" />
                  {existingOrder.order_number} — {existingOrder.status}
                </Button>
              ) : alreadyInCart ? (
                /* Already in the current unsent cart */
                <Button
                  className="flex-1 h-12 text-base font-semibold gap-2"
                  style={{
                    backgroundColor: "rgba(48,184,191,0.1)",
                    color: "var(--sf-teal)",
                    border: "1.5px solid rgba(48,184,191,0.4)",
                  }}
                  onClick={() => navigate("/retailer/catalog")}
                >
                  <Check className="w-5 h-5" /> In Cart · Keep Shopping
                </Button>
              ) : (
                /* Normal add to cart */
                <Button
                  className="flex-1 h-12 text-base font-semibold gap-2 transition-all duration-200"
                  style={{
                    backgroundColor: addedToCart ? "#22c55e" : "var(--sf-teal)",
                    color: "var(--sf-bg-base)",
                    border: "none",
                    boxShadow: addedToCart
                      ? "0 4px 20px rgba(34,197,94,0.4)"
                      : "0 4px 20px rgba(48,184,191,0.3)",
                  }}
                  onClick={handleAddToCart}
                >
                  {addedToCart ? (
                    <><Check className="w-5 h-5" /> Added to Cart!</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-12 px-5 gap-2 border-[var(--sf-divider)]"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  color: wishlisted ? "#ef4444" : "var(--sf-text-secondary)",
                }}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                <Heart className="w-5 h-5" fill={wishlisted ? "#ef4444" : "none"} />
                {wishlisted ? "Wishlisted" : "Wishlist"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 border-[var(--sf-divider)]"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  color: "var(--sf-text-secondary)",
                }}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* ── Specifications Tabs ──────────────────── */}
            <Tabs defaultValue="specs">
              <TabsList
                className="w-full"
                style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
              >
                <TabsTrigger value="specs" className="flex-1 text-xs sm:text-sm">
                  Specifications
                </TabsTrigger>
                <TabsTrigger value="diamond" className="flex-1 text-xs sm:text-sm">
                  Diamond Details
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex-1 text-xs sm:text-sm">
                  Price Breakdown
                </TabsTrigger>
              </TabsList>

              <TabsContent value="specs" className="mt-4">
                <div
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--sf-bg-surface-1)",
                    borderColor: "var(--sf-divider)",
                  }}
                >
                  <SpecRow icon={<Palette />} label="Metal Type" value={[selectedGoldType, selectedGoldColour].filter(Boolean).join(" ") || product.specs.metalType} />
                  <SpecRow icon={<Weight />} label="Metal Weight" value={product.specs.metalWeight} />
                  <SpecRow icon={<Ruler />} label="Width" value={product.specs.width} />
                  <SpecRow icon={<Ruler />} label="Height" value={product.specs.height} />
                  <SpecRow icon={<Diamond />} label="Setting Type" value={product.specs.settingType} />
                  <SpecRow icon={<Shield />} label="Hallmark" value={product.specs.hallmark} last />
                </div>
              </TabsContent>

              <TabsContent value="diamond" className="mt-4">
                <div
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--sf-bg-surface-1)",
                    borderColor: "var(--sf-divider)",
                  }}
                >
                  <SpecRow icon={<Gem />} label="Diamond Type" value={product.specs.diamondType} />
                  <SpecRow icon={<Diamond />} label="Shape" value={product.specs.diamondShape} />
                  <SpecRow icon={<Sparkles />} label="Carat" value={`${selectedCarat} ct`} />
                  {(product.customization.caratOptions.length ? product.customization.caratOptions : CARAT_OPTIONS).length > 0 && (
                    <div className="flex items-start justify-between py-2.5 border-b" style={{ borderColor: "var(--sf-divider)" }}>
                      <div className="flex items-center gap-2">
                        <span className="[&>svg]:w-4 [&>svg]:h-4" style={{ color: "var(--sf-text-muted)" }}><Sparkles /></span>
                        <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>Carat Options</span>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
                        {[...(product.customization.caratOptions.length ? product.customization.caratOptions : CARAT_OPTIONS)]
                          .sort((a, b) => a - b)
                          .map((ct) => (
                            <span key={ct} className="text-[11px] font-semibold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: ct === selectedCarat ? "var(--sf-teal)" : "rgba(255,255,255,0.06)",
                                color: ct === selectedCarat ? "#fff" : "var(--sf-text-muted)",
                              }}>
                              {ct} ct
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                  <SpecRow icon={<Palette />} label="Color Grade" value={product.specs.diamondColor} />
                  <SpecRow icon={<Award />} label="Clarity Grade" value={product.specs.diamondClarity} />
                  <SpecRow icon={<Shield />} label="Certification" value={product.specs.diamondCertification} last />
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-4">
                <div
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: "var(--sf-bg-surface-1)",
                    borderColor: "var(--sf-divider)",
                  }}
                >
                  <PriceRow
                    label="Diamond Value"
                    value={formatPrice(
                      Math.round(product.basePrice * 0.65 * (selectedCarat / product.specs.diamondCarat))
                    )}
                    sub={`${selectedCarat} ct ${product.specs.diamondShape}`}
                  />
                  <PriceRow
                    label="Metal Value"
                    value={formatPrice(
                      Math.round(parseFloat(product.specs.metalWeight) * product.goldPricePerGram)
                    )}
                    sub={`${product.specs.metalWeight} × ${formatPrice(product.goldPricePerGram)}/g`}
                  />
                  <PriceRow
                    label="Making Charges"
                    value={formatPrice(Math.round(product.basePrice * 0.12))}
                    sub="12% of base price"
                  />
                  {quantity > 1 && (
                    <PriceRow
                      label="Quantity"
                      value={`× ${quantity}`}
                      sub=""
                    />
                  )}
                  <Separator className="my-3" style={{ backgroundColor: "var(--sf-divider)" }} />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                      Total
                    </span>
                    <span className="text-lg font-semibold" style={{ color: "var(--sf-teal)" }}>
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function AvailabilityBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    "in-stock": { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "In Stock" },
    "made-to-order": { bg: "rgba(48,184,191,0.15)", text: "var(--sf-teal)", label: "Made to Order" },
    "out-of-stock": { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)", label: "Out of Stock" },
  };
  const s = map[status] || map["in-stock"];
  return (
    <Badge
      className="text-xs"
      style={{ backgroundColor: s.bg, color: s.text, border: "none" }}
    >
      {s.label}
    </Badge>
  );
}

function SpecRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--sf-divider)" }}
    >
      <div className="flex items-center gap-2">
        <span className="[&>svg]:w-4 [&>svg]:h-4" style={{ color: "var(--sf-text-muted)" }}>
          {icon}
        </span>
        <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>
          {label}
        </span>
      </div>
      <span className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function PriceRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
      <span className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
