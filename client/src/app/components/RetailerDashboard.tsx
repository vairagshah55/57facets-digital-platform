import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingUp,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Megaphone,
  Eye,
  ImageOff,
  Filter,
  Loader2,
  Package,

  Layers,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { products as productsApi, orders as ordersApi, imageUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Category = { name: string; image: string | null };
type Product = { id: string | number; name: string; price: string; category: string; image: string | null };
type Announcement = { id: number; title: string; date: string; type: "new" | "offer" | "info" };
type OrderSummary = { totalOrders: number; pendingOrders: number; completedOrders: number; totalSpent: string };
type LastOrder = { id: string; date: string; items: number; total: string; status: string };

const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: "New Summer Collection Launching Soon", date: "Mar 28, 2026", type: "new" },
  { id: 2, title: "Special discount on bulk orders — 15% off", date: "Mar 25, 2026", type: "offer" },
  { id: 3, title: "Showroom visit slots now open for April", date: "Mar 22, 2026", type: "info" },
];

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as any },
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerDashboard() {
  const navigate = useNavigate();
  const { retailer, loading: authLoading } = useAuth();

  const isFirstTime = retailer?.firstLogin ?? false;
  const retailerName = retailer?.companyName || retailer?.name || "Retailer";

  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [, setLastOrder] = useState<LastOrder | null>(null);
  const [recentOrders, setRecentOrders] = useState<{ id: string; number: string; status: string; total: string; date: string; items: number }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [totalCategoryProducts, setTotalCategoryProducts] = useState(0);
  const [categoryPage, setCategoryPage] = useState(1);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const CATEGORY_PAGE_SIZE = 8;

  /* Reset page when category changes */
  useEffect(() => {
    setCategoryPage(1);
    setCategoryProducts([]);
  }, [selectedCategory]);

  /* Fetch category products */
  useEffect(() => {
    if (categories.length === 0) return;
    let cancelled = false;
    async function fetchCategoryProducts() {
      const isFirstPage = categoryPage === 1;
      if (isFirstPage) setLoadingCategoryProducts(true);
      else setLoadingMore(true);
      try {
        const params: Record<string, string> = {
          limit: String(CATEGORY_PAGE_SIZE),
          page: String(categoryPage),
        };
        if (selectedCategory !== "All") params.category = selectedCategory;
        const data = await productsApi.list(params);
        if (cancelled) return;
        const mapped = ((data as any).products || []).map((p: any) => ({
          id: p.id || p._id,
          name: p.name,
          price: typeof p.price === "number" ? formatCurrency(p.price) : p.price,
          category: p.category || "",
          image: p.image ? imageUrl(p.image) : (p.images?.[0] ? imageUrl(p.images[0]) : null),
        }));
        setTotalCategoryProducts((data as any).total ?? mapped.length);
        if (isFirstPage) setCategoryProducts(mapped);
        else setCategoryProducts((prev) => [...prev, ...mapped]);
      } catch (err) {
        console.error("Category products fetch error:", err);
      } finally {
        if (!cancelled) { setLoadingCategoryProducts(false); setLoadingMore(false); }
      }
    }
    fetchCategoryProducts();
    return () => { cancelled = true; };
  }, [selectedCategory, categoryPage, categories]);

  /* Fetch dashboard data */
  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      setLoadingData(true);
      try {
        const [categoriesRes, arrivalsRes, viewedRes, statsRes, ordersRes] = await Promise.allSettled([
          productsApi.categories(),
          productsApi.newArrivals(),
          productsApi.recentlyViewed(),
          ordersApi.stats(),
          ordersApi.list({ limit: "5", page: "1" }),
        ]);
        if (cancelled) return;

        if (categoriesRes.status === "fulfilled")
          setCategories((categoriesRes.value as any[]).map((c: any) => ({ name: c.name, image: c.image_url ? imageUrl(c.image_url) : null })));

        if (arrivalsRes.status === "fulfilled")
          setNewArrivals((arrivalsRes.value as any[]).map((p: any) => ({
            id: p.id || p._id, name: p.name,
            price: typeof p.price === "number" ? formatCurrency(p.price) : p.price,
            category: p.category || "",
            image: p.image ? imageUrl(p.image) : (p.images?.[0] ? imageUrl(p.images[0]) : null),
          })));

        if (viewedRes.status === "fulfilled")
          setRecentlyViewed((viewedRes.value as any[]).map((p: any) => ({
            id: p.id || p._id, name: p.name,
            price: typeof p.price === "number" ? formatCurrency(p.price) : p.price,
            category: p.category || "",
            image: p.image ? imageUrl(p.image) : (p.images?.[0] ? imageUrl(p.images[0]) : null),
          })));

        if (statsRes.status === "fulfilled") {
          const stats = statsRes.value as any;
          const s = stats.summary;
          setOrderSummary({
            totalOrders: s.total_orders ?? 0,
            pendingOrders: s.pending ?? 0,
            completedOrders: s.completed ?? 0,
            totalSpent: typeof s.total_spent === "number" ? formatCurrency(s.total_spent) : s.total_spent ?? "₹0",
          });
          if (stats.lastOrder) {
            const lo = stats.lastOrder;
            setLastOrder({
              id: lo.order_number, date: formatDate(lo.created_at),
              items: lo.item_count ?? 0,
              total: typeof lo.total === "number" ? formatCurrency(lo.total) : lo.total,
              status: lo.status,
            });
          }
        }

        if (ordersRes.status === "fulfilled") {
          const orderData = ordersRes.value as any;
          const list = orderData.orders || orderData || [];
          setRecentOrders(
            (list as any[]).slice(0, 5).map((o: any) => ({
              id: o.id,
              number: o.order_number || o.id?.slice(0, 8),
              status: o.status || "pending",
              total: typeof o.total === "number" ? formatCurrency(o.total) : o.total ?? "₹0",
              date: formatDate(o.created_at),
              items: o.item_count ?? 0,
            }))
          );
        }
      } catch (err) { console.error("Dashboard fetch error:", err); }
      finally { if (!cancelled) setLoadingData(false); }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  /* ── Loading skeleton ──────────────────────────── */
  if (authLoading || loadingData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-20 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-16">

      {/* ═══ Welcome Banner ═══ */}
      <motion.div {...fadeUp}>
        <div
          className="rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--sf-bg-surface-1) 0%, var(--sf-bg-surface-2) 100%)",
            border: "1px solid var(--sf-divider)",
          }}
        >
          {/* Decorative accent */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{
              background: "radial-gradient(circle, var(--sf-teal-subtle) 0%, transparent 70%)",
              transform: "translate(30%, -30%)",
              pointerEvents: "none",
            }}
          />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-semibold mb-1"
                style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}
              >
                Welcome back, {retailerName}
              </h1>
              <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                {isFirstTime
                  ? "Explore our collection and place your first order"
                  : "Here's your business overview for today"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="text-sm gap-1.5 h-10 px-5 rounded-xl"
                style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
                onClick={() => navigate("/retailer/catalog")}
              >
                <Package className="w-4 h-4" />
                Browse Catalog
              </Button>
              {!isFirstTime && (
                <Button
                  variant="outline"
                  className="text-sm gap-1.5 h-10 px-5 rounded-xl"
                  style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                  onClick={() => navigate("/retailer/orders")}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Orders
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {!isFirstTime && (
        <>
          {/* ═══ Quick Stats ═══ */}
          {orderSummary && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="mb-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <QuickStatCard
                  icon={<ShoppingCart />}
                  label="Total Orders"
                  value={String(orderSummary.totalOrders)}
                  accent="var(--sf-teal)"
                  index={0}
                />
                <QuickStatCard
                  icon={<Clock />}
                  label="Pending"
                  value={String(orderSummary.pendingOrders)}
                  accent="#f59e0b"
                  index={1}
                />
                <QuickStatCard
                  icon={<TrendingUp />}
                  label="Completed"
                  value={String(orderSummary.completedOrders)}
                  accent="#22c55e"
                  index={2}
                />
                <QuickStatCard
                  icon={<CreditCard />}
                  label="Total Spent"
                  value={orderSummary.totalSpent}
                  accent="var(--sf-blue-secondary)"
                  index={3}
                />
              </div>
            </motion.div>
          )}

          {/* ═══ Overview + Active Orders + Announcements ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
              <TodaysOrderCard summary={orderSummary} />
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.14 }}>
              <ActiveOrdersCard orders={recentOrders} onViewAll={() => navigate("/retailer/orders")} />
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
              <AnnouncementsCard announcements={ANNOUNCEMENTS} />
            </motion.div>
          </div>
        </>
      )}

      {/* ═══ Browse by Category ═══ */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: isFirstTime ? 0.08 : 0.2 }} className="mb-8">
        <CategoryBrowseSection
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          products={categoryProducts}
          total={totalCategoryProducts}
          loading={loadingCategoryProducts}
          loadingMore={loadingMore}
          onLoadMore={() => setCategoryPage((p) => p + 1)}
          onViewAll={() => navigate(
            selectedCategory === "All" ? "/retailer/catalog" : `/retailer/catalog?category=${encodeURIComponent(selectedCategory)}`
          )}
        />
      </motion.div>

      {/* ═══ New Arrivals ═══ */}
      {newArrivals.length > 0 && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: isFirstTime ? 0.16 : 0.28 }} className="mb-8">
          <SectionBar
            icon={<Sparkles />}
            title="New Arrivals"
            subtitle={`${newArrivals.length} new pieces`}
            actionLabel="View All"
            onAction={() => navigate("/retailer/catalog?tab=new")}
          />
          <ProductGrid products={newArrivals} />
        </motion.div>
      )}

      {/* ═══ Recently Viewed ═══ */}
      {!isFirstTime && recentlyViewed.length > 0 && (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.36 }} className="mb-8">
          <SectionBar
            icon={<Eye />}
            title="Recently Viewed"
            subtitle={`${recentlyViewed.length} items`}
            actionLabel="View All"
            onAction={() => navigate("/retailer/catalog?tab=viewed")}
          />
          <ProductGrid products={recentlyViewed} />
        </motion.div>
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Quick Stat Card ──────────────────────────────────── */
function QuickStatCard({ icon, label, value, accent, index }: {
  icon: React.ReactNode; label: string; value: string; accent: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.04, duration: 0.35 }}
    >
      <Card className="border-[var(--sf-divider)] overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
        <CardContent className="p-4 flex items-center gap-3.5">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 [&>svg]:w-5 [&>svg]:h-5"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--sf-text-muted)" }}>{label}</p>
            <p className="text-lg sm:text-xl font-bold leading-none truncate" style={{ color: "var(--sf-text-primary)" }}>{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Section Bar ──────────────────────────────────────── */
function SectionBar({ icon, title, subtitle, actionLabel, onAction }: {
  icon: React.ReactNode; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg [&>svg]:w-4 [&>svg]:h-4"
          style={{ backgroundColor: "var(--sf-teal-glass)", color: "var(--sf-teal)" }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight" style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (
        <Button variant="ghost" className="text-xs gap-1 px-2 h-8" style={{ color: "var(--sf-teal)" }} onClick={onAction}>
          {actionLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}


/* ── Announcements Card ───────────────────────────────── */
function AnnouncementsCard({ announcements }: { announcements: Announcement[] }) {
  const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: "var(--sf-teal-glass)", text: "var(--sf-teal)", label: "New" },
    offer: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "Offer" },
    info: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", label: "Info" },
  };

  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "var(--sf-teal-glass)" }}>
            <Megaphone className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Announcements</h3>
        </div>
        <ScrollArea className="max-h-[180px]">
          <div className="space-y-0">
            {announcements.map((a, i) => {
              const cfg = typeConfig[a.type] || typeConfig.info;
              return (
                <div key={a.id}>
                  <div className="flex items-start gap-3 py-2.5">
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Megaphone className="w-3.5 h-3.5" style={{ color: cfg.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug" style={{ color: "var(--sf-text-primary)" }}>{a.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{a.date}</p>
                    </div>
                    <Badge className="text-[10px] capitalize shrink-0 mt-0.5" style={{ backgroundColor: cfg.bg, color: cfg.text, border: "none" }}>
                      {cfg.label}
                    </Badge>
                  </div>
                  {i < announcements.length - 1 && <Separator style={{ backgroundColor: "var(--sf-divider)" }} />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ── Today's Order Card ───────────────────────────────── */
const ORDER_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock className="w-3 h-3" /> },
  processing: { label: "Processing", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <Package className="w-3 h-3" /> },
  shipped:    { label: "Shipped",    color: "#06b6d4", bg: "rgba(6,182,212,0.12)",  icon: <Truck className="w-3 h-3" /> },
  delivered:  { label: "Delivered",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: "Cancelled",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: <XCircle className="w-3 h-3" /> },
};

function ActiveOrdersCard({ orders, onViewAll }: {
  orders: { id: string; number: string; status: string; total: string; date: string; items: number }[];
  onViewAll: () => void;
}) {
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
              <Package className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Active Orders</h3>
              <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{activeOrders.length} in progress</p>
            </div>
          </div>
          <button onClick={onViewAll} className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}>
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: "rgba(34,197,94,0.3)" }} />
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>No active orders</p>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            {activeOrders.slice(0, 4).map((o) => {
              const cfg = ORDER_STATUS_CFG[o.status] || ORDER_STATUS_CFG.pending;
              return (
                <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>{o.number}</p>
                    <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                      {o.items} item{o.items !== 1 ? "s" : ""} · {o.date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className="text-[9px] h-4 gap-0.5" style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none" }}>
                      {cfg.icon}{cfg.label}
                    </Badge>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--sf-text-primary)" }}>{o.total}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodaysOrderCard({ summary }: {
  summary: OrderSummary | null;
}) {
  const stats = [
    { label: "Orders", value: String(summary?.totalOrders ?? 0), icon: <ShoppingCart />, accent: "var(--sf-teal)" },
    { label: "Pending", value: String(summary?.pendingOrders ?? 0), icon: <Clock />, accent: "#f59e0b" },
    { label: "Completed", value: String(summary?.completedOrders ?? 0), icon: <TrendingUp />, accent: "#22c55e" },
    { label: "Total Spent", value: summary?.totalSpent ?? "₹0", icon: <CreditCard />, accent: "var(--sf-blue-secondary)" },
  ];

  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "var(--sf-teal-glass)" }}>
            <Layers className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Today's Overview</h3>
            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>Order summary</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3"
              style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="[&>svg]:w-3.5 [&>svg]:h-3.5" style={{ color: s.accent }}>{s.icon}</span>
                <span className="text-[11px] font-medium" style={{ color: "var(--sf-text-muted)" }}>{s.label}</span>
              </div>
              <p className="text-lg font-bold leading-none" style={{ color: "var(--sf-text-primary)" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Category Browse Section ──────────────────────────── */
function CategoryBrowseSection({
  categories, selectedCategory, onCategoryChange, products, total, loading, loadingMore, onLoadMore, onViewAll,
}: {
  categories: Category[]; selectedCategory: string; onCategoryChange: (val: string) => void;
  products: Product[]; total: number; loading: boolean; loadingMore: boolean; onLoadMore: () => void; onViewAll: () => void;
}) {
  const hasMore = products.length < total;

  return (
    <Card className="border-[var(--sf-divider)] overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: "var(--sf-teal-glass)" }}>
            <Filter className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight" style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}>
              Browse by Category
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
              {selectedCategory === "All" ? "All products" : selectedCategory}
              {!loading && ` · Showing ${products.length} of ${total}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 w-[170px] text-sm rounded-lg" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
              <Package className="w-3.5 h-3.5 mr-1.5 shrink-0" style={{ color: "var(--sf-teal)" }} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.map((cat) => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" className="text-xs gap-1 px-3 h-9 shrink-0" style={{ color: "var(--sf-teal)" }} onClick={onViewAll}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--sf-divider)", scrollbarWidth: "none" }}>
        {["All", ...categories.map((c) => c.name)].map((cat) => {
          const isActive = cat === selectedCategory;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
              style={{
                background: isActive ? "var(--sf-teal-glass)" : "var(--sf-bg-surface-2)",
                border: isActive ? "1px solid var(--sf-teal-border)" : "1px solid var(--sf-divider)",
                color: isActive ? "var(--sf-teal)" : "var(--sf-text-muted)",
              }}
            >
              {cat === "All" ? "All" : cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <CardContent className="p-5">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: "var(--sf-teal)" }} />
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Package className="w-10 h-10 mb-3" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <GalleryProductCard key={`${p.id}-${i}`} product={p} index={i} />
            ))}
          </div>
        )}

        {/* Load More / View All */}
        {!loading && products.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--sf-divider)" }}>
            {hasMore && (
              <Button
                variant="outline"
                className="text-sm gap-1.5 h-9 px-5 rounded-lg"
                style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                disabled={loadingMore}
                onClick={onLoadMore}
              >
                {loadingMore ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
                ) : (
                  <>Load More</>
                )}
              </Button>
            )}
            <Button
              className="text-sm gap-1.5 h-9 px-5 rounded-lg"
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
              onClick={onViewAll}
            >
              View All in Catalog <ChevronRight className="w-4 h-4" />
            </Button>
            {!hasMore && products.length > 0 && (
              <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                All {total} items loaded
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Gallery Product Card (with image navigation) ─────── */
function GalleryProductCard({ product, index }: { product: Product; index: number }) {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>(product.image ? [product.image] : []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fetched, setFetched] = useState(false);

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.025 * index, duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="card-shimmer-wrap group rounded-xl border overflow-hidden cursor-pointer"
      style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
      onClick={() => navigate(`/retailer/product/${product.id}`)}
      onMouseEnter={loadImages}
    >
      {/* Image area */}
      <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
        {images.length > 0 ? (
          <img
            src={images[activeIdx] || images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10" style={{ color: "var(--sf-text-muted)" }} />
          </div>
        )}

        {/* Left arrow — appears on hover */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "var(--sf-overlay-bg)", color: "var(--sf-text-primary)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right arrow — appears on hover */}
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "var(--sf-overlay-bg)", color: "var(--sf-text-primary)" }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Image counter — appears on hover */}
        {images.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "var(--sf-overlay-bg)", color: "var(--sf-text-secondary)" }}
          >
            {activeIdx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[11px] mb-0.5 truncate" style={{ color: "var(--sf-text-muted)" }}>{product.category}</p>
        <p className="text-sm font-medium truncate mb-1" style={{ color: "var(--sf-text-primary)" }}>{product.name}</p>
        <p className="text-sm font-bold" style={{ color: "var(--sf-teal)" }}>{product.price}</p>
      </div>
    </motion.div>
  );
}

/* ── Product Grid ─────────────────────────────────────── */
function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-sm py-4" style={{ color: "var(--sf-text-muted)" }}>No products to show.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, i) => (
        <GalleryProductCard key={`${product.id}-${i}`} product={product} index={i} />
      ))}
    </div>
  );
}
