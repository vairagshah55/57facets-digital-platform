import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Sparkles,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Diamond,
  Package,
  Heart,
  ShoppingCart,
  Check,
  Lock,
  Expand,
} from "lucide-react";
import { ImageViewer } from "./ImageViewer";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent } from "./ui/card";
import { SmartImage } from "./ui/SmartImage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useNavigate, useSearchParams } from "react-router";
import { products as productsApi, wishlist as wishlistApi, orders as ordersApi, collections as collectionsApi, uploads as uploadsApi, imageUrl, imageVariant } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

/* ═══════════════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════════════ */

type ApiProduct = {
  id: number; name: string; sku: string; base_price: string;
  price?: number; price_source?: string;
  carat: number; metal_type: string;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  is_new: boolean; category: string; image: string | null;
};

type Product = {
  id: number; name: string; sku: string; price: number; priceLabel: string;
  category: string; carat: number;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  image: string; isNew: boolean;
};

type Category = { id: number; name: string; image_url: string | null; product_count?: number };
type ViewMode = "grid" | "compact";

const PRICE_MIN = 0, PRICE_MAX = 500000, CARAT_MIN = 0, CARAT_MAX = 5;
const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_PAGE_SIZE = 12;
// Preset type categories (mirrors the admin product editor). Shown in full in the
// Type filter regardless of which values currently exist in the catalog.
const TYPE_CATEGORY_OPTIONS = ["DIAMOND", "GOLD", "POLKI", "KUNDAN"];

// Canonical category → type → sub-category taxonomy (business spec). Drives the
// Sub-category filter so only VALID sub-categories show for the chosen category
// AND type — regardless of mis-tagged data. E.g. a Gold Ring must not offer
// "Solitaire". "*" is the full set used when no specific type is selected.
// Categories not listed here fall back to the sub-categories present in the data.
const CANONICAL_SUBCATEGORIES: Record<string, Record<string, string[]>> = {
  Rings: {
    "*":     ["LADIES", "GENTS", "SOLITAIRE", "COCKTAIL"],
    DIAMOND: ["LADIES", "GENTS", "SOLITAIRE", "COCKTAIL"],
    GOLD:    ["LADIES", "GENTS", "SOLITAIRE"],
  },
  Earrings: {
    "*":     ["TOPS", "SOLITAIRE", "BALI", "JHUMKA", "KODA JODI"],
    DIAMOND: ["TOPS", "SOLITAIRE", "BALI", "JHUMKA", "KODA JODI"],
    GOLD:    ["TOPS", "BALI", "JHUMKA"],
  },
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

function formatPrice(n: number, isINR = true): string {
  return (isINR ? "₹" : "$") + n.toLocaleString(isINR ? "en-IN" : "en-US");
}

// Normalize a (possibly ALL-CAPS) category/label to Title Case: "PENDENT SET
// PENDENT" -> "Pendent Set Pendent". Leaves already-cased names looking the same.
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build the page list with ellipses: always show first & last, plus a window
// around the current page — e.g. [1, "…", 4, 5, 6, "…", 20].
function pageItems(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const pages: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) pages.push(i);
  }
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (prev) {
      if (p - prev === 2) out.push(prev + 1);
      else if (p - prev > 2) out.push("…");
    }
    out.push(p);
    prev = p;
  }
  return out;
}

