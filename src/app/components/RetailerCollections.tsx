import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Search,
  X,
  Heart,
  ShoppingCart,
  ChevronRight,
  Sparkles,
  Calendar,
  Gem,
  Crown,
  Star,
  Layers,
  Eye,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";

import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img4 from "../../assets/Images/4.jpg";
import img5 from "../../assets/Images/5.jpg";
import img6 from "../../assets/Images/6.jpg";
import img7 from "../../assets/Images/7.jpg";
import img8 from "../../assets/Images/8.jpg";
import img9 from "../../assets/Images/9.jpg";
import img11 from "../../assets/Images/11.jpg";
import img12 from "../../assets/Images/12.jpg";
import img13 from "../../assets/Images/13.jpg";
import img14 from "../../assets/Images/14.jpg";
import img15 from "../../assets/Images/15.jpg";
import img16 from "../../assets/Images/16.jpg";
import img17 from "../../assets/Images/17.jpg";
import img18 from "../../assets/Images/18.jpg";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type CollectionProduct = {
  id: number;
  name: string;
  priceLabel: string;
  category: string;
  carat: number;
  image: string;
  availability: "in-stock" | "made-to-order";
};

type Collection = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tag: "seasonal" | "themed" | "bridal" | "new-launch";
  coverImage: string;
  heroGradient: string;
  products: CollectionProduct[];
  launchDate: string;
};

type FilterTag = "all" | Collection["tag"];

/* ═══════════════════════════════════════════════════════
   MOCK DATA — replace with API
   ═══════════════════════════════════════════════════════ */

const COLLECTIONS: Collection[] = [
  {
    id: "c1",
    name: "Summer Radiance 2026",
    tagline: "Light as sunbeams, bold as summer",
    description: "A curated selection of vibrant gemstone pieces designed for the summer season. Featuring lighter metals and vivid stones that catch the light beautifully.",
    tag: "seasonal",
    coverImage: img15,
    heroGradient: "linear-gradient(135deg, rgba(48,184,191,0.3), rgba(38,96,160,0.2))",
    launchDate: "Apr 1, 2026",
    products: [
      { id: 1, name: "Solitaire Diamond Ring", priceLabel: "₹1,25,000", category: "Rings", carat: 1.5, image: img1, availability: "in-stock" },
      { id: 2, name: "Emerald Drop Earrings", priceLabel: "₹85,000", category: "Earrings", carat: 0.8, image: img3, availability: "in-stock" },
      { id: 9, name: "Diamond Cluster Necklace", priceLabel: "₹3,20,000", category: "Necklaces", carat: 4.2, image: img13, availability: "in-stock" },
      { id: 10, name: "Tanzanite Drop Earrings", priceLabel: "₹1,45,000", category: "Earrings", carat: 1.8, image: img14, availability: "made-to-order" },
    ],
  },
  {
    id: "c2",
    name: "Eternal Bonds",
    tagline: "For promises that last forever",
    description: "Our signature bridal collection featuring timeless engagement rings, wedding bands, and ceremonial sets. Each piece is crafted to symbolize enduring love.",
    tag: "bridal",
    coverImage: img16,
    heroGradient: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.15))",
    launchDate: "Feb 14, 2026",
    products: [
      { id: 1, name: "Solitaire Diamond Ring", priceLabel: "₹1,25,000", category: "Rings", carat: 1.5, image: img1, availability: "in-stock" },
      { id: 8, name: "Platinum Band Ring", priceLabel: "₹1,80,000", category: "Rings", carat: 0.5, image: img12, availability: "made-to-order" },
      { id: 12, name: "Emerald Cocktail Ring", priceLabel: "₹2,75,000", category: "Rings", carat: 2.5, image: img6, availability: "in-stock" },
      { id: 3, name: "Pearl Chain Necklace", priceLabel: "₹1,50,000", category: "Necklaces", carat: 2.0, image: img4, availability: "in-stock" },
      { id: 5, name: "Diamond Stud Set", priceLabel: "₹95,000", category: "Earrings", carat: 1.0, image: img7, availability: "in-stock" },
    ],
  },
  {
    id: "c3",
    name: "Heritage Luxe",
    tagline: "Where tradition meets modern craft",
    description: "A themed collection inspired by royal Indian jewelry traditions. Heavy gold pieces with intricate detailing and heritage motifs, reimagined for the contemporary wearer.",
    tag: "themed",
    coverImage: img17,
    heroGradient: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(194,23,59,0.15))",
    launchDate: "Jan 26, 2026",
    products: [
      { id: 6, name: "Gold Bangle Pair", priceLabel: "₹75,000", category: "Bangles", carat: 0.0, image: img8, availability: "in-stock" },
      { id: 11, name: "Rose Gold Bangle", priceLabel: "₹55,000", category: "Bangles", carat: 0.0, image: img9, availability: "in-stock" },
      { id: 7, name: "Ruby Pendant", priceLabel: "₹65,000", category: "Pendants", carat: 0.6, image: img11, availability: "in-stock" },
      { id: 4, name: "Sapphire Tennis Bracelet", priceLabel: "₹2,10,000", category: "Bracelets", carat: 3.5, image: img5, availability: "in-stock" },
    ],
  },
  {
    id: "c4",
    name: "Spring Bloom 2026",
    tagline: "Fresh designs for the new season",
    description: "Launching this April — our newest collection featuring pastel gemstones, delicate settings, and nature-inspired motifs. Perfect for spring gifting.",
    tag: "new-launch",
    coverImage: img18,
    heroGradient: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(48,184,191,0.15))",
    launchDate: "Apr 15, 2026",
    products: [
      { id: 2, name: "Emerald Drop Earrings", priceLabel: "₹85,000", category: "Earrings", carat: 0.8, image: img3, availability: "in-stock" },
      { id: 7, name: "Ruby Pendant", priceLabel: "₹65,000", category: "Pendants", carat: 0.6, image: img11, availability: "in-stock" },
      { id: 10, name: "Tanzanite Drop Earrings", priceLabel: "₹1,45,000", category: "Earrings", carat: 1.8, image: img14, availability: "made-to-order" },
    ],
  },
];

