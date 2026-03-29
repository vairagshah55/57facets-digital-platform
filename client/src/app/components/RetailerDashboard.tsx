import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Package,
  Clock,
  TrendingUp,
  ShoppingCart,
  ChevronRight,
  Grid3X3,
  Sparkles,
  BarChart3,
  Megaphone,
  Eye,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

import ringsImg from "../../assets/Images/rings.jpg";
import necklaceImg from "../../assets/Images/necklace.jpg";
import earingsImg from "../../assets/Images/earings.jpg";
import bengalsImg from "../../assets/Images/bengals.jpg";
import pendantsImg from "../../assets/Images/pendants.jpg";
import bracelatesImg from "../../assets/Images/bracelates.jpg";
import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img4 from "../../assets/Images/4.jpg";
import img5 from "../../assets/Images/5.jpg";
import img7 from "../../assets/Images/7.jpg";
import img8 from "../../assets/Images/8.jpg";
import img11 from "../../assets/Images/11.jpg";
import img12 from "../../assets/Images/12.jpg";

/* ═══════════════════════════════════════════════════════
   MOCK DATA — replace with API responses
   ═══════════════════════════════════════════════════════ */

const CATEGORIES = [
  { name: "Rings", image: ringsImg },
  { name: "Necklaces", image: necklaceImg },
  { name: "Earrings", image: earingsImg },
  { name: "Bangles", image: bengalsImg },
  { name: "Pendants", image: pendantsImg },
  { name: "Bracelets", image: bracelatesImg },
];

const NEW_ARRIVALS = [
  { id: 1, name: "Solitaire Diamond Ring", price: "₹1,25,000", category: "Rings", image: img1 },
  { id: 2, name: "Emerald Drop Earrings", price: "₹85,000", category: "Earrings", image: img3 },
  { id: 3, name: "Pearl Chain Necklace", price: "₹1,50,000", category: "Necklaces", image: img4 },
  { id: 4, name: "Sapphire Tennis Bracelet", price: "₹2,10,000", category: "Bracelets", image: img5 },
  { id: 5, name: "Diamond Stud Set", price: "₹95,000", category: "Earrings", image: img7 },
  { id: 6, name: "Gold Bangle Pair", price: "₹75,000", category: "Bangles", image: img8 },
];

const RECENTLY_VIEWED = [
  { id: 7, name: "Ruby Pendant", price: "₹65,000", category: "Pendants", image: img11 },
  { id: 8, name: "Platinum Band Ring", price: "₹1,80,000", category: "Rings", image: img12 },
  { id: 1, name: "Solitaire Diamond Ring", price: "₹1,25,000", category: "Rings", image: img1 },
  { id: 3, name: "Pearl Chain Necklace", price: "₹1,50,000", category: "Necklaces", image: img4 },
];

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "New Summer Collection Launching Soon",
    date: "Mar 28, 2026",
    type: "new" as const,
  },
  {
    id: 2,
    title: "Special discount on bulk orders — 15% off",
    date: "Mar 25, 2026",
    type: "offer" as const,
  },
  {
    id: 3,
    title: "Showroom visit slots now open for April",
    date: "Mar 22, 2026",
    type: "info" as const,
  },
];

const ORDER_SUMMARY = {
  totalOrders: 24,
  pendingOrders: 3,
  completedOrders: 21,
  totalSpent: "₹18,50,000",
};

const LAST_ORDER = {
  id: "ORD-2026-0312",
  date: "Mar 26, 2026",
  items: 4,
  total: "₹3,25,000",
  status: "Shipped",
};

const ANALYTICS = [
  { label: "This Month Orders", value: "8", change: "+25%", up: true },
  { label: "Avg. Order Value", value: "₹2.1L", change: "+12%", up: true },
  { label: "Total Products Viewed", value: "142", change: "+38%", up: true },
  { label: "Repeat Orders", value: "65%", change: "+5%", up: true },
];

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerDashboard() {
  const navigate = useNavigate();
  const [isFirstTime] = useState(false); // TODO: derive from API

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  };

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
          Welcome back, Retailer
        </h1>
        <p style={{ color: "var(--sf-text-secondary)" }} className="text-sm">
          Here's what's happening with your account today
        </p>
      </motion.div>

      {isFirstTime ? (
        /* ── First-time login: only product display ───── */
        <>
          <SectionHeader icon={<Grid3X3 />} title="Product Categories" />
          <CategoryGrid />
          <SectionHeader icon={<Sparkles />} title="New Arrivals" className="mt-10" />
          <ProductGrid products={NEW_ARRIVALS} />
        </>
      ) : (
        /* ── Returning user: full dashboard ──────────── */
        <>
          {/* Analytics Row */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <SectionHeader icon={<BarChart3 />} title="Analytics Overview" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
              {ANALYTICS.map((stat, i) => (
                <AnalyticCard key={i} {...stat} index={i} />
              ))}
            </div>
          </motion.div>

          {/* Order Summary + Last Order */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
              <OrderSummaryCard summary={ORDER_SUMMARY} />
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
              <LastOrderCard order={LAST_ORDER} />
            </motion.div>
          </div>

          {/* Announcements */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }}>
            <SectionHeader icon={<Megaphone />} title="Announcements" />
            <AnnouncementsList announcements={ANNOUNCEMENTS} />
          </motion.div>

          {/* Categories */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="mt-10">
            <SectionHeader icon={<Grid3X3 />} title="Product Categories" actionLabel="View All" onAction={() => navigate("/retailer/catalog")} />
            <CategoryGrid />
          </motion.div>

          {/* New Arrivals */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }} className="mt-10">
            <SectionHeader icon={<Sparkles />} title="New Arrivals" actionLabel="View All" onAction={() => navigate("/retailer/catalog?tab=new")} />
            <ProductGrid products={NEW_ARRIVALS} />
          </motion.div>

          {/* Recently Viewed */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} className="mt-10 mb-10">
            <SectionHeader icon={<Eye />} title="Recently Viewed" actionLabel="View All" onAction={() => navigate("/retailer/catalog?tab=viewed")} />
            <ProductGrid products={RECENTLY_VIEWED} />
          </motion.div>
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
      </Card>
    </motion.div>
  );
}

/* ── Order Summary Card ────────────────────────────── */
function OrderSummaryCard({
  summary,
}: {
  summary: typeof ORDER_SUMMARY;
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
function LastOrderCard({ order }: { order: typeof LAST_ORDER }) {
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
  announcements: typeof ANNOUNCEMENTS;
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
function CategoryGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
      {CATEGORIES.map((cat, i) => (
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
          <div className="w-full aspect-square rounded-lg overflow-hidden">
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
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
  products: typeof NEW_ARRIVALS;
}) {
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
          <div className="aspect-square overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
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