function mapProduct(p: ApiProduct, isINR = true): Product {
  // Prefer the per-retailer price computed by the server; fall back to base_price.
  const price = p.price != null ? Number(p.price) : (Number(p.base_price) || 0);
  return {
    id: p.id, name: p.name, sku: p.sku || "", price, priceLabel: formatPrice(price, isINR),
    category: p.category, carat: p.carat ?? 0, availability: p.availability,
    image: p.image ? imageUrl(p.image) : PLACEHOLDER_IMAGE, isNew: p.is_new,
  };
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function ProductCatalog({ collectionId: collectionIdProp }: { collectionId?: string } = {}) {
  const navigate = useNavigate();
  const { retailer } = useAuth();
  const isINR = (retailer?.country || "India") === "India"; // currency for this retailer
  const [searchParams, setSearchParams] = useSearchParams();
  // Collection can come from a dedicated route param (prop) or a ?collection= query.
  const collectionId = collectionIdProp ?? searchParams.get("collection");
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "All");
  const [activeTab, setActiveTab] = useState<"all" | "new" | "viewed" | "unseen">(
    (searchParams.get("tab") as any) || "all"
  );

  // Switch tab AND keep the URL's ?tab= in sync so a stale param can't
  // re-select a tab on the next render/refresh.
  const changeTab = useCallback((key: "all" | "new" | "viewed" | "unseen") => {
    setActiveTab(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === "all") next.delete("tab");
      else next.set("tab", key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [priceRange, setPriceRange] = useState<number[]>([PRICE_MIN, PRICE_MAX]);
  const [caratRange, setCaratRange] = useState<number[]>([CARAT_MIN, CARAT_MAX]);
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    "in-stock": false, "made-to-order": false, "out-of-stock": false,
  });
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeSubCategories, setActiveSubCategories] = useState<string[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([]);
  const [availabilityOptions, setAvailabilityOptions] = useState<string[]>([]);
  const [subByCategory, setSubByCategory] = useState<Record<string, string[]>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [activeOrders, setActiveOrders] = useState<Record<string, { order_number: string; status: string }>>({});

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [activeCategory, activeTab, priceRange, caratRange, availability, activeTypes, activeSubCategories, pageSize, collectionId]);

  // Fetch the collection's name when viewing a collection (for the header)
  useEffect(() => {
    if (!collectionId) { setCollectionName(null); return; }
    let cancelled = false;
    collectionsApi
      .detail(collectionId)
      .then((d: any) => { if (!cancelled) setCollectionName(d?.name ?? null); })
      .catch(() => { if (!cancelled) setCollectionName(null); });
    return () => { cancelled = true; };
  }, [collectionId]);

  useEffect(() => {
    productsApi.categories().then((data: Category[]) => setCategories(data)).catch(() => {});
    productsApi.filterOptions().then((d: { subCategories?: string[]; availabilities?: string[]; subCategoriesByCategory?: Record<string, string[]> }) => {
      setSubCategoryOptions(d?.subCategories ?? []);
      setAvailabilityOptions(d?.availabilities ?? []);
      setSubByCategory(d?.subCategoriesByCategory ?? {});
    }).catch(() => {});
    wishlistApi.list().then((data: any) => {
      const items = Array.isArray(data) ? data : data.items ?? [];
      setWishlistedIds(new Set(items.map((w: any) => String(w.id))));
    }).catch(() => {});
  }, []);

  // Tab badge counts — one lightweight call (pure COUNTs, no row fetching).
  const [allCount, setAllCount] = useState(0);
  useEffect(() => {
    productsApi.counts()
      .then((c: any) => { setAllCount(c.total ?? 0); setNewCount(c.newArrivals ?? 0); setViewedCount(c.recentlyViewed ?? 0); setUnseenCount(c.unseen ?? 0); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchProducts() {
      try {
        if (activeTab === "viewed") {
          const data: ApiProduct[] = await productsApi.recentlyViewed();
          let result = (data || []).map((p: ApiProduct) => mapProduct(p, isINR));
          // Recently-viewed is fetched unfiltered (capped at 20), so filter client-side.
          if (activeCategory !== "All") result = result.filter((p) => p.category === activeCategory);
          const s = debouncedSearch.trim().toLowerCase();
          if (s) result = result.filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(s));
          const activeAvail = Object.entries(availability).filter(([, v]) => v).map(([k]) => k);
          if (activeAvail.length > 0) result = result.filter((p) => activeAvail.includes(p.availability));
          if (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX) result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
          if (caratRange[0] > CARAT_MIN || caratRange[1] < CARAT_MAX) result = result.filter((p) => p.carat >= caratRange[0] && p.carat <= caratRange[1]);
          if (!cancelled) { setProducts(result); setTotalProducts(result.length); setTotalPages(1); }
        } else {
          const params: Record<string, string> = {};
          if (collectionId) params.collection = collectionId;
          if (activeCategory !== "All") params.category = activeCategory;
          if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
          if (priceRange[0] > PRICE_MIN) params.min_price = String(priceRange[0]);
          if (priceRange[1] < PRICE_MAX) params.max_price = String(priceRange[1]);
          if (caratRange[0] > CARAT_MIN) params.min_carat = String(caratRange[0]);
          if (caratRange[1] < CARAT_MAX) params.max_carat = String(caratRange[1]);
          const activeAvail = Object.entries(availability).filter(([, v]) => v).map(([k]) => k);
          if (activeAvail.length > 0) params.availability = activeAvail.join(",");
          if (activeTypes.length > 0) params.type_category = activeTypes.join(",");
          if (activeSubCategories.length > 0) params.sub_category = activeSubCategories.join(",");
          if (activeTab === "new") params.is_new = "true";
          if (activeTab === "unseen") params.unseen = "true";
          params.page = String(page);
          params.limit = String(pageSize);
          const data = await productsApi.list(params);
          if (!cancelled) {
            const mapped = ((data.products || []) as ApiProduct[]).map((p) => mapProduct(p, isINR));
            setProducts(mapped);
            setTotalProducts(data.total ?? mapped.length);
            setTotalPages(data.totalPages ?? 1);
            if (mapped.length > 0) {
              try {
                const orderMap = await ordersApi.activeByProducts(mapped.map((p) => String(p.id)));
                if (!cancelled) setActiveOrders(orderMap ?? {});
              } catch { /* ignore */ }
            } else {
              setActiveOrders({});
            }
          }
        }
      } catch { if (!cancelled) { setProducts([]); setTotalProducts(0); setTotalPages(1); } }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchProducts();
    return () => { cancelled = true; };
  }, [activeTab, activeCategory, debouncedSearch, priceRange, caratRange, availability, activeTypes, activeSubCategories, page, pageSize, collectionId, isINR]);

  const toggleWishlist = useCallback(async (productId: string) => {
    const isWishlisted = wishlistedIds.has(productId);
    // Optimistic update
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (isWishlisted) next.delete(productId); else next.add(productId);
      return next;
    });
    try {
      if (isWishlisted) await wishlistApi.remove(productId);
      else await wishlistApi.add(productId);
    } catch {
      // Revert
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (isWishlisted) next.add(productId); else next.delete(productId);
        return next;
      });
    }
  }, [wishlistedIds]);

  const displayCategories = useMemo(() => {
    const all: { name: string; image: string | null; count: number }[] = [{ name: "All", image: null, count: 0 }];
    return all.concat(categories.map((c) => ({ name: c.name, image: c.image_url, count: c.product_count || 0 })));
  }, [categories]);

  // Sub-category options cascade off the selected category: "All" shows every
  // sub-category, otherwise only the ones that exist within that category.
  const cascadedSubCategoryOptions = useMemo(() => {
    if (activeCategory === "All") return subCategoryOptions;
    const canon = CANONICAL_SUBCATEGORIES[activeCategory];
    if (!canon) return subByCategory[activeCategory] ?? [];
    const full = canon["*"] ?? [];
    // With type(s) selected, union each type's allowed sub-categories (so e.g.
    // Gold Ring drops Solitaire); with no type selected, show the full set.
    if (activeTypes.length > 0) {
      const allowed = new Set<string>();
      for (const t of activeTypes) (canon[t] ?? full).forEach((s) => allowed.add(s));
      return full.filter((s) => allowed.has(s)); // keep canonical order
    }
    return full;
  }, [activeCategory, activeTypes, subCategoryOptions, subByCategory]);
  // Drop any selected sub-categories that aren't valid for the current category.
  useEffect(() => {
    setActiveSubCategories((prev) => {
      const next = prev.filter((s) => cascadedSubCategoryOptions.includes(s));
      return next.length === prev.length ? prev : next;
    });
  }, [cascadedSubCategoryOptions]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (priceRange[0] > PRICE_MIN || priceRange[1] < PRICE_MAX) c++;
    if (caratRange[0] > CARAT_MIN || caratRange[1] < CARAT_MAX) c++;
    if (Object.values(availability).some(Boolean)) c++;
    if (activeTypes.length > 0) c++;
    if (activeSubCategories.length > 0) c++;
    return c;
  }, [priceRange, caratRange, availability, activeTypes, activeSubCategories]);

  const clearFilters = useCallback(() => {
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    setCaratRange([CARAT_MIN, CARAT_MAX]);
    setAvailability({ "in-stock": false, "made-to-order": false, "out-of-stock": false });
    setActiveTypes([]);
    setActiveSubCategories([]);
  }, []);

  // Jump to a page from the numbered pager.
  const goToPage = useCallback((n: number) => {
    const target = Math.min(Math.max(1, n), totalPages);
    setPage(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: "var(--sf-teal-glass)" }}
          >
            <Package className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
          </div>
          <div>
            {collectionId && (
              <button
                onClick={() => navigate("/retailer/collections")}
                className="flex items-center gap-1 text-xs font-medium mb-1 cursor-pointer"
                style={{ color: "var(--sf-teal)", background: "none", border: "none", padding: 0 }}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Collections
              </button>
            )}
            <div className="flex items-center gap-2">
              <h1
                className="text-xl font-semibold leading-tight"
                style={{ fontFamily: "'General Sans', 'Inter', sans-serif", color: "var(--sf-text-primary)" }}
              >
                {collectionId ? (collectionName || "Collection") : "Product Catalog"}
              </h1>
            </div>
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
              { key: "all", label: "All Products", icon: <LayoutGrid className="w-3.5 h-3.5" />, count: allCount },
              { key: "new", label: "New Arrivals", icon: <Sparkles className="w-3.5 h-3.5" />, count: newCount },
              { key: "viewed", label: "Recently Viewed", icon: <Eye className="w-3.5 h-3.5" />, count: viewedCount },
              { key: "unseen", label: "Unseen Products", icon: <EyeOff className="w-3.5 h-3.5" />, count: unseenCount },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => changeTab(tab.key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    background: isActive ? "var(--sf-teal-glass)" : "none",
                    border: isActive ? "1px solid var(--sf-teal-border)" : "1px solid transparent",
                    color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)",
                  }}
                >
                  {tab.icon} {tab.label}
                  {tab.key !== "all" && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: isActive ? "var(--sf-teal-border)" : "var(--sf-divider)", color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)" }}>
                      {tab.count}
                    </span>
                  )}
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
                  availability={availability} setAvailability={setAvailability} onClear={clearFilters} activeCount={activeFiltersCount} isINR={isINR}
                  typeOptions={TYPE_CATEGORY_OPTIONS} subCategoryOptions={cascadedSubCategoryOptions} availabilityOptions={availabilityOptions}
                  activeTypes={activeTypes} setActiveTypes={setActiveTypes}
                  activeSubCategories={activeSubCategories} setActiveSubCategories={setActiveSubCategories} />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Category pills — wrap onto multiple lines instead of a cut-off scroll row */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {displayCategories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer"
                style={{
                  background: isActive ? "var(--sf-teal-glass)" : "var(--sf-bg-surface-2)",
                  border: isActive ? "1px solid var(--sf-teal-border)" : "1px solid var(--sf-divider)",
                  color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)",
                }}
              >
                {cat.image && <img src={imageVariant(cat.image, "thumb")} alt={cat.name} loading="lazy" decoding="async" className="w-5 h-5 rounded-full object-cover" />}
                {cat.name === "All" ? "All Categories" : titleCase(cat.name)}
                {cat.name !== "All" && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: isActive ? "var(--sf-teal-border)" : "var(--sf-divider)", color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)" }}>
                    {cat.count}
                  </span>
                )}
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
                availability={availability} setAvailability={setAvailability} onClear={clearFilters} activeCount={activeFiltersCount} isINR={isINR}
                  typeOptions={TYPE_CATEGORY_OPTIONS} subCategoryOptions={cascadedSubCategoryOptions} availabilityOptions={availabilityOptions}
                  activeTypes={activeTypes} setActiveTypes={setActiveTypes}
                  activeSubCategories={activeSubCategories} setActiveSubCategories={setActiveSubCategories} />
            </CardContent>
          </Card>
        </aside>

        {/* Product grid area */}
        <div className="flex-1 min-w-0">
          {/* Results bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--sf-text-muted)" }}>
              {`Showing ${products.length} of ${totalProducts} products`}
              {loading && products.length > 0 && (
                <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "var(--sf-divider)", borderTopColor: "var(--sf-teal)" }} />
              )}
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-xs flex items-center gap-1 cursor-pointer" style={{ color: "var(--sf-teal)", background: "none", border: "none" }}>
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--sf-text-muted)" }}>Per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[68px] text-xs border-[var(--sf-divider)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Grid */}
          <AnimatePresence mode="wait">
            {loading && products.length === 0 ? (
              /* First load — full skeleton */
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                    <div className="skeleton-shimmer aspect-square" />
                    <div className="p-3 space-y-2.5">
                      <div className="skeleton-shimmer h-2.5 w-20 rounded-md" />
                      <div className="skeleton-shimmer h-3.5 w-3/4 rounded-md" />
                      <div className="skeleton-shimmer h-3.5 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : !loading && products.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-24">
                <Diamond className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
                <p className="text-base font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>No products found</p>
                <p className="text-sm mb-4" style={{ color: "var(--sf-text-muted)" }}>Try adjusting your search or filters</p>
                <Button variant="ghost" style={{ color: "var(--sf-teal)" }} onClick={() => { setSearch(""); setActiveCategory("All"); changeTab("all"); clearFilters(); }}>
                  Reset all
                </Button>
              </motion.div>
            ) : (
              /* NOTE: page is intentionally NOT in the key — paginating should
                 swap the cards in place (dimmed via the opacity below), not
                 remount/refade the whole grid. Only tab/category/view changes
                 get the fade transition. */
              <motion.div
                key={`${activeTab}-${activeCategory}-${viewMode}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4 transition-opacity duration-300"
                style={{ opacity: loading ? 0.45 : 1, pointerEvents: loading ? "none" : "auto" }}
              >
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} allIds={products.map((p) => String(p.id))} compact={viewMode === "compact"} wishlisted={wishlistedIds.has(String(product.id))} onToggleWishlist={() => toggleWishlist(String(product.id))} existingOrder={activeOrders[String(product.id)] ?? null} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Numbered pagination */}
          {activeTab !== "viewed" && totalPages > 1 && (
            <div className="mt-8 flex justify-center transition-opacity duration-300" style={{ opacity: loading ? 0.6 : 1 }}>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline" size="sm" disabled={page <= 1}
                    onClick={() => goToPage(1)} title="First page"
                    className="h-9 w-9 p-0 rounded-lg border-[var(--sf-divider)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="h-9 gap-1 rounded-lg border-[var(--sf-divider)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {pageItems(page, totalPages).map((item, i) =>
                      item === "…" ? (
                        <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: "var(--sf-text-muted)" }}>…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goToPage(item)}
                          className="w-9 h-9 rounded-lg text-sm font-medium transition-all cursor-pointer"
                          style={{
                            background: item === page ? "var(--sf-teal)" : "var(--sf-bg-surface-2)",
                            color: item === page ? "#fff" : "var(--sf-text-muted)",
                            border: item === page ? "none" : "1px solid var(--sf-divider)",
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm" disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="h-9 gap-1 rounded-lg border-[var(--sf-divider)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={page >= totalPages}
                    onClick={() => goToPage(totalPages)} title="Last page"
                    className="h-9 w-9 p-0 rounded-lg border-[var(--sf-divider)]"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
              </div>
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

function FilterPanel({ priceRange, setPriceRange, caratRange, setCaratRange, availability, setAvailability, onClear, activeCount, isINR,
  typeOptions, subCategoryOptions, availabilityOptions, activeTypes, setActiveTypes, activeSubCategories, setActiveSubCategories }: {
  priceRange: number[]; setPriceRange: (v: number[]) => void;
  caratRange: number[]; setCaratRange: (v: number[]) => void;
  availability: Record<string, boolean>; setAvailability: (v: Record<string, boolean>) => void;
  onClear: () => void; activeCount: number; isINR: boolean;
  typeOptions: string[]; subCategoryOptions: string[]; availabilityOptions: string[];
  activeTypes: string[]; setActiveTypes: (v: string[]) => void;
  activeSubCategories: string[]; setActiveSubCategories: (v: string[]) => void;
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

      {typeOptions.length > 0 && (
        <>
          <FilterSection title="Type">
            <div className="space-y-3 mt-2">
              {typeOptions.map((t) => (
                <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={activeTypes.includes(t)}
                    onCheckedChange={(checked) => setActiveTypes(checked ? [...activeTypes, t] : activeTypes.filter((x) => x !== t))}
                  />
                  <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{titleCase(t)}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
        </>
      )}

      {subCategoryOptions.length > 0 && (
        <>
          <FilterSection title="Sub-category">
            <div className="space-y-3 mt-2">
              {subCategoryOptions.map((s) => (
                <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={activeSubCategories.includes(s)}
                    onCheckedChange={(checked) => setActiveSubCategories(checked ? [...activeSubCategories, s] : activeSubCategories.filter((x) => x !== s))}
                  />
                  <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{titleCase(s)}</span>
                </label>
              ))}
            </div>
          </FilterSection>
          <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
        </>
      )}

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
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{isINR ? "₹" : "$"}{(priceRange[0] / 1000).toFixed(0)}K</span>
          <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{isINR ? "₹" : "$"}{(priceRange[1] / 1000).toFixed(0)}K</span>
        </div>
      </FilterSection>

      {/* Availability filter — only shown when the catalog actually has more than
          one availability value (no point filtering when everything is in-stock). */}
      {availabilityOptions.length > 1 && (
        <>
          <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
          <FilterSection title="Availability">
            <div className="space-y-3 mt-2">
              {[
                { key: "in-stock", label: "In Stock" },
                { key: "made-to-order", label: "Made to Order" },
                { key: "out-of-stock", label: "Out of Stock" },
              ].filter((opt) => availabilityOptions.includes(opt.key)).map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={availability[opt.key]} onCheckedChange={(checked) => setAvailability({ ...availability, [opt.key]: !!checked })} />
                  <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        </>
      )}
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

function ProductCard({ product, index, allIds, compact, wishlisted, onToggleWishlist, existingOrder }: { product: Product; index: number; allIds: string[]; compact: boolean; wishlisted: boolean; onToggleWishlist: () => void; existingOrder: { order_number: string; status: string } | null }) {
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();
  const [images, setImages] = useState<string[]>([product.image]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fetched, setFetched] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const alreadyInCart = cartItems.some((i) => i.productId === String(product.id));

  const isLocked = product.availability === "out-of-stock";

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (isLocked || alreadyInCart || addedToCart) return;
    addItem({
      productId: String(product.id),
      productName: product.name,
      productSku: product.sku,
      productImage: product.image,
      quantity: 1,
      unitPrice: product.price,
      carat: product.carat,
      metalType: null,
      goldColour: null,
      diamondShape: null,
      diamondShade: null,
      diamondQuality: null,
      colorStoneName: null,
      colorStoneQuality: null,
      note: null,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  // Solid, theme-independent colours — readable on both light and dark backgrounds.
  const availColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
    "in-stock":      { bg: "#16a34a", text: "#ffffff", border: "#15803d", label: "In Stock" },
    "made-to-order": { bg: "#ea580c", text: "#ffffff", border: "#c2410c", label: "Made to Order" },
    "out-of-stock":  { bg: "#dc2626", text: "#ffffff", border: "#b91c1c", label: "Out of Stock" },
  };
  const avail = availColors[product.availability] ?? availColors["in-stock"];

  async function loadImages() {
    if (fetched) return;
    setFetched(true);
    try {
      // Use the images-only endpoint (NOT products.detail) — detail() records a
      // "recently viewed" entry, and merely hovering a card must not do that.
      const rows = await uploadsApi.listProductImages(String(product.id));
      const imgs: string[] = ((rows as any[]) || []).map((img: any) =>
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
      onClick={() => navigate(`/retailer/product/${product.id}`, { state: { productIds: allIds, index } })}
      onMouseEnter={loadImages}
      className="card-shimmer-wrap group rounded-xl border overflow-hidden cursor-pointer"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
    >
      <div className="aspect-square" style={{ position: "relative", overflow: "hidden" }}>
        <SmartImage src={images[activeIdx] || product.image} size="card" alt={product.name} className="w-full h-full" imgClassName="transition-transform duration-300 group-hover:scale-105" />

        {/* Expand / zoom — bottom-right so it never overlaps the wishlist heart (top-right) */}
        <button
          onClick={(e) => { e.stopPropagation(); loadImages(); setViewerOpen(true); }}
          title="View & zoom"
          aria-label="View & zoom"
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
        >
          <Expand className="w-3.5 h-3.5" />
        </button>

        {viewerOpen && (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageViewer images={images.length ? images : [product.image]} startIndex={activeIdx} onClose={() => setViewerOpen(false)} />
          </div>
        )}

        {/* Left arrow — appears on hover */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right arrow — appears on hover */}
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Image counter — appears on hover */}
        {images.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#fff" }}
          >
            {activeIdx + 1} / {images.length}
          </div>
        )}

        {/* Top-left: NEW badge */}
        {product.isNew && (
          <div className="absolute top-2 left-2">
            <Badge className="text-[10px] px-1.5 py-0.5" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>NEW</Badge>
          </div>
        )}

        {/* Bottom-left: availability badge */}
        {!compact && (
          <Badge
            className="absolute bottom-2 left-2 text-[10px] font-semibold backdrop-blur-md inline-flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(0,0,0,0.55)",
              color: "#fff",
              border: "none",
              boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.bg }} />
            {avail.label}
          </Badge>
        )}

        {/* Top-right: Wishlist heart */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${wishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{
            backgroundColor: wishlisted ? "rgba(239,68,68,0.2)" : "var(--sf-backdrop)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Heart
            className="w-4 h-4 transition-colors"
            style={{ color: wishlisted ? "#ef4444" : "#fff" }}
            fill={wishlisted ? "#ef4444" : "none"}
          />
        </button>

      </div>

      <div className={compact ? "p-2" : "p-3"}>
        <p className={`font-semibold leading-snug ${compact ? "text-xs truncate" : "text-sm line-clamp-2"} mb-0.5`} style={{ color: "var(--sf-text-primary)" }}>
          {product.name}
        </p>
        {product.sku && (
          <p className="text-[10px] mb-2 truncate" style={{ color: "var(--sf-text-muted)", fontFamily: "monospace" }}>
            {product.sku}
          </p>
        )}
        <p className={`font-bold ${compact ? "text-xs" : "text-sm"} ${compact ? "" : "mb-2.5"}`} style={{ color: "var(--sf-teal)" }}>{product.priceLabel}</p>
        {!compact && (
          <button
            onClick={isLocked || !!existingOrder ? undefined : handleAddToCart}
            className="w-full h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: isLocked || existingOrder ? "var(--sf-bg-surface-2)" : (alreadyInCart || addedToCart) ? "rgba(38,96,160,0.14)" : "var(--sf-blue-primary)",
              color: isLocked || existingOrder ? "var(--sf-text-muted)" : (alreadyInCart || addedToCart) ? "var(--sf-blue-primary)" : "#fff",
              border: isLocked || existingOrder ? "1px solid var(--sf-divider)" : (alreadyInCart || addedToCart) ? "1px solid rgba(38,96,160,0.45)" : "none",
              cursor: isLocked || existingOrder || alreadyInCart || addedToCart ? "default" : "pointer",
              transition: "all 0.2s ease",
            }}
            disabled={isLocked || !!existingOrder}
            onMouseEnter={(e) => { if (!isLocked && !existingOrder && !alreadyInCart && !addedToCart) e.currentTarget.style.opacity = "0.82"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {isLocked ? (
              <><Lock className="w-3.5 h-3.5" /> Unavailable</>
            ) : existingOrder ? (
              <><Check className="w-3.5 h-3.5" /> {existingOrder.status}</>
            ) : alreadyInCart || addedToCart ? (
              <><Check className="w-3.5 h-3.5" /> In Cart</>
            ) : (
              <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
