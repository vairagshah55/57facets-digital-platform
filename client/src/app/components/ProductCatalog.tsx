import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent } from "./ui/card";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useNavigate, useSearchParams } from "react-router";
import { products as productsApi, imageUrl } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════════════ */

type ApiProduct = {
  id: number; name: string; sku: string; base_price: string;
  carat: number; metal_type: string;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  is_new: boolean; category: string; image: string | null;
};

type Product = {
  id: number; name: string; price: number; priceLabel: string;
  category: string; carat: number;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  image: string; isNew: boolean;
};

type Category = { id: number; name: string; image_url: string | null };
type ViewMode = "grid" | "compact";

const PRICE_MIN = 0, PRICE_MAX = 500000, CARAT_MIN = 0, CARAT_MAX = 5;

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='%23222'%3E%3Crect width='400' height='400' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14' fill='%23555'%3ENo Image%3C/text%3E%3C/svg%3E";

function formatPrice(n: number): string { return "₹" + n.toLocaleString("en-IN"); }

function mapProduct(p: ApiProduct): Product {
  const price = Number(p.base_price) || 0;
  return {
    id: p.id, name: p.name, price, priceLabel: formatPrice(price),
    category: p.category, carat: p.carat ?? 0, availability: p.availability,
    image: p.image ? imageUrl(p.image) : PLACEHOLDER_IMAGE, isNew: p.is_new,
  };
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function ProductCatalog() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
  const [activeTab, setActiveTab] = useState<"all" | "new" | "viewed">(
    (searchParams.get("tab") as any) || "all"
  );

  const [priceRange, setPriceRange] = useState<number[]>([PRICE_MIN, PRICE_MAX]);
  const [caratRange, setCaratRange] = useState<number[]>([CARAT_MIN, CARAT_MAX]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    "in-stock": false, "made-to-order": false, "out-of-stock": false,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [activeCategory, activeTab, priceRange, caratRange, availability]);

  useEffect(() => {
    productsApi.categories().then((data: Category[]) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchProducts() {
      try {
        if (activeTab === "viewed") {
          const data: ApiProduct[] = await productsApi.recentlyViewed();
          const result = (data || []).map(mapProduct);
          if (!cancelled) { setProducts(result); setTotalProducts(result.length); setTotalPages(1); }
        } else {
          const params: Record<string, string> = {};
          if (activeCategory !== "All") params.category = activeCategory;
          if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
          if (priceRange[0] > PRICE_MIN) params.min_price = String(priceRange[0]);
          if (priceRange[1] < PRICE_MAX) params.max_price = String(priceRange[1]);
          if (caratRange[0] > CARAT_MIN) params.min_carat = String(caratRange[0]);
          if (caratRange[1] < CARAT_MAX) params.max_carat = String(caratRange[1]);
          const activeAvail = Object.entries(availability).filter(([, v]) => v).map(([k]) => k);
          if (activeAvail.length > 0) params.availability = activeAvail.join(",");
          if (activeTab === "new") params.is_new = "true";
          params.page = String(page);
          params.limit = "24";
          const data = await productsApi.list(params);
          if (!cancelled) {
            const mapped = ((data.products || []) as ApiProduct[]).map(mapProduct);
            setProducts(mapped); setTotalProducts(data.total ?? mapped.length); setTotalPages(data.totalPages ?? 1);
          }
        }
      } catch { if (!cancelled) { setProducts([]); setTotalProducts(0); setTotalPages(1); } }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [activeTab, activeCategory, debouncedSearch, priceRange, caratRange, availability, page]);

  const displayCategories = useMemo(() => {
    const all: { name: string; image: string | null }[] = [{ name: "All", image: null }];
    return all.concat(categories.map((c) => ({ name: c.name, image: c.image_url })));
  }, [categories]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX) c++;
    if (caratRange[0] > CARAT_MIN || caratRange[1] < CARAT_MAX) c++;
    if (Object.values(availability).some(Boolean)) c++;
    return c;
  }, [priceRange, caratRange, availability]);

  const clearFilters = useCallback(() => {
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCaratRange([CARAT_MIN, CARAT_MAX]);
    setAvailability({ "in-stock": false, "made-to-order": false, "out-of-stock": false });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: "rgba(48,184,191,0.12)" }}
          >
            <Package className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
          </div>
          <div>
            <h1
              className="text-xl font-semibold leading-tight"
              style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}
            >
              Product Catalog
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
              {loading ? "Loading..." : `${totalProducts} products available`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-[var(--sf-divider)]"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--sf-text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Tabs + Category + Filters bar ═══ */}
      <Card className="border-[var(--sf-divider)] mb-6 overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
        {/* Tabs row */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {([
              { key: "all", label: "All Products", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { key: "new", label: "New Arrivals", icon: <Sparkles className="w-3.5 h-3.5" /> },
              { key: "viewed", label: "Recently Viewed", icon: <Eye className="w-3.5 h-3.5" /> },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    background: isActive ? "linear-gradient(135deg, rgba(48,184,191,0.15), rgba(38,96,160,0.1))" : "none",
                    border: isActive ? "1px solid rgba(48,184,191,0.25)" : "1px solid transparent",
                    color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="lg:hidden h-9 gap-1.5 text-xs rounded-lg border-[var(--sf-divider)]"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-secondary)" }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="h-4 w-4 p-0 justify-center text-[9px]" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] border-[var(--sf-divider)]" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
              <SheetHeader><SheetTitle style={{ color: "var(--sf-text-primary)" }}>Filters</SheetTitle></SheetHeader>
              <ScrollArea className="flex-1 px-4">
                <FilterPanel priceRange={priceRange} setPriceRange={setPriceRange} caratRange={caratRange} setCaratRange={setCaratRange}
                  availability={availability} setAvailability={setAvailability} onClear={clearFilters} activeCount={activeFiltersCount} />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {displayCategories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer"
                style={{
                  background: isActive ? "linear-gradient(135deg, rgba(48,184,191,0.18), rgba(38,96,160,0.12))" : "var(--sf-bg-surface-2)",
                  border: isActive ? "1px solid rgba(48,184,191,0.35)" : "1px solid var(--sf-divider)",
                  color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)",
                }}
              >
                {cat.image && <img src={imageUrl(cat.image)} alt={cat.name} className="w-5 h-5 rounded-full object-cover" />}
                {cat.name === "All" ? "All Categories" : cat.name}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ═══ Main Layout ═══ */}
      <div className="flex gap-5">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <Card className="sticky top-20 border-[var(--sf-divider)] overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
            <CardContent className="p-4">
              <FilterPanel priceRange={priceRange} setPriceRange={setPriceRange} caratRange={caratRange} setCaratRange={setCaratRange}
                availability={availability} setAvailability={setAvailability} onClear={clearFilters} activeCount={activeFiltersCount} />
            </CardContent>
          </Card>
        </aside>

        {/* Product grid area */}
        <div className="flex-1 min-w-0">
          {/* Results bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              {loading ? "Loading..." : `Showing ${products.length} of ${totalProducts} products`}
            </p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: "var(--sf-teal)", background: "none", border: "none" }}>
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-24">
                <Loader2 className="w-8 h-8 mb-3 animate-spin" style={{ color: "var(--sf-teal)" }} />
                <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>Loading products...</p>
              </motion.div>
            ) : products.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-24">
                <Diamond className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
                <p className="text-base font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>No products found</p>
                <p className="text-sm mb-4" style={{ color: "var(--sf-text-muted)" }}>Try adjusting your search or filters</p>
                <Button variant="ghost" style={{ color: "var(--sf-teal)" }} onClick={() => { setSearch(""); setActiveCategory("All"); setActiveTab("all"); clearFilters(); }}>
                  Reset all
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key={`${activeTab}-${activeCategory}-${viewMode}-${page}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} compact={viewMode === "compact"} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline" size="sm" disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 gap-1 rounded-lg border-[var(--sf-divider)]"
                style={{ color: "var(--sf-text-secondary)" }}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-9 h-9 rounded-lg text-sm font-medium transition-all cursor-pointer"
                      style={{
                        background: p === page ? "var(--sf-teal)" : "var(--sf-bg-surface-2)",
                        color: p === page ? "#fff" : "var(--sf-text-muted)",
                        border: p === page ? "none" : "1px solid var(--sf-divider)",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-9 gap-1 rounded-lg border-[var(--sf-divider)]"
                style={{ color: "var(--sf-text-secondary)" }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FILTER PANEL
   ═══════════════════════════════════════════════════════ */

function FilterPanel({ priceRange, setPriceRange, caratRange, setCaratRange, availability, setAvailability, onClear, activeCount }: {
  priceRange: number[]; setPriceRange: (v: number[]) => void;
  caratRange: number[]; setCaratRange: (v: number[]) => void;
  availability: Record<string, boolean>; setAvailability: (v: Record<string, boolean>) => void;
  onClear: () => void; activeCount: number;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          Filters
          {activeCount > 0 && (
            <Badge className="h-5 w-5 p-0 justify-center text-[10px]" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
              {activeCount}
            </Badge>
          )}
        </h3>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs cursor-pointer" style={{ color: "var(--sf-teal)", background: "none", border: "none" }}>Clear all</button>
        )}
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <FilterSection title="Diamond Carat">
        <Slider min={CARAT_MIN} max={CARAT_MAX} step={0.1} value={caratRange} onValueChange={setCaratRange} className="mt-2" />
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{caratRange[0].toFixed(1)} ct</span>
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{caratRange[1].toFixed(1)} ct</span>
        </div>
      </FilterSection>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <FilterSection title="Price Range">
        <Slider min={PRICE_MIN} max={PRICE_MAX} step={5000} value={priceRange} onValueChange={setPriceRange} className="mt-2" />
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>₹{(priceRange[0] / 1000).toFixed(0)}K</span>
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>₹{(priceRange[1] / 1000).toFixed(0)}K</span>
        </div>
      </FilterSection>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <FilterSection title="Availability">
        <div className="space-y-3 mt-2">
          {[
            { key: "in-stock", label: "In Stock" },
            { key: "made-to-order", label: "Made to Order" },
            { key: "out-of-stock", label: "Out of Stock" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={availability[opt.key]} onCheckedChange={(checked) => setAvailability({ ...availability, [opt.key]: !!checked })} />
              <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-sm font-medium cursor-pointer" style={{ color: "var(--sf-text-primary)", background: "none", border: "none" }}>
        {title}
        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: "var(--sf-text-muted)", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRODUCT CARD
   ═══════════════════════════════════════════════════════ */

function ProductCard({ product, index, compact }: { product: Product; index: number; compact: boolean }) {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([product.image]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fetched, setFetched] = useState(false);

  const availColors: Record<string, { bg: string; text: string; label: string }> = {
    "in-stock": { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "In Stock" },
    "made-to-order": { bg: "rgba(48,184,191,0.15)", text: "var(--sf-teal)", label: "Made to Order" },
    "out-of-stock": { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)", label: "Out of Stock" },
  };
  const avail = availColors[product.availability];

  async function loadImages() {
    if (fetched) return;
    setFetched(true);
    try {
      const detail = await productsApi.detail(String(product.id));
      const imgs: string[] = ((detail as any).images || []).map((img: any) =>
        typeof img === "string" ? imageUrl(img) : imageUrl(img.url || img.image_url)
      );
      if (imgs.length > 0) setImages(imgs);
    } catch { /* keep primary image */ }
  }

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    loadImages();
    setActiveIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    loadImages();
    setActiveIdx((i) => (i < images.length - 1 ? i + 1 : 0));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/retailer/product/${product.id}`)}
      onMouseEnter={loadImages}
      className="card-shimmer-wrap group rounded-xl border overflow-hidden cursor-pointer"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
    >
      <div className="aspect-square" style={{ position: "relative", overflow: "hidden" }}>
        <img src={images[activeIdx] || product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

        {/* Left arrow — appears on hover */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "rgba(8,10,13,0.6)", color: "var(--sf-text-primary)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right arrow — appears on hover */}
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "rgba(8,10,13,0.6)", color: "var(--sf-text-primary)" }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Image counter — appears on hover */}
        {images.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "rgba(8,10,13,0.6)", color: "var(--sf-text-secondary)" }}
          >
            {activeIdx + 1} / {images.length}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>NEW</Badge>
          )}
        </div>
        {!compact && (
          <div className="absolute top-2 right-2">
            <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: avail.bg, color: avail.text, border: "none" }}>{avail.label}</Badge>
          </div>
        )}
      </div>

      <div className={compact ? "p-2" : "p-3"}>
        {!compact && (
          <p className="text-[11px] mb-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {product.category}{product.carat > 0 && ` · ${product.carat} ct`}
          </p>
        )}
        <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"} mb-1`} style={{ color: "var(--sf-text-primary)" }}>{product.name}</p>
        <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`} style={{ color: "var(--sf-teal)" }}>{product.priceLabel}</p>
      </div>
    </motion.div>
  );
}
