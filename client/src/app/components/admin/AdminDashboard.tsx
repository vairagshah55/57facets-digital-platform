import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ShoppingCart,
  Users,
  Package,
  KeyRound,
  Clock,
  AlertTriangle,
  Heart,
  TrendingUp,
  Activity,
  Eye,
  Crown,
  Loader2,
  ArrowUpRight,
  Box,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { adminDashboard } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Stats = {
  ordersToday: number;
  newRetailersToday: number;
  pendingOtps: number;
  totalRetailers: number;
  totalProducts: number;
  totalOrders: number;
};

type QuickAccess = {
  pendingOrders: any[];
  activeOrders: any[];
  otpQueue: any[];
  lowStock: any[];
  shortlistActivity: any[];
};

type ActivityItem = {
  id: string;
  actor_type: string;
  action: string;
  entity_type: string;
  details: any;
  created_at: string;
  actor_name: string;
};

type OrderChartItem = { date: string; count: number };
type TopProduct = { id: string; name: string; sku: string; view_count: number };
type TopRetailer = {
  id: string;
  name: string;
  company_name: string;
  order_count: number;
  total_spent: number;
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatPrice(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionMeta(action: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    admin_login:    { label: "Admin logged in",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    order_placed:   { label: "New order placed",      color: "#30b8bf", bg: "rgba(48,184,191,0.12)" },
    retailer_login: { label: "Retailer logged in",    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
    product_viewed: { label: "Product viewed",        color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    wishlist_add:   { label: "Added to wishlist",     color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  };
  return map[action] ?? { label: action.replace(/_/g, " "), color: "#8A929F", bg: "rgba(138,146,159,0.12)" };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const statusColor: Record<string, string> = {
  confirmed:  "#3b82f6",
  processing: "#8b5cf6",
  shipped:    "#06b6d4",
  pending:    "#f59e0b",
};

const RANK_COLOR = ["#f59e0b", "#94a3b8", "#b45309"];
const RANK_BG   = ["rgba(245,158,11,0.15)", "rgba(148,163,184,0.12)", "rgba(180,83,9,0.15)"];

/* ═══════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════ */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
});

/* ═══════════════════════════════════════════════════════
   CUSTOM CHART TOOLTIP
   ═══════════════════════════════════════════════════════ */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-medium shadow-xl border"
      style={{
        backgroundColor: "var(--sf-bg-surface-3)",
        borderColor: "var(--sf-divider)",
        color: "var(--sf-text-primary)",
      }}
    >
      <p style={{ color: "var(--sf-text-muted)", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "var(--sf-teal)" }}>{payload[0].value} orders</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════════════ */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
        style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-teal)" }}
      >
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: "var(--sf-text-primary)" }}>{title}</p>
        {subtitle && <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quickAccess, setQuickAccess] = useState<QuickAccess | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [ordersChart, setOrdersChart] = useState<OrderChartItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topRetailers, setTopRetailers] = useState<TopRetailer[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      adminDashboard.stats(),
      adminDashboard.quickAccess(),
      adminDashboard.activity(),
      adminDashboard.ordersChart(),
      adminDashboard.topProducts(),
      adminDashboard.topRetailers(),
    ]).then(([s, qa, act, oc, tp, tr]) => {
      if (cancelled) return;
      if (s.status  === "fulfilled") setStats(s.value);
      if (qa.status === "fulfilled") setQuickAccess(qa.value);
      if (act.status === "fulfilled") setActivity(act.value);
      if (oc.status  === "fulfilled") setOrdersChart(oc.value);
      if (tp.status  === "fulfilled") setTopProducts(tp.value);
      if (tr.status  === "fulfilled") setTopRetailers(tr.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton-shimmer h-6 w-32 rounded-md" />
            <div className="skeleton-shimmer h-3 w-48 rounded-md" />
          </div>
          <div className="skeleton-shimmer h-8 w-24 rounded-full hidden sm:block" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <div className="skeleton-shimmer w-9 h-9 rounded-lg" />
              <div className="skeleton-shimmer h-3 w-16 rounded-md" />
              <div className="skeleton-shimmer h-6 w-12 rounded-md" />
            </div>
          ))}
        </div>
        {/* Quick panels skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <div className="flex items-center gap-2">
                <div className="skeleton-shimmer w-8 h-8 rounded-lg" />
                <div className="skeleton-shimmer h-4 w-24 rounded-md" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-3 flex-1 rounded-md" />
                  <div className="skeleton-shimmer h-3 w-12 rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
            <div className="skeleton-shimmer h-4 w-32 rounded-md mb-4" />
            <div className="skeleton-shimmer h-48 w-full rounded-lg" />
          </div>
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
            <div className="skeleton-shimmer h-4 w-32 rounded-md mb-4" />
            <div className="skeleton-shimmer h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  /* Chart data — format date labels */
  const chartData = ordersChart.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    orders: Number(d.count),
  }));

  /* Max spend for retailer progress bars */
  const maxSpend = Math.max(...topRetailers.map((r) => r.total_spent), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-7 space-y-8">

      {/* ── Page header ─────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="flex items-end justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "'Melodrama','Georgia',serif", color: "var(--sf-text-primary)" }}
          >
            Overview
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(48,184,191,0.1)", color: "var(--sf-teal)", border: "1px solid rgba(48,184,191,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--sf-teal)] animate-pulse" />
          Live data
        </div>
      </motion.div>

      {/* ── Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: <ShoppingCart />, label: "Orders Today",    value: stats?.ordersToday ?? 0,        color: "var(--sf-teal)",          glow: "#30b8bf" },
          { icon: <Users />,        label: "New Retailers",   value: stats?.newRetailersToday ?? 0,  color: "#22c55e",                  glow: "#22c55e" },
          { icon: <KeyRound />,     label: "Pending OTPs",   value: stats?.pendingOtps ?? 0,        color: "#f59e0b",                  glow: "#f59e0b" },
          { icon: <Users />,        label: "Total Retailers", value: stats?.totalRetailers ?? 0,     color: "var(--sf-blue-secondary)", glow: "#3880be" },
          { icon: <Package />,      label: "Total Products",  value: stats?.totalProducts ?? 0,      color: "#a855f7",                  glow: "#a855f7" },
          { icon: <ShoppingCart />, label: "Total Orders",    value: stats?.totalOrders ?? 0,        color: "var(--sf-teal)",           glow: "#30b8bf" },
        ].map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>

      {/* ── Quick access row ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

        {/* Pending orders */}
        <motion.div {...fadeUp(0.1)} className="lg:col-span-1">
          <QuickPanel
            icon={<Clock />}
            title="Pending Orders"
            count={quickAccess?.pendingOrders.length ?? 0}
            color="#f59e0b"
            onViewAll={() => navigate("/admin/orders")}
          >
            {(quickAccess?.pendingOrders ?? []).slice(0, 4).map((o) => (
              <OrderRow key={o.id} orderNumber={o.order_number} sub={o.retailer_name} right={
                <span className="text-xs font-semibold" style={{ color: "var(--sf-teal)" }}>{formatPrice(o.total)}</span>
              } />
            ))}
          </QuickPanel>
        </motion.div>

        {/* Active orders */}
        <motion.div {...fadeUp(0.13)} className="lg:col-span-1">
          <QuickPanel
            icon={<Package />}
            title="Active Orders"
            count={quickAccess?.activeOrders?.length ?? 0}
            color="#3b82f6"
            onViewAll={() => navigate("/admin/orders")}
          >
            {(quickAccess?.activeOrders ?? []).slice(0, 4).map((o: any) => (
              <OrderRow key={o.id} orderNumber={o.order_number} sub={o.retailer_name} right={
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{ backgroundColor: `${statusColor[o.status] ?? "#8A929F"}18`, color: statusColor[o.status] ?? "#8A929F" }}
                >
                  {o.status}
                </span>
              } />
            ))}
          </QuickPanel>
        </motion.div>

        {/* OTP queue */}
        <motion.div {...fadeUp(0.16)} className="lg:col-span-1">
          <QuickPanel
            icon={<KeyRound />}
            title="OTP Queue"
            count={quickAccess?.otpQueue.length ?? 0}
            color="var(--sf-teal)"
          >
            {(quickAccess?.otpQueue ?? []).slice(0, 4).map((o: any, i: number) => (
              <OrderRow key={i} orderNumber={o.retailer_name || o.phone} sub={formatRelativeTime(o.created_at)} right={
                <span
                  className="text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold"
                  style={{ backgroundColor: "rgba(48,184,191,0.12)", color: "var(--sf-teal)" }}
                >
                  {o.otp_code}
                </span>
              } />
            ))}
          </QuickPanel>
        </motion.div>

        {/* Low stock */}
        <motion.div {...fadeUp(0.19)} className="lg:col-span-1">
          <QuickPanel
            icon={<AlertTriangle />}
            title="Low Stock"
            count={quickAccess?.lowStock.length ?? 0}
            color="#ef4444"
            onViewAll={() => navigate("/admin/products")}
          >
            {(quickAccess?.lowStock ?? []).slice(0, 4).map((p: any) => (
              <OrderRow key={p.id} orderNumber={p.name} sub={p.sku} right={
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                >
                  Out
                </span>
              } />
            ))}
          </QuickPanel>
        </motion.div>

        {/* Shortlist activity */}
        <motion.div {...fadeUp(0.22)} className="lg:col-span-1">
          <QuickPanel
            icon={<Heart />}
            title="Wishlisted"
            count={quickAccess?.shortlistActivity.length ?? 0}
            color="#f43f5e"
          >
            {(quickAccess?.shortlistActivity ?? []).slice(0, 4).map((w: any, i: number) => (
              <OrderRow key={i} orderNumber={w.product_name} sub={w.retailer_name} right={
                <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{formatRelativeTime(w.created_at)}</span>
              } />
            ))}
          </QuickPanel>
        </motion.div>

      </div>

      {/* ── Chart + Top Products ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Orders chart */}
        <motion.div {...fadeUp(0.27)} className="lg:col-span-2">
          <div
            className="h-full rounded-2xl p-5 border"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <SectionHeader icon={<TrendingUp />} title="Orders — Last 30 Days" subtitle="Daily order volume" />
            <div className="mt-2" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={6} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#30b8bf" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#2660a0" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--sf-divider)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--sf-text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "var(--sf-text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 4 }} />
                  <Bar dataKey="orders" fill="url(#barGrad)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Top viewed products */}
        <motion.div {...fadeUp(0.3)} className="lg:col-span-1">
          <div
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <SectionHeader icon={<Eye />} title="Top Viewed" subtitle="Most opened products" />
            <ScrollArea className="h-[200px] mt-1">
              {topProducts.length === 0 ? (
                <EmptyState label="No views yet" />
              ) : (
                topProducts.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                    style={{ borderColor: "var(--sf-divider)" }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: i < 3 ? RANK_BG[i] : "var(--sf-bg-surface-2)",
                        color: i < 3 ? RANK_COLOR[i] : "var(--sf-text-muted)",
                      }}
                    >
                      {i < 3 ? ["◆", "◇", "◈"][i] : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{p.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{p.sku}</p>
                    </div>
                    <span
                      className="text-xs font-semibold shrink-0"
                      style={{ color: i < 3 ? RANK_COLOR[i] : "var(--sf-text-secondary)" }}
                    >
                      {p.view_count}
                    </span>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </motion.div>
      </div>

      {/* ── Activity Feed + Top Retailers ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Activity timeline */}
        <motion.div {...fadeUp(0.35)}>
          <div
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <SectionHeader icon={<Activity />} title="Recent Activity" subtitle="Platform events" />
            <ScrollArea className="h-[300px] mt-1">
              {activity.length === 0 ? (
                <EmptyState label="No activity yet" />
              ) : (
                <div>
                  {activity.map((a, idx) => {
                    const meta = actionMeta(a.action);
                    const isLast = idx === activity.length - 1;
                    return (
                      <div key={a.id} className="flex gap-3">
                        {/* Dot + connector line column */}
                        <div className="flex flex-col items-center shrink-0 pt-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                            style={{
                              borderColor: meta.color,
                              backgroundColor: "var(--sf-bg-surface-1)",
                            }}
                          />
                          {!isLast && (
                            <div
                              className="w-px flex-1 mt-1"
                              style={{ backgroundColor: "var(--sf-divider)", minHeight: "16px" }}
                            />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium capitalize" style={{ color: "var(--sf-text-primary)" }}>
                                {meta.label}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                                {a.actor_name || a.actor_type}
                                {a.details?.email ? ` · ${a.details.email}` : ""}
                              </p>
                            </div>
                            <span className="text-[10px] shrink-0" style={{ color: "var(--sf-text-muted)" }}>
                              {formatRelativeTime(a.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </motion.div>

        {/* Top retailers */}
        <motion.div {...fadeUp(0.4)}>
          <div
            className="rounded-2xl p-5 border"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <SectionHeader icon={<Crown />} title="Top Retailers" subtitle="By total spend" />
            <ScrollArea className="h-[300px] mt-1">
              {topRetailers.length === 0 ? (
                <EmptyState label="No data yet" />
              ) : (
                topRetailers.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 py-3 border-b last:border-0"
                    style={{ borderColor: "var(--sf-divider)" }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: i < 3 ? RANK_BG[i] : "var(--sf-bg-surface-2)",
                        color: i < 3 ? RANK_COLOR[i] : "var(--sf-text-muted)",
                      }}
                    >
                      {initials(r.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>
                          {r.name}
                        </p>
                        <span className="text-xs font-bold shrink-0" style={{ color: "var(--sf-teal)" }}>
                          {formatPrice(r.total_spent)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div
                        className="h-1 w-full rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(r.total_spent / maxSpend) * 100}%`,
                            background: i < 3
                              ? `linear-gradient(90deg, ${RANK_COLOR[i]}, ${RANK_COLOR[i]}88)`
                              : "linear-gradient(90deg, var(--sf-blue-primary), var(--sf-blue-secondary))",
                          }}
                        />
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: "var(--sf-text-muted)" }}>
                        {r.company_name} · {r.order_count} orders
                      </p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function StatCard({
  icon, label, value, color, glow, delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  glow: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <div
        className="relative rounded-2xl p-4 overflow-hidden border"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-4 right-4 h-px rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${glow}60, transparent)` }}
        />
        {/* Glow orb */}
        <div
          className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ backgroundColor: glow }}
        />

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 [&>svg]:w-4 [&>svg]:h-4"
          style={{ backgroundColor: `${glow}18`, color }}
        >
          {icon}
        </div>

        <p
          className="text-2xl font-bold tabular-nums"
          style={{ color: "var(--sf-text-primary)", fontVariantNumeric: "tabular-nums" }}
        >
          {value.toLocaleString()}
        </p>
        <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wide" style={{ color: "var(--sf-text-muted)" }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

function QuickPanel({
  icon, title, count, color, children, onViewAll,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  onViewAll?: () => void;
}) {
  return (
    <div
      className="h-full rounded-2xl border flex flex-col"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--sf-divider)" }}
      >
        <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 shrink-0" style={{ color }}>{icon}</span>
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--sf-text-primary)" }}>{title}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {count}
        </span>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-3 py-1">
        {count === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>None</p>
        ) : (
          children
        )}
      </ScrollArea>

      {/* Footer link */}
      {onViewAll && count > 0 && (
        <button
          onClick={onViewAll}
          className="flex items-center justify-center gap-1 w-full py-2 text-[10px] font-semibold border-t transition-opacity hover:opacity-70"
          style={{ color: "var(--sf-text-muted)", borderColor: "var(--sf-divider)", background: "none", cursor: "pointer" }}
        >
          View all <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function OrderRow({
  orderNumber,
  sub,
  right,
}: {
  orderNumber: string;
  sub: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{orderNumber}</p>
        <p className="text-[10px] truncate" style={{ color: "var(--sf-text-muted)" }}>{sub}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Box className="w-5 h-5" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{label}</p>
    </div>
  );
}