const TAG_CONFIG: Record<Collection["tag"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  seasonal: { label: "Seasonal", color: "var(--sf-teal)", bg: "rgba(48,184,191,0.15)", icon: <Calendar className="w-3.5 h-3.5" /> },
  themed: { label: "Themed", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: <Crown className="w-3.5 h-3.5" /> },
  bridal: { label: "Bridal", color: "#a855f7", bg: "rgba(168,85,247,0.15)", icon: <Gem className="w-3.5 h-3.5" /> },
  "new-launch": { label: "New Launch", color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: <Sparkles className="w-3.5 h-3.5" /> },
};

const FILTER_TABS: { key: FilterTag; label: string }[] = [
  { key: "all", label: "All Collections" },
  { key: "new-launch", label: "New Launches" },
  { key: "seasonal", label: "Seasonal" },
  { key: "bridal", label: "Bridal" },
  { key: "themed", label: "Themed" },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerCollections() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTag>("all");
  const [openCollection, setOpenCollection] = useState<Collection | null>(null);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let list = COLLECTIONS;
    if (activeFilter !== "all") list = list.filter((c) => c.tag === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q) ||
          c.products.some((p) => p.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, search]);

  const toggleWishlist = (productId: number) => {
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Filter tabs ──────────────────────────── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeFilter === tab.key ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
                color: activeFilter === tab.key ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search ───────────────────────────────── */}
        <div className="relative mb-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--sf-text-muted)" }}
          />
          <Input
            placeholder="Search collections or products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-[var(--sf-divider)]"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-primary)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Collection Grid ──────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-lg font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
              No collections found
            </p>
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
              Try a different filter or search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((collection, i) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                index={i}
                onOpen={() => setOpenCollection(collection)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ═══ Collection Detail Dialog ═══════════════ */}
      <Dialog open={!!openCollection} onOpenChange={() => setOpenCollection(null)}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] p-0 overflow-hidden"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          {openCollection && (
            <>
              {/* Hero banner */}
              <div
                className="relative h-48 sm:h-56 overflow-hidden"
                style={{ background: openCollection.heroGradient }}
              >
                <img
                  src={openCollection.coverImage}
                  alt={openCollection.name}
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CollectionTag tag={openCollection.tag} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Launched {openCollection.launchDate}
                    </span>
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-1"
                    style={{
                      fontFamily: "'Melodrama', 'Georgia', serif",
                      color: "#fff",
                    }}
                  >
                    {openCollection.name}
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {openCollection.tagline}
                  </p>
                </div>
              </div>

              <ScrollArea className="max-h-[calc(90vh-224px)]">
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <p className="text-sm leading-relaxed" style={{ color: "var(--sf-text-secondary)" }}>
                    {openCollection.description}
                  </p>

                  <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                  {/* Products header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                      {openCollection.products.length} Products in this Collection
                    </p>
                  </div>

                  {/* Product list */}
                  <div className="space-y-3">
                    {openCollection.products.map((product) => (
                      <CollectionProductRow
                        key={product.id}
                        product={product}
                        wishlisted={wishlistedIds.has(product.id)}
                        onToggleWishlist={() => toggleWishlist(product.id)}
                        onView={() => {
                          setOpenCollection(null);
                          navigate(`/retailer/product/${product.id}`);
                        }}
                        onOrder={() => {
                          alert(`Order request submitted for: ${product.name}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer actions */}
              <div
                className="flex items-center gap-3 p-4 border-t"
                style={{ borderColor: "var(--sf-divider)" }}
              >
                <Button
                  className="flex-1 h-10 gap-2 text-sm"
                  style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
                  onClick={() => {
                    openCollection.products.forEach((p) => {
                      setWishlistedIds((prev) => new Set([...prev, p.id]));
                    });
                  }}
                >
                  <Heart className="w-4 h-4" />
                  Save All to Wishlist
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 gap-2 text-sm border-[var(--sf-divider)]"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
                  onClick={() => {
                    alert(`Order request submitted for all ${openCollection.products.length} items!`);
                  }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Order Entire Collection
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function CollectionTag({ tag }: { tag: Collection["tag"] }) {
  const cfg = TAG_CONFIG[tag];
  return (
    <Badge
      className="text-[10px] gap-1"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none" }}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function CollectionCard({
  collection,
  index,
  onOpen,
}: {
  collection: Collection;
  index: number;
  onOpen: () => void;
}) {
  const cfg = TAG_CONFIG[collection.tag];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="group rounded-2xl border overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: "var(--sf-divider)",
      }}
    >
      {/* Cover image with gradient overlay */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img
          src={collection.coverImage}
          alt={collection.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `${collection.heroGradient}, linear-gradient(to top, rgba(8,10,13,0.85) 0%, transparent 60%)`,
          }}
        />

        {/* Tag badge */}
        <div className="absolute top-3 left-3">
          <CollectionTag tag={collection.tag} />
        </div>

        {/* Product count */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-md"
          style={{
            backgroundColor: "rgba(8,10,13,0.5)",
            color: "var(--sf-text-secondary)",
          }}
        >
          <Layers className="w-3 h-3" />
          {collection.products.length} items
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="text-xl sm:text-2xl font-semibold mb-0.5"
            style={{
              fontFamily: "'Melodrama', 'Georgia', serif",
              color: "#fff",
            }}
          >
            {collection.name}
          </h3>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            {collection.tagline}
          </p>
        </div>
      </div>

      {/* Bottom strip — product thumbnails + CTA */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          {/* Stacked thumbnails */}
          <div className="flex -space-x-2">
            {collection.products.slice(0, 4).map((p, i) => (
              <img
                key={p.id}
                src={p.image}
                alt={p.name}
                className="w-8 h-8 rounded-full object-cover border-2"
                style={{
                  borderColor: "var(--sf-bg-surface-1)",
                  zIndex: 4 - i,
                  position: "relative",
                }}
              />
            ))}
            {collection.products.length > 4 && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 relative"
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-bg-surface-1)",
                  color: "var(--sf-text-muted)",
                }}
              >
                +{collection.products.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs ml-3" style={{ color: "var(--sf-text-muted)" }}>
            {collection.launchDate}
          </span>
        </div>

        <Button
          variant="ghost"
          className="h-8 text-xs gap-1"
          style={{ color: "var(--sf-teal)" }}
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function CollectionProductRow({
  product,
  wishlisted,
  onToggleWishlist,
  onView,
  onOrder,
}: {
  product: CollectionProduct;
  wishlisted: boolean;
  onToggleWishlist: () => void;
  onView: () => void;
  onOrder: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--sf-bg-surface-2)]"
      style={{ borderColor: "var(--sf-divider)" }}
    >
      {/* Image */}
      <img
        src={product.image}
        alt={product.name}
        className="w-14 h-14 rounded-lg object-cover shrink-0 cursor-pointer"
        onClick={onView}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate cursor-pointer"
          style={{ color: "var(--sf-text-primary)" }}
          onClick={onView}
        >
          {product.name}
        </p>
        <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
          {product.category}
          {product.carat > 0 && ` · ${product.carat} ct`}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
            {product.priceLabel}
          </span>
          <Badge
            className="text-[9px]"
            style={{
              backgroundColor:
                product.availability === "in-stock"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(48,184,191,0.15)",
              color:
                product.availability === "in-stock" ? "#22c55e" : "var(--sf-teal)",
              border: "none",
            }}
          >
            {product.availability === "in-stock" ? "In Stock" : "Made to Order"}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleWishlist}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            color: wishlisted ? "#ef4444" : "var(--sf-text-muted)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Heart className="w-4 h-4" fill={wishlisted ? "#ef4444" : "none"} />
        </button>
        <button
          onClick={onOrder}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            color: "var(--sf-teal)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
        <button
          onClick={onView}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            color: "var(--sf-text-secondary)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
