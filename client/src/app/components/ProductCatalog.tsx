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
  Diamond,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useNavigate } from "react-router";
import { products as productsApi } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ApiProduct = {
  id: number;
  name: string;
  sku: string;
  base_price: string;
  carat: number;
  metal_type: string;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  is_new: boolean;
  category: string;
  image: string | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  priceLabel: string;
  category: string;
  carat: number;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  image: string;
  isNew: boolean;
};

type Category = {
  id: number;
  name: string;
  image_url: string | null;
};

type ViewMode = "grid" | "compact";

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const PRICE_MIN = 0;
const PRICE_MAX = 500000;
const CARAT_MIN = 0;
const CARAT_MAX = 5;

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='%23222'%3E%3Crect width='400' height='400' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14' fill='%23555'%3ENo Image%3C/text%3E%3C/svg%3E";

/** Format a number as Indian Rupee label */
function formatPrice(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

/** Map an API product to the internal Product shape */
function mapProduct(p: ApiProduct): Product {
  const price = Number(p.base_price) || 0;
  return {
    id: p.id,
    name: p.name,
    price,
    priceLabel: formatPrice(price),
    category: p.category,
    carat: p.carat ?? 0,
    availability: p.availability,
    image: p.image || PLACEHOLDER_IMAGE,
    isNew: p.is_new,
  };
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function ProductCatalog() {
  // View & search state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"all" | "new" | "viewed">("all");

  // Filter state
  const [priceRange, setPriceRange] = useState<number[]>([PRICE_MIN, PRICE_MAX]);
  const [caratRange, setCaratRange] = useState<number[]>([CARAT_MIN, CARAT_MAX]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    "in-stock": false,
    "made-to-order": false,
    "out-of-stock": false,
  });

  // API data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeCategory, activeTab, priceRange, caratRange, availability]);

  // Fetch categories on mount
  useEffect(() => {
    productsApi.categories().then((data: Category[]) => {
      setCategories(data);
    }).catch(() => {
      // silently fail — category bar will just show "All"
    });
  }, []);

  // Fetch products when filters / tab / page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchProducts() {
      try {
        let result: Product[];

        if (activeTab === "viewed") {
          // Recently viewed uses its own endpoint
          const data: ApiProduct[] = await productsApi.recentlyViewed();
          result = (data || []).map(mapProduct);
          if (!cancelled) {
            setProducts(result);
            setTotalProducts(result.length);
            setTotalPages(1);
          }
        } else {
          // Build query params for productsApi.list
          const params: Record<string, string> = {};

          if (activeCategory !== "All") params.category = activeCategory;
          if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
          if (priceRange[0] > PRICE_MIN) params.min_price = String(priceRange[0]);
          if (priceRange[1] < PRICE_MAX) params.max_price = String(priceRange[1]);
          if (caratRange[0] > CARAT_MIN) params.min_carat = String(caratRange[0]);
          if (caratRange[1] < CARAT_MAX) params.max_carat = String(caratRange[1]);

          const activeAvail = Object.entries(availability)
            .filter(([, v]) => v)
            .map(([k]) => k);
          if (activeAvail.length > 0) params.availability = activeAvail.join(",");

          if (activeTab === "new") params.is_new = "true";

          params.page = String(page);
          params.limit = "24";

          const data = await productsApi.list(params);
          if (!cancelled) {
            const mapped = ((data.products || []) as ApiProduct[]).map(mapProduct);
            setProducts(mapped);
            setTotalProducts(data.total ?? mapped.length);
            setTotalPages(data.totalPages ?? 1);
          }
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotalProducts(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [activeTab, activeCategory, debouncedSearch, priceRange, caratRange, availability, page]);

  // Derived categories list with "All" prepended
  const displayCategories = useMemo(() => {
    const all: { name: string; image: string | null }[] = [{ name: "All", image: null }];
    return all.concat(categories.map((c) => ({ name: c.name, image: c.image_url })));
  }, [categories]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX) count++;
    if (caratRange[0] > CARAT_MIN || caratRange[1] < CARAT_MAX) count++;
    if (Object.values(availability).some(Boolean)) count++;
    return count;
  }, [priceRange, caratRange, availability]);

  const clearFilters = useCallback(() => {
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCaratRange([CARAT_MIN, CARAT_MAX]);
    setAvailability({ "in-stock": false, "made-to-order": false, "out-of-stock": false });
  }, []);

  return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Search + Filter Bar ─────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--sf-text-muted)" }}
            />
            <Input
              placeholder="Search by name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 border-[var(--sf-divider)]"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                color: "var(--sf-text-primary)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--sf-text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="lg:hidden h-11 gap-2 border-[var(--sf-divider)]"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  color: "var(--sf-text-secondary)",
                }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    className="h-5 w-5 p-0 justify-center text-[10px]"
                    style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
            >
              <SheetHeader>
                <SheetTitle style={{ color: "var(--sf-text-primary)" }}>Filters</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4">
                <FilterPanel
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  caratRange={caratRange}
                  setCaratRange={setCaratRange}
                  availability={availability}
                  setAvailability={setAvailability}
                  onClear={clearFilters}
                  activeCount={activeFiltersCount}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Tabs: All / New Arrivals / Recently Viewed ─ */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {(
            [
              { key: "all", label: "All Products", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { key: "new", label: "New Arrivals", icon: <Sparkles className="w-3.5 h-3.5" /> },
              { key: "viewed", label: "Recently Viewed", icon: <Eye className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor:
                  activeTab === tab.key ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
                color:
                  activeTab === tab.key ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Category Nav ─────────────────────────────── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {displayCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap text-sm font-medium transition-all shrink-0"
              style={{
                backgroundColor:
                  activeCategory === cat.name
                    ? "var(--sf-bg-surface-3)"
                    : "var(--sf-bg-surface-1)",
                borderColor:
                  activeCategory === cat.name
                    ? "var(--sf-teal)"
                    : "var(--sf-divider)",
                color:
                  activeCategory === cat.name
                    ? "var(--sf-teal)"
                    : "var(--sf-text-secondary)",
              }}
            >
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Main Layout: Sidebar + Grid ──────────────── */}
        <div className="flex gap-6">
          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div
              className="sticky top-20 rounded-xl border p-4"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                borderColor: "var(--sf-divider)",
              }}
            >
              <FilterPanel
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                caratRange={caratRange}
                setCaratRange={setCaratRange}
                availability={availability}
                setAvailability={setAvailability}
                onClear={clearFilters}
                activeCount={activeFiltersCount}
              />
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Results count + active filters */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                {loading ? "Loading..." : `${totalProducts} product${totalProducts !== 1 ? "s" : ""} found`}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs flex items-center gap-1"
                  style={{ color: "var(--sf-teal)" }}
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Product Grid */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <Loader2
                    className="w-10 h-10 mb-4 animate-spin"
                    style={{ color: "var(--sf-teal)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                    Loading products...
                  </p>
                </motion.div>
              ) : products.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <Diamond
                    className="w-12 h-12 mb-4"
                    style={{ color: "var(--sf-text-muted)" }}
                  />
                  <p
                    className="text-lg font-medium mb-1"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    No products found
                  </p>
                  <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    style={{ color: "var(--sf-teal)" }}
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("All");
                      setActiveTab("all");
                      clearFilters();
                    }}
                  >
                    Reset all
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key={`${activeTab}-${activeCategory}-${viewMode}-${page}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                      : "grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3"
                  }
                >
                  {products.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      compact={viewMode === "compact"}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-[var(--sf-divider)]"
                  style={{ color: "var(--sf-text-secondary)" }}
                >
                  Previous
                </Button>
                <span className="text-sm px-3" style={{ color: "var(--sf-text-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border-[var(--sf-divider)]"
                  style={{ color: "var(--sf-text-secondary)" }}
                >
                  Next
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

function FilterPanel({
  priceRange,
  setPriceRange,
  caratRange,
  setCaratRange,
  availability,
  setAvailability,
  onClear,
  activeCount,
}: {
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  caratRange: number[];
  setCaratRange: (v: number[]) => void;
  availability: Record<string, boolean>;
  setAvailability: (v: Record<string, boolean>) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--sf-text-primary)" }}
        >
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          Filters
          {activeCount > 0 && (
            <Badge
              className="h-5 w-5 p-0 justify-center text-[10px]"
              style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
            >
              {activeCount}
            </Badge>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs"
            style={{ color: "var(--sf-teal)" }}
          >
            Clear all
          </button>
        )}
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      {/* Diamond Carat Range */}
      <FilterSection title="Diamond Carat">
        <Slider
          min={CARAT_MIN}
          max={CARAT_MAX}
          step={0.1}
          value={caratRange}
          onValueChange={setCaratRange}
          className="mt-2"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            {caratRange[0].toFixed(1)} ct
          </span>
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            {caratRange[1].toFixed(1)} ct
          </span>
        </div>
      </FilterSection>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      {/* Price Range */}
      <FilterSection title="Price Range">
        <Slider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={5000}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mt-2"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            ₹{(priceRange[0] / 1000).toFixed(0)}K
          </span>
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            ₹{(priceRange[1] / 1000).toFixed(0)}K
          </span>
        </div>
      </FilterSection>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      {/* Availability */}
      <FilterSection title="Availability">
        <div className="space-y-3 mt-2">
          {[
            { key: "in-stock", label: "In Stock" },
            { key: "made-to-order", label: "Made to Order" },
            { key: "out-of-stock", label: "Out of Stock" },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Checkbox
                checked={availability[opt.key]}
                onCheckedChange={(checked) =>
                  setAvailability({ ...availability, [opt.key]: !!checked })
                }
              />
              <span
                className="text-sm"
                style={{ color: "var(--sf-text-secondary)" }}
              >
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-medium"
        style={{ color: "var(--sf-text-primary)" }}
      >
        {title}
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            color: "var(--sf-text-muted)",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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

function ProductCard({
  product,
  index,
  compact,
}: {
  product: Product;
  index: number;
  compact: boolean;
}) {
  const navigate = useNavigate();
  const availColors: Record<string, { bg: string; text: string; label: string }> = {
    "in-stock": { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "In Stock" },
    "made-to-order": { bg: "rgba(48,184,191,0.15)", text: "var(--sf-teal)", label: "Made to Order" },
    "out-of-stock": { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)", label: "Out of Stock" },
  };

  const avail = availColors[product.availability];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35 }}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/retailer/product/${product.id}`)}
      className="card-shimmer-wrap group rounded-xl border overflow-hidden cursor-pointer"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: "var(--sf-divider)",
      }}
    >
      {/* Image */}
      <div className={compact ? "aspect-square" : "aspect-[4/5]"} style={{ position: "relative", overflow: "hidden" }}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <Badge
              className="text-[10px] px-1.5 py-0.5"
              style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
            >
              NEW
            </Badge>
          )}
        </div>
        {!compact && (
          <div className="absolute top-2 right-2">
            <Badge
              className="text-[10px] px-1.5 py-0.5"
              style={{ backgroundColor: avail.bg, color: avail.text, border: "none" }}
            >
              {avail.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={compact ? "p-2" : "p-3"}>
        {!compact && (
          <p className="text-xs mb-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {product.category}
            {product.carat > 0 && ` · ${product.carat} ct`}
          </p>
        )}
        <p
          className={`font-medium truncate ${compact ? "text-xs" : "text-sm"} mb-1`}
          style={{ color: "var(--sf-text-primary)" }}
        >
          {product.name}
        </p>
        <p
          className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: "var(--sf-teal)" }}
        >
          {product.priceLabel}
        </p>
      </div>
    </motion.div>
  );
}
