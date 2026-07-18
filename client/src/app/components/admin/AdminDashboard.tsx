import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
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
  Clock,
  AlertTriangle,
  Heart,
  TrendingUp,
  Activity,
  Crown,
  Loader2,
  ArrowUpRight,
  Box,
  BarChart3,
  LineChart,
  LogIn,
  XCircle,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { adminDashboard } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Stats = {
  ordersToday: number;
  newRetailersToday: number;
  totalRetailers: number;
  totalProducts: number;
  totalOrders: number;
};

type QuickAccess = {
  pendingOrders: any[];
  activeOrders: any[];
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

type CategoryBreakdown = { category: string; quantity: number };
type MonthlyTrend = { month: string; orders: number; value: number; pcs: number };
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

type ActionMeta = { label: string; color: string; bg: string; Icon: React.ComponentType<any> };

// The action names come straight from the server's activity_log (dot notation).
function actionMeta(action: string): ActionMeta {
  const map: Record<string, ActionMeta> = {
    login:             { label: "logged in",          color: "#22c55e", bg: "rgba(34,197,94,0.12)",  Icon: LogIn },
    "order.placed":    { label: "placed an order",    color: "#30b8bf", bg: "rgba(48,184,191,0.12)", Icon: ShoppingCart },
    "order.cancelled": { label: "cancelled an order", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  Icon: XCircle },
  };
  return map[action] ?? { label: action.replace(/[._]/g, " "), color: "#8A929F", bg: "rgba(138,146,159,0.12)", Icon: Activity };
}

// One-line detail for an activity row (order number/total, or login method).
function activityDetail(a: ActivityItem): string {
  const d = a.details || {};
  if (a.action === "order.placed") {
    return [d.order_number, d.total != null ? formatPrice(d.total) : null, d.items != null ? `${d.items} item${d.items !== 1 ? "s" : ""}` : null]
      .filter(Boolean).join(" · ");
  }
  if (a.action === "order.cancelled") return d.order_number || "";
  if (a.action === "login") return d.method ? `via ${d.method}` : (d.phone || "");
  return "";
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
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [topRetailers, setTopRetailers] = useState<TopRetailer[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      adminDashboard.stats(),
      adminDashboard.quickAccess(),
      adminDashboard.activity(),
      adminDashboard.categoryBreakdown(),
      adminDashboard.monthlyTrends(),
      adminDashboard.topRetailers(),
    ]).then(([s, qa, act, cb, mt, tr]) => {
      if (cancelled) return;
      if (s.status  === "fulfilled") setStats(s.value);
      if (qa.status === "fulfilled") setQuickAccess(qa.value);
      if (act.status === "fulfilled") setActivity(act.value);
      if (cb.status  === "fulfilled") setCategoryBreakdown((cb.value || []).map((c: any) => ({ category: c.category, quantity: parseInt(c.quantity) || 0 })));
      if (mt.status  === "fulfilled") setMonthlyTrends((mt.value || []).map((t: any) => ({ month: t.month, orders: parseInt(t.orders) || 0, value: parseFloat(t.value) || 0, pcs: parseInt(t.pcs) || 0 })));
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <div className="skeleton-shimmer w-9 h-9 rounded-lg" />
              <div className="skeleton-shimmer h-3 w-16 rounded-md" />
              <div className="skeleton-shimmer h-6 w-12 rounded-md" />
            </div>
          ))}
        </div>
        {/* Quick panels skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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

  /* Max spend for retailer progress bars */
  const maxSpend = Math.max(...topRetailers.map((r) => r.total_spent), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-7 space-y-8">

      {/* ── Page header ─────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="flex items-end justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "'General Sans', 'Inter', sans-serif", color: "var(--sf-text-primary)" }}
          >
            Overview
          </h2>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: <ShoppingCart />, label: "Orders Today",    value: stats?.ordersToday ?? 0,        color: "var(--sf-teal)",          glow: "#30b8bf" },
          { icon: <Users />,        label: "New Retailers",   value: stats?.newRetailersToday ?? 0,  color: "#22c55e",                  glow: "#22c55e" },
          { icon: <Users />,        label: "Total Retailers", value: stats?.totalRetailers ?? 0,     color: "var(--sf-blue-secondary)", glow: "#3880be" },
          { icon: <Package />,      label: "Total Products",  value: stats?.totalProducts ?? 0,      color: "#a855f7",                  glow: "#a855f7" },
          { icon: <ShoppingCart />, label: "Total Orders",    value: stats?.totalOrders ?? 0,        color: "var(--sf-teal)",           glow: "#30b8bf" },
        ].map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>

      {/* ── Quick access row ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

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

      {/* ── Category-wise Buying + Buying Insights ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp(0.27)}>
          <CategoryBreakdownCard data={categoryBreakdown} />
        </motion.div>
        <motion.div {...fadeUp(0.3)}>
          <InsightsCard data={monthlyTrends} />
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
            <SectionHeader icon={<Activity />} title="Recent Activity" subtitle="Retailer logins & orders" />
            <ScrollArea className="h-[300px] mt-1">
              {activity.length === 0 ? (
                <EmptyState label="No retailer activity yet" />
              ) : (
                <div>
                  {activity.map((a) => {
                    const meta = actionMeta(a.action);
                    const Icon = meta.Icon;
                    const detail = activityDetail(a);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 py-2.5 border-b last:border-0"
                        style={{ borderColor: "var(--sf-divider)" }}
                      >
                        {/* Action icon badge */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.bg }}
                        >
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--sf-text-primary)" }}>
                            <span className="font-semibold">{a.actor_name || "A retailer"}</span>
                            <span style={{ color: "var(--sf-text-secondary)" }}> {meta.label}</span>
                          </p>
                          {detail && (
                            <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--sf-text-muted)" }}>
                              {detail}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--sf-text-muted)" }}>
                          {formatRelativeTime(a.created_at)}
                        </span>
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

