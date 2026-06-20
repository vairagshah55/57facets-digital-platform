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
  Lock,
  Info,
  Diamond,
  Gem,
  Ruler,
  Weight,
  Palette,
  Shield,
  Award,
  Sparkles,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { products as productsApi, wishlist as wishlistApi, orders as ordersApi, imageUrl } from "../../lib/api";
import { adminProducts } from "../../lib/adminApi";
import { useCart } from "../../context/CartContext";

import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img5 from "../../assets/Images/5.jpg";
import img7 from "../../assets/Images/7.jpg";

/* ═══════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════ */

const FALLBACK_IMAGES = [img1, img3, img5, img7];

const CARAT_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
const DIAMOND_SHAPES = ["Round", "Princess", "Pear", "Baguette", "Marquise", "Oval", "Emerald", "Cushion", "Radiant"];
const DIAMOND_SHADES = ["EF", "FG", "GH", "HI", "IJ"];
const DIAMOND_QUALITIES = ["VVS", "VVS-VS", "VS", "VS-SI", "SI"];
const DIAMOND_TYPES = ["Natural", "Lab-grown"];

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
  serverPrice: number | null;
  priceSource?: string;
  priceBreakdown?: any;
  diamonds: {
    type: string;
    shape: string;
    color: string;
    clarity: string;
    certification: string;
    carat: number | null;
  }[];
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
    // Fall back to SKU as the name when the product has no name.
    name: (raw.name && String(raw.name).trim()) ? raw.name : (raw.sku || "Untitled Product"),
    description: raw.description || "",
    category: raw.category || "",
    sku: raw.sku || "",
    availability: raw.availability || "in-stock",
    basePrice: Number(raw.base_price) || 0,
    serverPrice: raw.price != null ? Number(raw.price) : null,
    priceSource: raw.price_source,
    priceBreakdown: raw.price_breakdown || null,
    images: apiImages.length > 0 ? apiImages : FALLBACK_IMAGES,
    video: videoEntry ? imageUrl(videoEntry.image_url) : "",
    isNew: Boolean(raw.is_new),
    goldPricePerGram: Number(raw.goldPricePerGram) || 6250,
    diamonds: Array.isArray(raw.diamonds)
      ? raw.diamonds.map((d: any) => ({
        type: d.diamond_type || "",
        shape: d.diamond_shape || "",
        color: d.diamond_color || "",
        clarity: d.diamond_clarity || "",
        certification: d.diamond_certification || "",
        carat: d.carat != null ? Number(d.carat) : null,
      }))
      : [],
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
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function ProductDetail({ adminPreview = false, previewRetailerId }: { adminPreview?: boolean; previewRetailerId?: string } = {}) {
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
  const [selectedDiamondType, setSelectedDiamondType] = useState("");
  const [selectedDiamondIdx, setSelectedDiamondIdx] = useState(0);
  const [diamondMenuOpen, setDiamondMenuOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  // Cart
  const { addItem, items: cartItems } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [existingOrder, setExistingOrder] = useState<{ order_number: string; status: string } | null>(null);

  // Is this product already in the current (not yet placed) cart?
  const alreadyInCart = cartItems.some((i) => i.productId === id);

  // ── Scroll to top on mount ─────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

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
        const raw = adminPreview ? await adminProducts.preview(id!, previewRetailerId) : await productsApi.detail(id!);
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
        // (retailer-only — skipped in admin preview).
        if (!adminPreview) {
          try {
            const check = await ordersApi.checkProduct(id!);
            if (!cancelled && check.hasActiveOrder && check.order) {
              setExistingOrder(check.order);
            }
          } catch { /* not logged in or no orders — ignore */ }
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProduct();
    return () => { cancelled = true; };
  }, [id, adminPreview, previewRetailerId]);

  // ── Wishlist toggle ────────────────────────────────
  const handleWishlistToggle = useCallback(async () => {
    if (adminPreview || !product || wishlistLoading) return;
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
    // Per-retailer price computed by the server, fixed to the product's listed
    // configuration (base carat). Falls back to base_price if the server didn't price it.
    const unit = product.serverPrice ?? product.basePrice;
    return unit * quantity;
  }, [product, quantity]);

  const handleAddToCart = useCallback(() => {
    if (adminPreview || !product || product.availability === "out-of-stock") return;
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image skeleton */}
          <div>
            <div className="skeleton-shimmer aspect-square rounded-2xl mb-3" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer w-16 h-16 sm:w-20 sm:h-20 rounded-lg shrink-0" />
              ))}
            </div>
          </div>
          {/* Right: Info skeleton */}
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <div className="skeleton-shimmer h-3 w-24 rounded-md" />
              <div className="skeleton-shimmer h-7 w-3/4 rounded-md" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
            </div>
            <div className="skeleton-shimmer h-px w-full" />
            <div className="skeleton-shimmer h-8 w-32 rounded-md" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton-shimmer w-9 h-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton-shimmer h-3 w-20 rounded-md" />
                    <div className="skeleton-shimmer h-3.5 w-32 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            <div className="skeleton-shimmer h-px w-full" />
            <div className="flex gap-3 pt-2">
              <div className="skeleton-shimmer h-12 flex-1 rounded-xl" />
              <div className="skeleton-shimmer h-12 w-12 rounded-xl" />
            </div>
          </div>
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
              {showVideo && product.video ? (
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
                    backgroundColor: "var(--sf-overlay-bg)",
                    color: "var(--sf-text-primary)",
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: "var(--sf-overlay-bg)",
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
                backgroundColor: "var(--sf-overlay-bg)",
                color: "var(--sf-text-secondary)",
              }}
            >
              {showVideo ? "Video" : `${activeImage + 1} / ${product.images.length}`}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--sf-glass-border) transparent" }}>
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
            {/* Video thumb — only if admin uploaded a video */}
            {product.video && (
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
            )}
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
          <div className="mb-5">
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
              Gold rate: {formatPrice(product.goldPricePerGram)}/g (live) &bull; Your contracted pricing
            </p>
          </div>

          {/* ── Customization ────────────────────────── */}
          <div className="order-2 rounded-2xl border mb-5 overflow-hidden"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: existingOrder ? "var(--sf-amber-border)" : "var(--sf-divider)",
            }}>

            {/* Header */}
            <div className="px-5 py-3.5 flex items-center gap-2.5"
              style={{ borderBottom: "1px solid var(--sf-divider)" }}>
              {existingOrder ? (
                <>
                  <Shield className="w-4 h-4" style={{ color: "var(--sf-amber)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--sf-amber)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
                    Order Locked
                  </span>
                  <span className="ml-auto text-[10px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "var(--sf-amber-subtle)", color: "var(--sf-amber)", border: "1px solid var(--sf-amber-border)" }}>
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
                style={{ background: "var(--sf-amber-bg)", borderBottom: "1px solid var(--sf-amber-border)" }}>
                <Info className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sf-amber)" }} />
                <p className="text-[11px]" style={{ color: "var(--sf-amber)" }}>
                  Customization is locked because this product has an active order. Cancel the order to make changes.
                </p>
              </div>
            )}

            {/* Lock wrapper — disables all interaction when order exists */}
            <div className={existingOrder ? "sf-disabled-section" : ""} style={{
              pointerEvents: existingOrder ? "none" : "auto",
            }}>

              {/* ─── Metal ──────────────────────────────── */}
              {(product.customization.goldTypes.length > 0 || product.customization.goldColours.length > 0) && (() => {
                const swatchMap: Record<string, { bg: string; label: string }> = {
                  YELLOW: { bg: "linear-gradient(145deg, #F5D66B, #B8860B)", label: "Yellow" },
                  ROSE: { bg: "linear-gradient(145deg, #EDAFB8, #8B4557)", label: "Rose" },
                  WHITE: { bg: "linear-gradient(145deg, #F0F0F0, #9E9E9E)", label: "White" },
                  "TWO TONE": { bg: "linear-gradient(145deg, #F5D66B 42%, #D0D0D0 58%)", label: "Two Tone" },
                };
                const colourKey = (selectedGoldColour || product.customization.goldColours[0] || "YELLOW").toUpperCase();
                const purity = selectedGoldType || product.customization.goldTypes[0] || "";
                // Purity choices: 14KT & 18KT, plus whatever the product stores (DB value).
                const purityOpts = Array.from(new Set(["14KT", "18KT", purity].filter(Boolean)));
                // Right-side pill = the product's actual DB-stored metal (purity · colour),
                // independent of the radio selection.
                const dbPurity = product.customization.goldTypes[0] || product.specs.metalType || "";
                const dbColourRaw = product.customization.goldColours[0] || "";
                const dbColourSw = swatchMap[dbColourRaw.toUpperCase()];
                const dbColourLabel = dbColourSw?.label || dbColourRaw;
                return (
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>

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
                        {dbColourSw && <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dbColourSw.bg }} />}
                        <span className="text-[11px] font-bold" style={{ color: "#D4A843" }}>
                          {[dbPurity, dbColourLabel].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Purity + Colour — radio buttons */}
                    <div className="flex flex-col gap-3.5">
                      <GlassRadio
                        label="Purity"
                        value={purity || "18KT"}
                        options={purityOpts.map((v) => ({ value: v, label: v }))}
                        onChange={setSelectedGoldType}
                      />
                      <GlassRadio
                        label="Colour"
                        value={colourKey}
                        options={Object.entries(swatchMap).map(([value, s]) => ({ value, label: s.label, bg: s.bg }))}
                        onChange={setSelectedGoldColour}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* ─── Diamond ─────────────────────────────── */}
              {(product.diamonds.length > 0 || product.customization.diamondShapes.length > 0 || product.customization.diamondShades.length > 0 || product.customization.diamondQualities.length > 0) && (() => {
                const multiDiamond = product.diamonds.length > 1;
                const shape = selectedDiamondShape || product.customization.diamondShapes[0] || "";
                const shade = selectedDiamondShade || product.customization.diamondShades[0] || "";
                const clarity = selectedDiamondQuality || product.customization.diamondQualities[0] || "";
                const fields = [
                  { label: "Shape", options: product.customization.diamondShapes, selected: selectedDiamondShape, set: setSelectedDiamondShape },
                  { label: "Shade", options: product.customization.diamondShades, selected: selectedDiamondShade, set: setSelectedDiamondShade },
                  { label: "Clarity", options: product.customization.diamondQualities, selected: selectedDiamondQuality, set: setSelectedDiamondQuality },
                ].filter((f) => f.options.length > 0);
                return (
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "var(--sf-teal-glass)", border: "1px solid var(--sf-teal-border)" }}>
                          <Diamond className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Diamond</p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{multiDiamond ? `${product.diamonds.length} diamonds in this design` : "Select cut, shade & clarity"}</p>
                        </div>
                      </div>
                      {multiDiamond ? (
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full shrink-0"
                          style={{ background: "var(--sf-teal-subtle)", border: "1px solid var(--sf-teal-border)" }}>
                          <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: "var(--sf-teal)" }}>
                            {(() => {
                              const t = product.diamonds.reduce((s, dd) => s + (Number(dd.carat) || 0), 0);
                              return t > 0 ? `${Number(t.toFixed(3))} ct total` : `${product.diamonds.length} stones`;
                            })()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full"
                          style={{ background: "var(--sf-teal-subtle)", border: "1px solid var(--sf-teal-border)" }}>
                          <span className="text-[11px] font-bold" style={{ color: "var(--sf-teal)" }}>
                            {[shape, shade, clarity].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Multiple diamonds — pick one from a dropdown, details show below */}
                    {multiDiamond && (() => {
                      const idx = Math.min(selectedDiamondIdx, product.diamonds.length - 1);
                      const d = product.diamonds[idx];
                      // Read-only rows (Shape, Shade, Clarity & Type are editable dropdowns, rendered separately)
                      const detailRows = [
                        { label: "Carat", value: d.carat != null ? `${Number(d.carat)} ct` : "" },
                        { label: "Certification", value: d.certification },
                      ].filter((r) => r.value);
                      const typeOptions = Array.from(new Set([...DIAMOND_TYPES, d.type].filter(Boolean))) as string[];
                      return (
                        <div className="mb-5">
                          {/* Diamond picker — custom themed dropdown */}
                          <div className="relative mb-3">
                            <button
                              type="button"
                              onClick={() => setDiamondMenuOpen((o) => !o)}
                              className="w-full flex items-center gap-2.5 h-12 rounded-xl pl-2.5 pr-3 transition-colors"
                              style={{ background: "var(--sf-glass-bg)", border: `1px solid ${diamondMenuOpen ? "var(--sf-teal)" : "var(--sf-teal-border)"}` }}
                            >
                              <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black shrink-0"
                                style={{ background: "var(--sf-teal-glass)", border: "1px solid var(--sf-teal-border)", color: "var(--sf-teal)" }}>
                                {idx + 1}
                              </span>
                              <span className="text-[13px] font-bold" style={{ color: "var(--sf-text-primary)" }}>{d.shape || "Diamond"}</span>
                              {[d.color, d.clarity].filter(Boolean).length > 0 && (
                                <span className="text-[11px] truncate" style={{ color: "var(--sf-text-muted)" }}>{[d.color, d.clarity].filter(Boolean).join(" · ")}</span>
                              )}
                              <span className="ml-auto flex items-center gap-2 shrink-0">
                                {d.carat != null && (
                                  <span className="flex items-baseline gap-0.5 px-2.5 py-1 rounded-full"
                                    style={{ background: "var(--sf-teal-glass)", border: "1px solid var(--sf-teal-border)" }}>
                                    <span className="text-[12px] font-black leading-none" style={{ color: "var(--sf-teal)" }}>{Number(d.carat)}</span>
                                    <span className="text-[9px] font-bold" style={{ color: "var(--sf-teal)" }}>ct</span>
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 transition-transform"
                                  style={{ color: "var(--sf-teal)", transform: diamondMenuOpen ? "rotate(-90deg)" : "rotate(90deg)" }} />
                              </span>
                            </button>

                            <AnimatePresence>
                              {diamondMenuOpen && (
                                <>
                                  {/* click-outside catcher */}
                                  <div className="fixed inset-0 z-40" onClick={() => setDiamondMenuOpen(false)} />
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 right-0 z-50 rounded-xl overflow-hidden p-1.5"
                                    style={{ top: "calc(100% + 6px)", background: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-glass-border-strong)", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}
                                  >
                                    {product.diamonds.map((dd, i) => {
                                      const active = i === idx;
                                      return (
                                        <button key={i} type="button"
                                          onClick={() => { setSelectedDiamondIdx(i); setSelectedDiamondShape(dd.shape || ""); setSelectedDiamondShade(dd.color || ""); setSelectedDiamondQuality(dd.clarity || ""); setSelectedDiamondType(dd.type || ""); setDiamondMenuOpen(false); }}
                                          className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors"
                                          style={{ background: active ? "var(--sf-teal-glass)" : "transparent", border: active ? "1px solid var(--sf-teal-border)" : "1px solid transparent" }}
                                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--sf-glass-bg)"; }}
                                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                                        >
                                          <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black shrink-0"
                                            style={{ background: active ? "var(--sf-teal)" : "var(--sf-glass-pill)", color: active ? "#fff" : "var(--sf-text-muted)" }}>
                                            {i + 1}
                                          </span>
                                          <span className="text-[13px] font-bold" style={{ color: "var(--sf-text-primary)" }}>{dd.shape || "Diamond"}</span>
                                          {[dd.color, dd.clarity].filter(Boolean).length > 0 && (
                                            <span className="text-[11px] truncate" style={{ color: "var(--sf-text-muted)" }}>{[dd.color, dd.clarity].filter(Boolean).join(" · ")}</span>
                                          )}
                                          <span className="ml-auto flex items-center gap-2 shrink-0">
                                            {dd.carat != null && (
                                              <span className="text-[12px] font-bold" style={{ color: "var(--sf-teal)" }}>{Number(dd.carat)} ct</span>
                                            )}
                                            {active && <Check className="w-4 h-4" style={{ color: "var(--sf-teal)" }} strokeWidth={3} />}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Selected diamond — Shape & Shade are dropdowns, rest read-only */}
                          <div className="grid grid-cols-2 gap-2">
                            <GridSelect label="Shape" value={selectedDiamondShape || d.shape || ""} options={DIAMOND_SHAPES} onChange={setSelectedDiamondShape} />
                            <GridSelect label="Shade" value={selectedDiamondShade || d.color || ""} options={DIAMOND_SHADES} onChange={setSelectedDiamondShade} />
                            <GridSelect label="Clarity" value={selectedDiamondQuality || d.clarity || ""} options={DIAMOND_QUALITIES} onChange={setSelectedDiamondQuality} />
                            <GridSelect label="Type" value={selectedDiamondType || d.type || ""} options={typeOptions} onChange={setSelectedDiamondType} />
                            {detailRows.map((r) => (
                              <div key={r.label}>
                                <span className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--sf-text-muted)" }}>{r.label}</span>
                                <div className="w-full flex items-center h-10 px-3 rounded-lg"
                                  style={{ background: "var(--sf-glass-bg)", border: "1px solid var(--sf-glass-border-strong)" }}>
                                  <span className="text-[13px] font-bold truncate" style={{ color: r.label === "Carat" ? "var(--sf-teal)" : "var(--sf-text-primary)" }}>{r.value}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Single row: Shape | Shade | Clarity — only when there's a single diamond */}
                    {!multiDiamond && (
                      <div className="flex items-center gap-3 flex-wrap">
                        {fields.map((field, fi) => (
                          <>
                            {fi > 0 && (
                              <div key={`div-${fi}`} className="w-px self-stretch rounded-full" style={{ background: "var(--sf-glass-border)", minHeight: 28 }} />
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
                                          ? "var(--sf-teal-glass)"
                                          : "var(--sf-glass-bg)",
                                        border: active ? "1.5px solid var(--sf-teal-border)" : "1px solid var(--sf-glass-border)",
                                        color: active ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                                        boxShadow: active ? "0 0 0 3px var(--sf-teal-subtle), 0 4px 12px var(--sf-shadow-teal)" : "none",
                                        transform: active ? "translateY(-1px)" : "none",
                                      }}>{opt}</button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ))}
                      </div>
                    )}
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
                  "Precious Stones": { dot: "#27AE60", glow: "rgba(39,174,96,0.45)", bg: "rgba(39,174,96,0.06)", activeBg: "rgba(39,174,96,0.13)", border: "rgba(39,174,96,0.38)", text: "#2ECC71", tag: "rgba(39,174,96,0.15)" },
                  "Semi Precious Stones": { dot: "#2980B9", glow: "rgba(41,128,185,0.45)", bg: "rgba(41,128,185,0.06)", activeBg: "rgba(41,128,185,0.13)", border: "rgba(41,128,185,0.38)", text: "#5DADE2", tag: "rgba(41,128,185,0.15)" },
                  "Synthetic Stones": { dot: "#C0392B", glow: "rgba(192,57,43,0.45)", bg: "rgba(192,57,43,0.06)", activeBg: "rgba(192,57,43,0.13)", border: "rgba(192,57,43,0.38)", text: "#E74C3C", tag: "rgba(192,57,43,0.15)" },
                  "Pearl": { dot: "#D4B896", glow: "rgba(212,184,150,0.45)", bg: "rgba(212,184,150,0.06)", activeBg: "rgba(212,184,150,0.13)", border: "rgba(212,184,150,0.38)", text: "#C9A882", tag: "rgba(212,184,150,0.15)" },
                  "Beads": { dot: "#D68910", glow: "rgba(214,137,16,0.45)", bg: "rgba(214,137,16,0.06)", activeBg: "rgba(214,137,16,0.13)", border: "rgba(214,137,16,0.38)", text: "#F39C12", tag: "rgba(214,137,16,0.15)" },
                  "Kundan": { dot: "#B7950B", glow: "rgba(183,149,11,0.45)", bg: "rgba(183,149,11,0.06)", activeBg: "rgba(183,149,11,0.13)", border: "rgba(183,149,11,0.38)", text: "#D4A843", tag: "rgba(183,149,11,0.15)" },
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
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>

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
                                : "var(--sf-glass-bg)",
                              border: active ? `1.5px solid ${c.border}` : "1px solid var(--sf-glass-border)",
                              boxShadow: active ? `0 0 0 3px ${c.bg}, 0 8px 24px ${c.glow.replace("0.45", "0.2")}` : "none",
                              transform: active ? "translateY(-1px)" : "none",
                            }}>

                            {/* Gem orb */}
                            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 transition-all duration-200"
                              style={{
                                background: active
                                  ? `radial-gradient(circle at 32% 32%, ${c.dot}DD, ${c.dot}77)`
                                  : "var(--sf-glass-pill)",
                                boxShadow: active ? `0 4px 14px ${c.glow}` : "none",
                                border: active ? `1px solid ${c.dot}55` : "1px solid var(--sf-glass-border)",
                              }}>
                              <Gem className="w-4.5 h-4.5" style={{ color: active ? "#fff" : "var(--sf-text-muted)", opacity: active ? 1 : 0.45, width: 18, height: 18 }} />
                            </div>

                            {/* Labels */}
                            <div className="flex flex-col min-w-0 flex-1 gap-1">
                              {/* Category tag */}
                              <span className="inline-flex self-start text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                style={{ background: active ? c.tag : "var(--sf-glass-pill)", color: active ? c.text : "var(--sf-text-muted)" }}>
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
                  style={{ border: "1px solid var(--sf-glass-border)" }}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[var(--sf-teal-subtle)]"
                    style={{ color: "var(--sf-text-muted)" }}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-11 h-9 flex items-center justify-center text-xs font-bold border-x"
                    style={{ color: "var(--sf-text-primary)", borderColor: "var(--sf-glass-border-strong)" }}>
                    {quantity}
                  </span>
                  <button onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[var(--sf-teal-subtle)]"
                    style={{ color: "var(--sf-text-muted)" }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>{/* end lock wrapper */}
          </div>

          {/* ── Note Section ─────────────────────────── */}
          <div className="order-2 mb-5">
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
          <div className="order-2 flex gap-3 mb-8">
            {product.availability === "out-of-stock" ? (
              /* Product is locked / out-of-stock */
              <Button
                className="flex-1 h-12 text-base font-semibold gap-2"
                disabled
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  color: "var(--sf-text-muted)",
                  border: "1px solid var(--sf-divider)",
                  cursor: "not-allowed",
                }}
              >
                <Lock className="w-5 h-5" /> Currently Unavailable
              </Button>
            ) : existingOrder ? (
              /* Active order exists → block re-ordering */
              <Button
                className="flex-1 h-12 text-base font-semibold gap-2"
                style={{
                  backgroundColor: "var(--sf-amber-subtle)",
                  color: "var(--sf-amber)",
                  border: "1px solid var(--sf-amber-border)",
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
                  backgroundColor: "var(--sf-teal-glass)",
                  color: "var(--sf-teal)",
                  border: "1.5px solid var(--sf-teal-border)",
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
                    : "0 4px 20px var(--sf-shadow-teal)",
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
          <Tabs defaultValue="specs" className="order-1 mb-5">

            {/* Tab switcher — glassmorphism pill bar */}
            <TabsList
              className="w-full gap-1 rounded-2xl"
              style={{
                background: "var(--sf-glass-bg)",
                border: "1px solid var(--sf-glass-border)",
                padding: "5px",
                backdropFilter: "blur(10px)",
              }}
            >
              {([
                { value: "specs", icon: <Ruler className="w-3.5 h-3.5" />, label: "Specs" },
                { value: "diamond", icon: <Diamond className="w-3.5 h-3.5" />, label: "Diamond" },
                { value: "pricing", icon: <Sparkles className="w-3.5 h-3.5" />, label: "Pricing" },
              ] as const).map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={[
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[12px] font-semibold",
                    "transition-all duration-200",
                    "data-[state=inactive]:text-[var(--sf-text-muted)] data-[state=inactive]:hover:text-[var(--sf-text-secondary)]",
                    "data-[state=active]:text-[var(--sf-teal)]",
                  ].join(" ")}
                  style={{ fontFamily: "inherit" }}
                >
                  {tab.icon}{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Inject active-tab pill glow via CSS */}
            <style>{`
                [data-slot="tabs-trigger"][data-state="active"] {
                  background: var(--sf-teal-glass) !important;
                  border: 1px solid var(--sf-teal-border);
                  box-shadow: 0 0 12px var(--sf-teal-subtle);
                }
                [data-slot="tabs-trigger"][data-state="inactive"] {
                  background: transparent;
                  border: 1px solid transparent;
                }
                [data-slot="tabs-trigger"][data-state="inactive"]:hover {
                  background: var(--sf-glass-pill);
                  border: 1px solid var(--sf-glass-border);
                }
              `}</style>

            {/* ── Specs tab ───────────────────────────── */}
            <TabsContent value="specs" className="mt-5">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2"
              >
                {([
                  { icon: <Palette />, accent: "#D4A843", gradient: "212,168,67", label: "Metal", value: [selectedGoldType, selectedGoldColour].filter(Boolean).join(" · ") || product.specs.metalType },
                  { icon: <Weight />, accent: "#A569BD", gradient: "165,105,189", label: "Weight", value: product.specs.metalWeight },
                  { icon: <Ruler />, accent: "var(--sf-teal)", gradient: "48,184,191", label: "Dimensions", value: [product.specs.width, product.specs.height].filter(s => s !== "-").join(" × ") || "-" },
                  { icon: <Diamond />, accent: "#5DADE2", gradient: "93,173,226", label: "Setting", value: product.specs.settingType },
                  { icon: <Shield />, accent: "#27AE60", gradient: "39,174,96", label: "Hallmark", value: product.specs.hallmark },
                ] as const).filter((row) => row.value && row.value !== "-").map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
                    className="group relative flex items-center justify-between px-4 py-3.5 rounded-xl overflow-hidden cursor-default"
                    style={{
                      background: "var(--sf-glass-bg)",
                      border: "1px solid var(--sf-glass-border)",
                      transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${row.gradient},0.2)`;
                      e.currentTarget.style.boxShadow = `0 2px 12px rgba(${row.gradient},0.06)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--sf-glass-border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Subtle hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 0% 50%, rgba(${row.gradient},0.05) 0%, transparent 60%)` }} />

                    <div className="relative flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `${row.accent}1A`, border: `1px solid ${row.accent}30`, color: row.accent }}>
                        {row.icon}
                      </div>
                      <span className="text-[13px] font-medium" style={{ color: "var(--sf-text-muted)" }}>{row.label}</span>
                    </div>
                    <span className="relative text-[13px] font-bold" style={{ color: "var(--sf-text-primary)" }}>{row.value}</span>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            {/* ── Diamond tab ─────────────────────────── */}
            <TabsContent value="diamond" className="mt-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                {/* GIA-style certificate card with glassmorphism */}
                <div className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(93,173,226,0.1) 0%, rgba(48,184,191,0.07) 40%, rgba(165,105,189,0.05) 100%)",
                    border: "1px solid rgba(93,173,226,0.2)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(93,173,226,0.08)",
                  }}>
                  {/* Decorative glow orb */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(93,173,226,0.12) 0%, transparent 70%)" }} />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(165,105,189,0.1) 0%, transparent 70%)" }} />

                  {/* Header strip */}
                  <div className="relative px-4 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: "1px solid var(--sf-glass-border)", background: "var(--sf-glass-bg)" }}>
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, rgba(93,173,226,0.2), rgba(48,184,191,0.15))",
                          border: "1px solid rgba(93,173,226,0.3)",
                          boxShadow: "0 0 12px rgba(93,173,226,0.15)",
                        }}>
                        <Diamond className="w-4 h-4" style={{ color: "#5DADE2" }} />
                      </motion.div>
                      <div>
                        <p className="text-[12px] font-bold tracking-wide" style={{ color: "var(--sf-text-primary)" }}>Diamond Certificate</p>
                        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--sf-text-muted)" }}>{product.specs.diamondType}</p>
                      </div>
                    </div>
                    {product.specs.diamondCertification !== "-" && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                          background: "linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.08))",
                          border: "1px solid rgba(212,168,67,0.3)",
                          boxShadow: "0 0 16px rgba(212,168,67,0.1)",
                        }}>
                        <Award className="w-3 h-3" style={{ color: "#D4A843" }} />
                        <span className="text-[10px] font-bold" style={{ color: "#D4A843" }}>{product.specs.diamondCertification}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* 4C stats with staggered animation */}
                  <div className="relative grid grid-cols-4">
                    {([
                      { label: "Carat", value: `${selectedCarat}`, unit: "ct", accent: "var(--sf-teal)", gradient: "48,184,191" },
                      { label: "Cut", value: product.specs.diamondShape.split(" ")[0], unit: "", accent: "#5DADE2", gradient: "93,173,226" },
                      { label: "Colour", value: product.specs.diamondColor, unit: "", accent: "#D4A843", gradient: "212,168,67" },
                      { label: "Clarity", value: product.specs.diamondClarity, unit: "", accent: "#A569BD", gradient: "165,105,189" },
                    ] as const).map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: "easeOut" }}
                        className="group relative flex flex-col items-center justify-center py-6 px-2 cursor-default"
                        style={{
                          borderRight: i < 3 ? "1px solid var(--sf-glass-border)" : "none",
                          transition: "background 0.3s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(${stat.gradient},0.06)`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Subtle glow dot behind value */}
                        <div className="absolute w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: `radial-gradient(circle, rgba(${stat.gradient},0.2) 0%, transparent 70%)`, top: "20%" }} />
                        <div className="relative flex items-baseline gap-0.5">
                          <motion.span
                            key={stat.value}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="text-[22px] font-black leading-none"
                            style={{ color: stat.accent, textShadow: `0 0 20px rgba(${stat.gradient},0.3)` }}>
                            {stat.value}
                          </motion.span>
                          {stat.unit && (
                            <span className="text-[10px] font-bold" style={{ color: `${stat.accent}88` }}>{stat.unit}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] mt-2" style={{ color: "var(--sf-text-muted)" }}>
                          {stat.label}
                        </span>
                        {/* Bottom accent line */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-8 rounded-full transition-all duration-300"
                          style={{ background: stat.accent, opacity: 0.6 }} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* All diamonds in this product — shape, carat & full grade */}
                {product.diamonds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.45 }}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--sf-glass-bg)",
                      border: "1px solid var(--sf-glass-border)",
                      backdropFilter: "blur(8px)",
                    }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>
                      <div className="flex items-center gap-2">
                        <Diamond className="w-3.5 h-3.5" style={{ color: "#5DADE2" }} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--sf-text-muted)" }}>
                          Diamonds
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(93,173,226,0.12)", color: "#5DADE2" }}>
                        {product.diamonds.length} {product.diamonds.length === 1 ? "stone" : "stones"}
                        {(() => {
                          const total = product.diamonds.reduce((s, d) => s + (d.carat || 0), 0);
                          return total > 0 ? ` · ${Number(total.toFixed(3))} ct` : "";
                        })()}
                      </span>
                    </div>

                    {/* Column labels */}
                    <div className="grid items-center px-4 py-2 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        gridTemplateColumns: "1.4fr 0.7fr 0.8fr 0.9fr 0.9fr",
                        color: "var(--sf-text-muted)",
                        borderBottom: "1px solid var(--sf-glass-border)",
                      }}>
                      <span>Shape</span>
                      <span className="text-right">Carat</span>
                      <span className="text-center">Colour</span>
                      <span className="text-center">Clarity</span>
                      <span className="text-right">Cert</span>
                    </div>

                    {/* Rows */}
                    {product.diamonds.map((d, i) => (
                      <div key={i}
                        className="grid items-center px-4 py-2.5 text-[12px]"
                        style={{
                          gridTemplateColumns: "1.4fr 0.7fr 0.8fr 0.9fr 0.9fr",
                          borderBottom: i < product.diamonds.length - 1 ? "1px solid var(--sf-glass-border)" : "none",
                        }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Diamond className="w-3 h-3 shrink-0" style={{ color: "#5DADE2" }} />
                          <span className="font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>
                            {d.shape || "—"}
                          </span>
                          {d.type && (
                            <span className="text-[9px] truncate" style={{ color: "var(--sf-text-muted)" }}>· {d.type}</span>
                          )}
                        </div>
                        <span className="text-right font-bold" style={{ color: "var(--sf-teal)" }}>
                          {d.carat != null ? `${Number(d.carat)}` : "—"}
                        </span>
                        <span className="text-center" style={{ color: "var(--sf-text-secondary)" }}>{d.color || "—"}</span>
                        <span className="text-center" style={{ color: "var(--sf-text-secondary)" }}>{d.clarity || "—"}</span>
                        <span className="text-right" style={{ color: "var(--sf-text-secondary)" }}>{d.certification || "—"}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

              </motion.div>
            </TabsContent>

            {/* ── Pricing tab ─────────────────────────── */}
            <TabsContent value="pricing" className="mt-5">
              {(() => {
                // Prefer the server's computed breakdown; fall back to an estimate
                // when the server didn't itemise (e.g. per-retailer override).
                const bd = product.priceBreakdown;
                const diamondVal = bd ? Math.round(bd.diamondCost || 0) : Math.round(product.basePrice * 0.65 * (selectedCarat / product.specs.diamondCarat));
                const metalVal = bd ? Math.round(bd.metalCost || 0) : Math.round(parseFloat(product.specs.metalWeight) * product.goldPricePerGram);
                // Making charges hidden from the product-detail breakdown.
                // const makingVal = bd ? Math.round(bd.makingCost || 0) : Math.round(product.basePrice * 0.12);
                const subtotal = (diamondVal + metalVal) || 1;
                const rows = [
                  { icon: <Diamond />, accent: "#5DADE2", gradient: "93,173,226", label: "Diamond", sub: `${product.specs.diamondCarat} ct · ${product.specs.diamondShape}`, val: diamondVal },
                  { icon: <Palette />, accent: "#D4A843", gradient: "212,168,67", label: "Metal", sub: `${product.specs.metalWeight} × ${formatPrice(product.goldPricePerGram)}/g`, val: metalVal },
                  // { icon: <Sparkles />, accent: "#A569BD", gradient: "165,105,189", label: "Making", sub: "Craftsmanship", val: makingVal },
                ];
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-2.5"
                  >
                    {/* Breakdown cards with staggered entrance */}
                    {rows.map((row, i) => {
                      const pct = Math.round((row.val / subtotal) * 100);
                      return (
                        <motion.div
                          key={row.label}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className="group relative rounded-2xl px-4 pt-4 pb-3 overflow-hidden cursor-default"
                          style={{
                            background: "var(--sf-glass-bg)",
                            border: "1px solid var(--sf-glass-border)",
                            backdropFilter: "blur(8px)",
                            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${row.gradient},0.25)`;
                            e.currentTarget.style.boxShadow = `0 4px 20px rgba(${row.gradient},0.08)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--sf-glass-border)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {/* Hover glow bg */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{ background: `radial-gradient(ellipse at 0% 50%, rgba(${row.gradient},0.06) 0%, transparent 70%)` }} />

                          <div className="relative flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-9 h-9 rounded-xl flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4"
                                style={{
                                  background: `linear-gradient(135deg, ${row.accent}22, ${row.accent}0D)`,
                                  border: `1px solid ${row.accent}33`,
                                  color: row.accent,
                                  boxShadow: `0 0 12px ${row.accent}15`,
                                }}>
                                {row.icon}
                              </motion.div>
                              <div>
                                <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--sf-text-primary)" }}>{row.label}</p>
                                <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{row.sub}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <motion.p
                                key={row.val}
                                initial={{ opacity: 0.6, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[15px] font-black tabular-nums"
                                style={{ color: "var(--sf-text-primary)" }}>
                                {formatPrice(row.val)}
                              </motion.p>
                              <p className="text-[10px] font-semibold" style={{ color: `${row.accent}88` }}>{pct}%</p>
                            </div>
                          </div>
                          {/* Animated progress bar */}
                          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--sf-glass-bg-hover)" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${row.accent}, ${row.accent}88)`,
                                boxShadow: `0 0 8px ${row.accent}40`,
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Total card with premium glassmorphism */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, rgba(48,184,191,0.12) 0%, rgba(48,184,191,0.04) 50%, rgba(93,173,226,0.04) 100%)",
                        border: "1.5px solid var(--sf-teal-border)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 8px 32px var(--sf-shadow-teal)",
                      }}
                    >
                      {/* Shimmer overlay */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
                          style={{
                            background: "conic-gradient(from 0deg, transparent 0%, rgba(48,184,191,0.04) 10%, transparent 20%)",
                            animation: "spin 8s linear infinite",
                          }}
                        />
                      </div>
                      {/* Glow orbs */}
                      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(48,184,191,0.1) 0%, transparent 70%)" }} />

                      <div className="relative px-4 py-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "var(--sf-teal)" }}>Estimated Total</p>
                          <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                            {quantity > 1 ? `${quantity} pcs · ` : ""}{formatPrice(product.goldPricePerGram)}/g gold rate
                          </p>
                        </div>
                        <div className="text-right">
                          <motion.p
                            key={totalPrice}
                            initial={{ scale: 0.95, opacity: 0.7 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="text-[28px] font-black leading-none"
                            style={{
                              color: "var(--sf-teal)",
                              letterSpacing: "-0.03em",
                              textShadow: "0 0 30px rgba(48,184,191,0.25)",
                            }}>
                            {formatPrice(totalPrice)}
                          </motion.p>
                          {quantity > 1 && (
                            <p className="text-[11px] mt-1" style={{ color: "var(--sf-text-muted)" }}>{formatPrice(Math.round(totalPrice / quantity))} each</p>
                          )}
                        </div>
                      </div>
                      {/* Animated stacked composition bar */}
                      <div className="flex h-1.5 relative" style={{ opacity: 0.8 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((diamondVal / subtotal) * 100)}%` }}
                          transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                          style={{ background: "linear-gradient(90deg, #5DADE2, #5DADE2cc)" }}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((metalVal / subtotal) * 100)}%` }}
                          transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
                          style={{ background: "linear-gradient(90deg, #D4A843, #D4A843cc)" }}
                        />
                        <motion.div
                          initial={{ flex: 0 }}
                          animate={{ flex: 1 }}
                          transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
                          style={{ background: "linear-gradient(90deg, #A569BD, #A569BDcc)" }}
                        />
                      </div>
                      {/* Composition legend */}
                      <div className="relative flex items-center justify-center gap-4 py-2.5" style={{ background: "var(--sf-glass-bg)" }}>
                        {rows.map((row) => (
                          <div key={row.label} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: row.accent, boxShadow: `0 0 6px ${row.accent}50` }} />
                            <span className="text-[9px] font-semibold" style={{ color: "var(--sf-text-muted)" }}>{row.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}
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
  const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
    "in-stock": { bg: "var(--sf-status-in-stock-bg)", text: "var(--sf-status-in-stock-text)", border: "var(--sf-status-in-stock-border)", label: "In Stock" },
    "made-to-order": { bg: "var(--sf-status-mto-bg)", text: "var(--sf-status-mto-text)", border: "var(--sf-status-mto-border)", label: "Made to Order" },
    "out-of-stock": { bg: "var(--sf-status-oos-bg)", text: "var(--sf-status-oos-text)", border: "var(--sf-status-oos-border)", label: "Out of Stock" },
  };
  const s = map[status] || map["in-stock"];
  return (
    <Badge
      className="text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </Badge>
  );
}

/* Labelled radio-button group — optional colour swatch per option.
   Case-insensitive value matching. */
function GlassRadio({
  label, value, options, onChange, accent = "#D4A843",
}: {
  label: string;
  value: string;
  options: { value: string; label: string; bg?: string }[];
  onChange: (v: string) => void;
  accent?: string;
}) {
  const norm = (v: string) => (v || "").toUpperCase();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0 w-12" style={{ color: "var(--sf-text-muted)" }}>
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = norm(o.value) === norm(value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg transition-all duration-200"
              style={{
                background: active ? `${accent}1A` : "var(--sf-glass-bg)",
                border: active ? `1.5px solid ${accent}` : "1px solid var(--sf-glass-border)",
              }}
            >
              {/* Radio indicator */}
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `1.5px solid ${active ? accent : "var(--sf-text-muted)"}` }}>
                {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
              </span>
              {o.bg && <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: o.bg }} />}
              <span className="text-[11px] font-bold" style={{ color: active ? accent : "var(--sf-text-secondary)" }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Searchable compact dropdown (combobox) used inside the diamond detail grid:
   label left, selected value on the right; menu has a search box that filters
   the options. Case-insensitive value matching. */
function GridSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const norm = (v: string) => (v || "").toUpperCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));

  const close = () => { setOpen(false); setQuery(""); };

  return (
    <div className="relative">
      <span className="block text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--sf-text-muted)" }}>{label}</span>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className="w-full flex items-center gap-2 h-10 px-3 rounded-lg transition-all"
        style={{
          background: open ? "var(--sf-teal-glass)" : "var(--sf-glass-bg)",
          border: `1px solid ${open ? "var(--sf-teal)" : "var(--sf-glass-border-strong)"}`,
          boxShadow: open ? "0 0 0 3px var(--sf-teal-subtle)" : "none",
          cursor: "pointer",
        }}
      >
        <span className="text-[13px] font-bold truncate" style={{ color: "var(--sf-text-primary)" }}>{value || "Select"}</span>
        <ChevronRight className="w-4 h-4 ml-auto shrink-0 transition-transform" style={{ color: "var(--sf-teal)", transform: open ? "rotate(-90deg)" : "rotate(90deg)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl overflow-hidden"
              style={{ background: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-glass-border-strong)", boxShadow: "0 16px 44px rgba(0,0,0,0.45)" }}
            >
              {/* Search box */}
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sf-text-muted)" }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full bg-transparent outline-none text-[12px]"
                  style={{ color: "var(--sf-text-primary)" }}
                />
              </div>

              {/* Options */}
              <div className="sf-thin-scroll p-1.5 max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-center text-[11px]" style={{ color: "var(--sf-text-muted)" }}>No matches</div>
                ) : (
                  filtered.map((o) => {
                    const active = norm(o) === norm(value);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => { onChange(o); close(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                        style={{ background: active ? "var(--sf-teal-glass)" : "transparent" }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--sf-glass-bg)"; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span className="text-[12.5px] font-bold" style={{ color: active ? "var(--sf-teal)" : "var(--sf-text-primary)" }}>{o}</span>
                        {active && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--sf-teal)" }} strokeWidth={3} />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

