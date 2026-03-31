import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingUp,
  ShoppingCart,
  ChevronRight,
  Grid3X3,
  Sparkles,
  BarChart3,
  Megaphone,
  Eye,
  ImageOff,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
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
type AnalyticStat = { label: string; value: string; change: string; up: boolean };

/* Static announcements — no API endpoint for these yet */
const ANNOUNCEMENTS: Announcement[] = [
  { id: 1, title: "New Summer Collection Launching Soon", date: "Mar 28, 2026", type: "new" },
  { id: 2, title: "Special discount on bulk orders — 15% off", date: "Mar 25, 2026", type: "offer" },
  { id: 3, title: "Showroom visit slots now open for April", date: "Mar 22, 2026", type: "info" },
];

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════ */

/* Helper: format currency for display */
function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/* Helper: format date string */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export function RetailerDashboard() {
  const navigate = useNavigate();
  const { retailer, loading: authLoading } = useAuth();

  const isFirstTime = retailer?.firstLogin ?? false;
  const retailerName = retailer?.name || retailer?.companyName || "Retailer";

  /* ── API state ─────────────────────────────────── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoadingData(true);
      try {
        // Fire all requests in parallel
        const [categoriesRes, arrivalsRes, viewedRes, statsRes] = await Promise.allSettled([
          productsApi.categories(),
          productsApi.newArrivals(),
          productsApi.recentlyViewed(),
          ordersApi.stats(),
        ]);

        if (cancelled) return;

        // Categories
        if (categoriesRes.status === "fulfilled") {
          setCategories(
            (categoriesRes.value as any[]).map((c: any) => ({
              name: c.name,
              image: c.image_url ? imageUrl(c.image_url) : null,
            }))
          );
        }

        // New arrivals
        if (arrivalsRes.status === "fulfilled") {
          setNewArrivals(
            (arrivalsRes.value as any[]).map((p: any) => ({
              id: p.id || p._id,
              name: p.name,
              price: typeof p.price === "number" ? formatCurrency(p.price) : p.price,
              category: p.category || "",
              image: p.image ? imageUrl(p.image) : (p.images?.[0] ? imageUrl(p.images[0]) : null),
            }))
          );
        }

        // Recently viewed
        if (viewedRes.status === "fulfilled") {
          setRecentlyViewed(
            (viewedRes.value as any[]).map((p: any) => ({
              id: p.id || p._id,
              name: p.name,
              price: typeof p.price === "number" ? formatCurrency(p.price) : p.price,
              category: p.category || "",
              image: p.image ? imageUrl(p.image) : (p.images?.[0] ? imageUrl(p.images[0]) : null),
            }))
          );
        }

        // Order stats
        if (statsRes.status === "fulfilled") {
          const stats = statsRes.value as any;
          const summary = stats.summary;
          setOrderSummary({
            totalOrders: summary.total_orders ?? 0,
            pendingOrders: summary.pending ?? 0,
            completedOrders: summary.completed ?? 0,
            totalSpent: typeof summary.total_spent === "number"
              ? formatCurrency(summary.total_spent)
              : summary.total_spent ?? "₹0",
          });

          if (stats.lastOrder) {
            const lo = stats.lastOrder;
            setLastOrder({
              id: lo.order_number,
              date: formatDate(lo.created_at),
              items: lo.item_count ?? 0,
              total: typeof lo.total === "number" ? formatCurrency(lo.total) : lo.total,
              status: lo.status,
            });
          }

          // Derive analytics from summary (API does not provide analytics endpoint)
          // For now, show key stats derived from the order data
          setAnalytics([
            { label: "Total Orders", value: String(summary.total_orders ?? 0), change: "", up: true },
            { label: "Pending Orders", value: String(summary.pending ?? 0), change: "", up: false },
            { label: "Completed", value: String(summary.completed ?? 0), change: "", up: true },
            {
              label: "Total Spent",
              value: typeof summary.total_spent === "number"
                ? formatCurrency(summary.total_spent)
                : summary.total_spent ?? "₹0",
              change: "",
              up: true,
            },
          ]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  };

  /* ── Full-page loading spinner ────────────────── */
  if (authLoading || loadingData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <motion.div {...fadeUp} className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-semibold mb-1"
          style={{
            fontFamily: "'Melodrama', 'Georgia', serif",
            color: "var(--sf-text-primary)",
          }}
        >
          Welcome back, {retailerName}
        </h1>
        <p style={{ color: "var(--sf-text-secondary)" }} className="text-sm">
          Here's what's happening with your account today
        </p>
      </motion.div>

      {isFirstTime ? (
        /* ── First-time login: only product display ───── */
        <>
          <SectionHeader icon={<Grid3X3 />} title="Product Categories" />
          <CategoryGrid categories={categories} />
          <SectionHeader icon={<Sparkles />} title="New Arrivals" className="mt-10" />
          <ProductGrid products={newArrivals} />
        </>
      ) : (
        /* ── Returning user: full dashboard ──────────── */
        <>
          {/* Analytics Row */}
          {analytics.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
              <SectionHeader icon={<BarChart3 />} title="Analytics Overview" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
                {analytics.map((stat, i) => (
                  <AnalyticCard key={i} {...stat} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Order Summary + Last Order */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
            {orderSummary && (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                <OrderSummaryCard summary={orderSummary} />
              </motion.div>
            )}
            {lastOrder && (
              <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
                <LastOrderCard order={lastOrder} />
              </motion.div>
            )}
          </div>

          {/* Announcements */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }}>
            <SectionHeader icon={<Megaphone />} title="Announcements" />
            <AnnouncementsList announcements={ANNOUNCEMENTS} />
          </motion.div>

          {/* Categories */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="mt-10">
            <SectionHeader icon={<Grid3X3 />} title="Product Categories" actionLabel="View All" onAction={() => navigate("/retailer/catalog")} />
            <CategoryGrid categories={categories} />
          </motion.div>

          {/* New Arrivals */}
          {newArrivals.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }} className="mt-10">
              <SectionHeader icon={<Sparkles />} title="New Arrivals" actionLabel="View All" onAction={() => navigate("/retailer/catalog?tab=new")} />
              <ProductGrid products={newArrivals} />
            </motion.div>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} className="mt-10 mb-10">
              <SectionHeader icon={<Eye />} title="Recently Viewed" actionLabel="View All" onAction={() => navigate("/retailer/catalog?tab=viewed")} />
              <ProductGrid products={recentlyViewed} />
            </motion.div>
          )}
        </>
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Section Header ────────────────────────────────── */
function SectionHeader({
  icon,
  title,
  actionLabel,
  onAction,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className || ""}`}>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--sf-teal)" }} className="[&>svg]:w-5 [&>svg]:h-5">
          {icon}
        </span>
        <h2
          className="text-lg font-semibold"
          style={{
            fontFamily: "'Melodrama', 'Georgia', serif",
            color: "var(--sf-text-primary)",
          }}
        >
          {title}
        </h2>
      </div>
      {actionLabel && (
        <Button
          variant="ghost"
          className="text-sm gap-1 px-2"
          style={{ color: "var(--sf-teal)" }}
          onClick={onAction}
        >
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

/* ── Analytic Card ─────────────────────────────────── */
function AnalyticCard({
  label,
  value,
  change,
  up,
  index,
}: {
  label: string;
  value: string;
  change: string;
  up: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
    >
      <Card
        className="border-[var(--sf-divider)] p-4"
        style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
      >
        <p className="text-xs mb-1" style={{ color: "var(--sf-text-muted)" }}>
          {label}
        </p>
        <p
          className="text-xl sm:text-2xl font-semibold mb-1"
          style={{ color: "var(--sf-text-primary)" }}
        >
          {value}
        </p>
        {change ? (
          <div className="flex items-center gap-1">
            <TrendingUp
              className="w-3 h-3"
              style={{ color: up ? "#22c55e" : "var(--destructive)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: up ? "#22c55e" : "var(--destructive)" }}
            >
              {change}
            </span>
            <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              vs last month
            </span>
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}

/* ── Order Summary Card ────────────────────────────── */
function OrderSummaryCard({
  summary,
}: {
  summary: OrderSummary;
}) {
  return (
    <Card
      className="border-[var(--sf-divider)] h-full"
      style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
    >
      <CardHeader className="pb-2">
        <CardTitle
          className="text-base flex items-center gap-2"
          style={{ color: "var(--sf-text-primary)" }}
        >
          <ShoppingCart className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatBlock label="Total Orders" value={String(summary.totalOrders)} />
          <StatBlock label="Pending" value={String(summary.pendingOrders)} highlight />
          <StatBlock label="Completed" value={String(summary.completedOrders)} />
          <StatBlock label="Total Spent" value={summary.totalSpent} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--sf-text-muted)" }}>
        {label}
      </p>
      <p
        className="text-lg font-semibold"
        style={{ color: highlight ? "var(--sf-teal)" : "var(--sf-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Last Order Card ───────────────────────────────── */
function LastOrderCard({ order }: { order: LastOrder }) {
  return (
    <Card
      className="border-[var(--sf-divider)] h-full"
      style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
    >
      <CardHeader className="pb-2">
        <CardTitle
          className="text-base flex items-center gap-2"
          style={{ color: "var(--sf-text-primary)" }}
        >
          <Clock className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          Last Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--sf-text-primary)" }}
            >
              {order.id}
            </span>
            <Badge
              className="text-xs"
              style={{
                backgroundColor: "rgba(48, 184, 191, 0.15)",
                color: "var(--sf-teal)",
                border: "1px solid rgba(48, 184, 191, 0.3)",
              }}
            >
              {order.status}
            </Badge>
          </div>
          <Separator
            className="mb-3"
            style={{ backgroundColor: "var(--sf-divider)" }}
          />
          <div className="space-y-2">
            <OrderDetail label="Date" value={order.date} />
            <OrderDetail label="Items" value={String(order.items)} />
            <OrderDetail label="Total" value={order.total} />
          </div>
          <Button
            variant="ghost"
            className="w-full mt-4 text-sm gap-1"
            style={{ color: "var(--sf-teal)" }}
          >
            View Order Details
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

/* ── Announcements List ────────────────────────────── */
function AnnouncementsList({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    new: { bg: "rgba(48, 184, 191, 0.15)", text: "var(--sf-teal)" },
    offer: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
    info: { bg: "rgba(38, 96, 160, 0.15)", text: "var(--sf-blue-secondary)" },
  };

  return (
    <Card
      className="border-[var(--sf-divider)] mb-6"
      style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
    >
      <ScrollArea className="max-h-[220px]">
        <CardContent className="pt-4 pb-2">
          {announcements.map((a, i) => (
            <div key={a.id}>
              <div className="flex items-start gap-3 py-3">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: typeColors[a.type].bg }}
                >
                  <Megaphone
                    className="w-4 h-4"
                    style={{ color: typeColors[a.type].text }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--sf-text-primary)" }}
                  >
                    {a.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                    {a.date}
                  </p>
                </div>
                <Badge
                  className="text-[10px] capitalize shrink-0"
                  style={{
                    backgroundColor: typeColors[a.type].bg,
                    color: typeColors[a.type].text,
                    border: "none",
                  }}
                >
                  {a.type}
                </Badge>
              </div>
              {i < announcements.length - 1 && (
                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
              )}
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

/* ── Category Grid ─────────────────────────────────── */
function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--sf-text-muted)" }}>
        No categories available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
      {categories.map((cat, i) => (
        <motion.button
          key={cat.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 * i, duration: 0.35 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="group flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors"
          style={{
            backgroundColor: "var(--sf-bg-surface-1)",
            borderColor: "var(--sf-divider)",
          }}
        >
          <div className="w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
            {cat.image ? (
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <ImageOff className="w-8 h-8" style={{ color: "var(--sf-text-muted)" }} />
            )}
          </div>
          <span
            className="text-xs sm:text-sm font-medium"
            style={{ color: "var(--sf-text-secondary)" }}
          >
            {cat.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/* ── Product Grid ──────────────────────────────────── */
function ProductGrid({
  products,
}: {
  products: Product[];
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--sf-text-muted)" }}>
        No products to show.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
      {products.map((product, i) => (
        <motion.div
          key={`${product.id}-${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.35 }}
          whileHover={{ y: -4 }}
          className="card-shimmer-wrap group rounded-xl border overflow-hidden cursor-pointer"
          style={{
            backgroundColor: "var(--sf-bg-surface-1)",
            borderColor: "var(--sf-divider)",
          }}
        >
          <div className="aspect-square overflow-hidden flex items-center justify-center" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <ImageOff className="w-10 h-10" style={{ color: "var(--sf-text-muted)" }} />
            )}
          </div>
          <div className="p-3">
            <p
              className="text-xs mb-0.5 truncate"
              style={{ color: "var(--sf-text-muted)" }}
            >
              {product.category}
            </p>
            <p
              className="text-sm font-medium truncate mb-1"
              style={{ color: "var(--sf-text-primary)" }}
            >
              {product.name}
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--sf-teal)" }}
            >
              {product.price}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