/* ── Category-wise Buying (platform-wide) ─────────── */
const CATEGORY_COLORS = [
  "var(--sf-teal)", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444",
  "#06b6d4", "#ec4899", "#f97316", "#6366f1", "#14b8a6",
];

const CATEGORY_PERIODS = [
  { key: "1d", label: "Yesterday" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "all", label: "All Time" },
] as const;

type CategoryPeriod = typeof CATEGORY_PERIODS[number]["key"];

function CategoryBreakdownCard({ data: initialData }: { data: CategoryBreakdown[] }) {
  const [period, setPeriod] = useState<CategoryPeriod>("all");
  const [data, setData] = useState<CategoryBreakdown[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Keep in sync when the parent re-fetches the "all" dataset.
  useEffect(() => { setData(initialData); }, [initialData]);

  // Only fetch from the server for time-scoped filters; "all" uses initialData.
  useEffect(() => {
    if (period === "all") { setData(initialData); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboard.categoryBreakdown(period) as any;
        if (!cancelled) {
          setData((res || []).map((c: any) => ({ category: c.category, quantity: parseInt(c.quantity) || 0 })));
        }
      } catch (err) {
        console.error("Category fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, initialData]);

  const totalPcs = data.reduce((sum, c) => sum + c.quantity, 0);
  const chartData = useMemo(
    () => data.map((c, i) => ({ ...c, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [data]
  );

  return (
    <div className="h-full rounded-2xl p-5 border" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
            <BarChart3 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Category-wise Buying</h3>
            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{totalPcs} total pcs ordered</p>
          </div>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--sf-divider)" }}>
          {CATEGORY_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-2 sm:px-2.5 py-1 text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: period === p.key ? "#8b5cf6" : "transparent",
                color: period === p.key ? "#fff" : "var(--sf-text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--sf-text-muted)" }} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center" style={{ height: 200 }}>
          <BarChart3 className="w-8 h-8 mb-2" style={{ color: "rgba(139,92,246,0.25)" }} />
          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>No order data for this period</p>
        </div>
      ) : (
        <>
          <div style={{ height: 200 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-divider)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "var(--sf-text-primary)" }} axisLine={false} tickLine={false} width={80} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", borderRadius: 10, fontSize: 12, color: "var(--sf-text-primary)" }}
                  labelStyle={{ color: "var(--sf-text-primary)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--sf-text-primary)" }}
                  formatter={(val: number) => [`${val} pcs`, "Quantity"]}
                />
                <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={20}>
                  {chartData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--sf-divider)" }}>
            {chartData.map((c, i) => (
              <span
                key={c.category}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}18`, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                {c.category}: {c.quantity} pcs
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Buying Insights (platform-wide, last 6 months) ── */
function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

const INSIGHTS_PERIODS = [
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "all", label: "All Time" },
] as const;

type InsightsPeriod = typeof INSIGHTS_PERIODS[number]["key"];

function InsightsCard({ data: initialData }: { data: MonthlyTrend[] }) {
  const [metric, setMetric] = useState<"pcs" | "value" | "orders">("pcs");
  const [period, setPeriod] = useState<InsightsPeriod>("6m");
  const [data, setData] = useState<MonthlyTrend[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Parent fetches the default (6-month) dataset; keep in sync when it changes.
  useEffect(() => { setData(initialData); }, [initialData]);

  // "6m" is the default the parent already loaded; other periods fetch from the server.
  useEffect(() => {
    if (period === "6m") { setData(initialData); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminDashboard.monthlyTrends(period) as any;
        if (!cancelled) {
          setData((res || []).map((t: any) => ({ month: t.month, orders: parseInt(t.orders) || 0, value: parseFloat(t.value) || 0, pcs: parseInt(t.pcs) || 0 })));
        }
      } catch (err) {
        console.error("Monthly trends fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, initialData]);

  const chartData = useMemo(() => data.map((d) => ({ ...d, label: formatMonthLabel(d.month) })), [data]);

  const metricConfig = {
    pcs:    { label: "Pieces", color: "#30B8BF", formatter: (v: number) => `${v} pcs`, dotLabel: (v: number) => `${v}` },
    value:  { label: "Value (₹)", color: "#8b5cf6", formatter: (v: number) => formatPrice(v), dotLabel: (v: number) => `₹${(v / 1000).toFixed(0)}k` },
    orders: { label: "Orders", color: "#f59e0b", formatter: (v: number) => `${v} orders`, dotLabel: (v: number) => `${v}` },
  };
  const cfg = metricConfig[metric];

  return (
    <div className="h-full rounded-2xl p-5 border" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "var(--sf-teal-glass)" }}>
            <TrendingUp className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>Buying Insights</h3>
            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
              Platform buying pattern · {INSIGHTS_PERIODS.find((p) => p.key === period)?.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date filter */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--sf-divider)" }}>
            {INSIGHTS_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-2 sm:px-2.5 py-1.5 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: period === p.key ? "var(--sf-teal)" : "transparent",
                  color: period === p.key ? "#fff" : "var(--sf-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Metric toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--sf-divider)" }}>
            {(["pcs", "value", "orders"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className="px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: metric === m ? metricConfig[m].color : "transparent",
                  color: metric === m ? "#fff" : "var(--sf-text-muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {metricConfig[m].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 260 }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--sf-text-muted)" }} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LineChart className="w-10 h-10 mb-3" style={{ color: "rgba(48,184,191,0.25)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--sf-text-muted)" }}>No data yet</p>
          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Insights will appear once orders are placed</p>
        </div>
      ) : (
        <div style={{ height: 260 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 24, bottom: 4 }}>
              <defs>
                {(["pcs", "value", "orders"] as const).map((m) => (
                  <linearGradient key={m} id={`admin-gradient-${m}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricConfig[m].color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={metricConfig[m].color} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-divider)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => metric === "value" ? `₹${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", borderRadius: 10, fontSize: 12, color: "var(--sf-text-primary)" }}
                labelStyle={{ color: "var(--sf-text-primary)", fontWeight: 600 }}
                itemStyle={{ color: "var(--sf-text-primary)" }}
                formatter={(val: number) => [cfg.formatter(val), cfg.label]}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={cfg.color}
                strokeWidth={2.5}
                fill={`url(#admin-gradient-${metric})`}
                activeDot={{ r: 6, fill: cfg.color, stroke: "#fff", strokeWidth: 2 }}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const val = payload[metric];
                  return (
                    <g key={`dot-${cx}-${cy}`}>
                      <circle cx={cx} cy={cy} r={4} fill={cfg.color} stroke="#1a1f2e" strokeWidth={2} />
                      <text x={cx} y={cy - 14} textAnchor="middle" fill={cfg.color} fontSize={11} fontWeight={700}>{cfg.dotLabel(val)}</text>
                    </g>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
