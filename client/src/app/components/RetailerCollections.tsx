import { useState, useMemo, useEffect, useCallback } from "react";
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
  Loader2,
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

import { collections as collectionsApi, wishlist as wishlistApi } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type CollectionProduct = {
  id: string;
  name: string;
  base_price: number;
  category: string;
  carat: number;
  image: string | null;
  availability: "in-stock" | "made-to-order";
  sku?: string;
};

type Collection = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tag: "seasonal" | "themed" | "bridal" | "new-launch";
  cover_image: string | null;
  launch_date: string;
  product_count: number;
  products?: CollectionProduct[];
};

type FilterTag = "all" | Collection["tag"];

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23181a1f'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

const HERO_GRADIENTS: Record<Collection["tag"], string> = {
  seasonal: "linear-gradient(135deg, rgba(48,184,191,0.3), rgba(38,96,160,0.2))",
  themed: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(194,23,59,0.15))",
  bridal: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.15))",
  "new-launch": "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(48,184,191,0.15))",
};

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

function formatPrice(price: number): string {
  return "₹" + price.toLocaleString("en-IN");
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerCollections() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTag>("all");
  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail dialog state
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [detailCollection, setDetailCollection] = useState<(Collection & { products: CollectionProduct[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  // Fetch collections when filter or search changes
  useEffect(() => {
    let cancelled = false;
    const fetchCollections = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (activeFilter !== "all") params.tag = activeFilter;
        if (search.trim()) params.search = search.trim();
        const data = await collectionsApi.list(params);
        if (!cancelled) {
          setCollectionsList(Array.isArray(data) ? data : data.collections ?? []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load collections");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCollections();
    return () => { cancelled = true; };
  }, [activeFilter, search]);

  // Fetch collection detail when dialog opens
  useEffect(() => {
    if (!openCollectionId) {
      setDetailCollection(null);
      return;
    }
    let cancelled = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await collectionsApi.detail(openCollectionId);
        if (!cancelled) setDetailCollection(data);
      } catch {
        if (!cancelled) setDetailCollection(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    fetchDetail();
    return () => { cancelled = true; };
  }, [openCollectionId]);

  const toggleWishlist = useCallback(async (productId: string) => {
    const wasWishlisted = wishlistedIds.has(productId);
    // Optimistic update
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      if (wasWishlisted) {
        await wishlistApi.remove(productId);
      } else {
        await wishlistApi.add(productId);
      }
    } catch {
      // Revert on failure
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.add(productId);
        else next.delete(productId);
        return next;
      });
    }
  }, [wishlistedIds]);

  const saveAllToWishlist = useCallback(async (products: CollectionProduct[]) => {
    const ids = products.map((p) => p.id);
    setWishlistedIds((prev) => new Set([...prev, ...ids]));
    try {
      await wishlistApi.bulkAdd(ids);
    } catch {
      // Revert on failure
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, []);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* -- Filter tabs */}
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

        {/* -- Search */}
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

        {/* -- Loading / Error / Collection Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--sf-teal)" }} />
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>Loading collections...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-lg font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
              Failed to load collections
            </p>
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>{error}</p>
          </div>
        ) : collectionsList.length === 0 ? (
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
            {collectionsList.map((collection, i) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                index={i}
                onOpen={() => setOpenCollectionId(collection.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* === Collection Detail Dialog === */}
      <Dialog open={!!openCollectionId} onOpenChange={() => setOpenCollectionId(null)}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] p-0 overflow-hidden"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sf-teal)" }} />
            </div>
          ) : detailCollection ? (
            <>
              {/* Hero banner */}
              <div
                className="relative h-48 sm:h-56 overflow-hidden"
                style={{ background: HERO_GRADIENTS[detailCollection.tag] || HERO_GRADIENTS.seasonal }}
              >
                <img
                  src={detailCollection.cover_image || PLACEHOLDER_IMAGE}
                  alt={detailCollection.name}
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CollectionTag tag={detailCollection.tag} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Launched {detailCollection.launch_date}
                    </span>
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-semibold mb-1"
                    style={{
                      fontFamily: "'Melodrama', 'Georgia', serif",
                      color: "#fff",
                    }}
                  >
                    {detailCollection.name}
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {detailCollection.tagline}
                  </p>
                </div>
              </div>

              <ScrollArea className="max-h-[calc(90vh-224px)]">
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <p className="text-sm leading-relaxed" style={{ color: "var(--sf-text-secondary)" }}>
                    {detailCollection.description}
                  </p>

                  <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                  {/* Products header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                      {detailCollection.products?.length ?? 0} Products in this Collection
                    </p>
                  </div>

                  {/* Product list */}
                  <div className="space-y-3">
                    {(detailCollection.products ?? []).map((product) => (
                      <CollectionProductRow
                        key={product.id}
                        product={product}
                        wishlisted={wishlistedIds.has(product.id)}
                        onToggleWishlist={() => toggleWishlist(product.id)}
                        onView={() => {
                          setOpenCollectionId(null);
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
                    if (detailCollection.products) {
                      saveAllToWishlist(detailCollection.products);
                    }
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
                    alert(`Order request submitted for all ${detailCollection.products?.length ?? 0} items!`);
                  }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Order Entire Collection
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>Failed to load collection details.</p>
            </div>
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
  if (!cfg) return null;
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
  const gradient = HERO_GRADIENTS[collection.tag] || HERO_GRADIENTS.seasonal;
  const coverSrc = collection.cover_image || PLACEHOLDER_IMAGE;

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
          src={coverSrc}
          alt={collection.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `${gradient}, linear-gradient(to top, var(--sf-overlay-bg) 0%, transparent 60%)`,
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
            backgroundColor: "var(--sf-backdrop)",
            color: "var(--sf-text-secondary)",
          }}
        >
          <Layers className="w-3 h-3" />
          {collection.product_count} items
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

      {/* Bottom strip */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            {collection.launch_date}
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
  const imgSrc = product.image || PLACEHOLDER_IMAGE;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--sf-bg-surface-2)]"
      style={{ borderColor: "var(--sf-divider)" }}
    >
      {/* Image */}
      <img
        src={imgSrc}
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
            {formatPrice(product.base_price)}
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
