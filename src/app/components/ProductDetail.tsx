import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img5 from "../../assets/Images/5.jpg";
import img7 from "../../assets/Images/7.jpg";
import productVideo from "../../assets/Videos/5327599-hd_1280_720_30fps.mp4";

/* ═══════════════════════════════════════════════════════
   MOCK DATA — replace with API
   ═══════════════════════════════════════════════════════ */

const PRODUCT = {
  id: 1,
  name: "Solitaire Diamond Ring",
  tagline: "Timeless brilliance, handcrafted perfection",
  category: "Rings",
  sku: "SF-RNG-0451",
  availability: "in-stock" as const,
  basePrice: 125000,
  images: [img1, img3, img5, img7],
  video: productVideo,
  isNew: true,
  rating: 4.8,
  reviewCount: 124,

  // Specifications (Bluestone-style)
  specs: {
    metalType: "18K White Gold",
    metalWeight: "3.45 g",
    diamondType: "Natural Diamond",
    diamondShape: "Round Brilliant",
    diamondClarity: "VS1",
    diamondColor: "F",
    diamondCarat: 1.5,
    diamondCertification: "GIA Certified",
    settingType: "Prong Setting",
    rhodiumPlated: "Yes",
    hallmark: "BIS 750",
    width: "2.2 mm",
    height: "6.8 mm",
  },

  // Customization options
  caratOptions: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0],
  metalOptions: ["18K White Gold", "18K Yellow Gold", "18K Rose Gold", "Platinum"],

  // Gold price (per gram, live)
  goldPricePerGram: 6250,
};

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
  // Image gallery
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  // Customization
  const [selectedCarat, setSelectedCarat] = useState(PRODUCT.specs.diamondCarat);
  const [selectedMetal, setSelectedMetal] = useState(PRODUCT.specs.metalType);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const totalPrice = useMemo(
    () =>
      calculatePrice(
        PRODUCT.specs.diamondCarat,
        selectedCarat,
        PRODUCT.basePrice,
        parseFloat(PRODUCT.specs.metalWeight),
        PRODUCT.goldPricePerGram
      ) * quantity,
    [selectedCarat, quantity]
  );

  const formatPrice = (p: number) =>
    "₹" + p.toLocaleString("en-IN");

  const prevImage = useCallback(() => {
    setShowVideo(false);
    setActiveImage((i) => (i === 0 ? PRODUCT.images.length - 1 : i - 1));
  }, []);

  const nextImage = useCallback(() => {
    setShowVideo(false);
    setActiveImage((i) => (i === PRODUCT.images.length - 1 ? 0 : i + 1));
  }, []);

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
                    src={PRODUCT.video}
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
                    src={PRODUCT.images[activeImage]}
                    alt={PRODUCT.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </AnimatePresence>

              {/* Nav arrows */}
              {!showVideo && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-opacity opacity-0 group-hover:opacity-100 hover:opacity-100"
                    style={{
                      backgroundColor: "rgba(8, 10, 13, 0.6)",
                      color: "var(--sf-text-primary)",
                      opacity: 0.7,
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
                      opacity: 0.7,
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              {PRODUCT.isNew && (
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
                {showVideo ? "Video" : `${activeImage + 1} / ${PRODUCT.images.length}`}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PRODUCT.images.map((img, i) => (
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
                <video src={PRODUCT.video} muted className="w-full h-full object-cover" />
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
                {PRODUCT.category}
              </p>
              <h1
                className="text-2xl sm:text-3xl font-semibold mb-2"
                style={{
                  fontFamily: "'Melodrama', 'Georgia', serif",
                  color: "var(--sf-text-primary)",
                }}
              >
                {PRODUCT.name}
              </h1>
              <p className="text-sm mb-3" style={{ color: "var(--sf-text-secondary)" }}>
                {PRODUCT.tagline}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <AvailabilityBadge status={PRODUCT.availability} />
                <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                  SKU: {PRODUCT.sku}
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
                    <p>Gold rate: {formatPrice(PRODUCT.goldPricePerGram)}/g (live)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>
                Gold rate: {formatPrice(PRODUCT.goldPricePerGram)}/g (live) &bull; Making charges: 12%
              </p>
            </div>

            {/* ── Customization ────────────────────────── */}
            <div
              className="rounded-xl border p-4 mb-5 space-y-5"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                borderColor: "var(--sf-divider)",
              }}
            >
              <p
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--sf-text-primary)" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                Customize Your Piece
              </p>

              {/* Diamond Carat */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                    Diamond Carat
                  </label>
                  <span className="text-xs font-semibold" style={{ color: "var(--sf-teal)" }}>
                    {selectedCarat} ct
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT.caratOptions.map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setSelectedCarat(ct)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        backgroundColor:
                          selectedCarat === ct ? "var(--sf-teal)" : "var(--sf-bg-surface-2)",
                        borderColor:
                          selectedCarat === ct ? "var(--sf-teal)" : "var(--sf-divider)",
                        color:
                          selectedCarat === ct ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
                      }}
                    >
                      {ct} ct
                    </button>
                  ))}
                </div>
              </div>

              {/* Metal Type */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "var(--sf-text-secondary)" }}>
                  Metal Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT.metalOptions.map((metal) => (
                    <button
                      key={metal}
                      onClick={() => setSelectedMetal(metal)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={{
                        backgroundColor:
                          selectedMetal === metal ? "var(--sf-teal)" : "var(--sf-bg-surface-2)",
                        borderColor:
                          selectedMetal === metal ? "var(--sf-teal)" : "var(--sf-divider)",
                        color:
                          selectedMetal === metal ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
                      }}
                    >
                      {metal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "var(--sf-text-secondary)" }}>
                  Quantity
                </label>
                <div
                  className="inline-flex items-center gap-0 rounded-lg border overflow-hidden"
                  style={{
                    borderColor: "var(--sf-divider)",
                    backgroundColor: "var(--sf-bg-surface-2)",
                  }}
                >
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--sf-bg-surface-3)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span
                    className="w-12 h-10 flex items-center justify-center text-sm font-semibold border-x"
                    style={{
                      color: "var(--sf-text-primary)",
                      borderColor: "var(--sf-divider)",
                    }}
                  >
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--sf-bg-surface-3)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
              <Button
                className="flex-1 h-12 text-base font-medium gap-2"
                style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
              >
                <ShoppingCart className="w-5 h-5" />
                Request Order
              </Button>
              <Button
                variant="outline"
                className="h-12 px-5 gap-2 border-[var(--sf-divider)]"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  color: wishlisted ? "#ef4444" : "var(--sf-text-secondary)",
                }}
                onClick={() => setWishlisted(!wishlisted)}
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
                  <SpecRow icon={<Palette />} label="Metal Type" value={selectedMetal} />
                  <SpecRow icon={<Weight />} label="Metal Weight" value={PRODUCT.specs.metalWeight} />
                  <SpecRow icon={<Ruler />} label="Width" value={PRODUCT.specs.width} />
                  <SpecRow icon={<Ruler />} label="Height" value={PRODUCT.specs.height} />
                  <SpecRow icon={<Diamond />} label="Setting Type" value={PRODUCT.specs.settingType} />
                  <SpecRow icon={<Shield />} label="Hallmark" value={PRODUCT.specs.hallmark} />
                  <SpecRow icon={<Check />} label="Rhodium Plated" value={PRODUCT.specs.rhodiumPlated} last />
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
                  <SpecRow icon={<Gem />} label="Diamond Type" value={PRODUCT.specs.diamondType} />
                  <SpecRow icon={<Diamond />} label="Shape" value={PRODUCT.specs.diamondShape} />
                  <SpecRow icon={<Sparkles />} label="Carat" value={`${selectedCarat} ct`} />
                  <SpecRow icon={<Palette />} label="Color Grade" value={PRODUCT.specs.diamondColor} />
                  <SpecRow icon={<Award />} label="Clarity Grade" value={PRODUCT.specs.diamondClarity} />
                  <SpecRow icon={<Shield />} label="Certification" value={PRODUCT.specs.diamondCertification} last />
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
                      Math.round(PRODUCT.basePrice * 0.65 * (selectedCarat / PRODUCT.specs.diamondCarat))
                    )}
                    sub={`${selectedCarat} ct ${PRODUCT.specs.diamondShape}`}
                  />
                  <PriceRow
                    label="Metal Value"
                    value={formatPrice(
                      Math.round(parseFloat(PRODUCT.specs.metalWeight) * PRODUCT.goldPricePerGram)
                    )}
                    sub={`${PRODUCT.specs.metalWeight} × ${formatPrice(PRODUCT.goldPricePerGram)}/g`}
                  />
                  <PriceRow
                    label="Making Charges"
                    value={formatPrice(Math.round(PRODUCT.basePrice * 0.12))}
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
