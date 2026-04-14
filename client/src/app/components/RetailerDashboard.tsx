import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
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
  Clock,
  TrendingUp,
  ShoppingCart,
  Package,
  Layers,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  IndianRupee,
  ClipboardList,
  BarChart3,
  LineChart,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { orders as ordersApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type DashboardSummary = {
  total_orders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  total_value: number;
};

type CategoryBreakdown = { category: string; quantity: number };
type MonthlyTrend = { month: string; orders: number; value: number; pcs: number };
type RecentOrder = { id: string; number: string; status: string; total: string; date: string; items: number };

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

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
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

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      setLoadingData(true);
      try {
        const [statsRes, ordersRes] = await Promise.allSettled([
          ordersApi.stats(),
          ordersApi.list({ limit: "5", page: "1" }),
        ]);
        if (cancelled) return;

        if (statsRes.status === "fulfilled") {
          const stats = statsRes.value as any;
          const s = stats.summary;
          setSummary({
            total_orders: parseInt(s.total_orders) || 0,
            pending: parseInt(s.pending) || 0,
            confirmed: parseInt(s.confirmed) || 0,
            processing: parseInt(s.processing) || 0,
            shipped: parseInt(s.shipped) || 0,
            delivered: parseInt(s.delivered) || 0,
            cancelled: parseInt(s.cancelled) || 0,
            total_value: parseFloat(s.total_value) || 0,
          });
          setCategoryBreakdown(
            (stats.categoryBreakdown || []).map((c: any) => ({
              category: c.category,
              quantity: parseInt(c.quantity) || 0,
            }))
          );
          setMonthlyTrends(
            (stats.monthlyTrends || []).map((t: any) => ({
              month: t.month,
              orders: parseInt(t.orders) || 0,
              value: parseFloat(t.value) || 0,
              pcs: parseInt(t.pcs) || 0,
            }))
          );
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
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  /* ── Loading skeleton ──────────────────────────── */
  if (authLoading || loadingData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-20 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
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
                  : "Here's your business overview"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {!isFirstTime && summary && (
        <>
          {/* ═══ Section 1: Orders Summary Cards ═══ */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.06 }} className="mb-8">
            <SectionHeader icon={<ClipboardList />} title="Orders Overview" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <OrderStatCard
                icon={<ShoppingCart />}
                label="Total Orders"
                value={String(summary.total_orders)}
                accent="var(--sf-teal)"
                index={0}
              />
              <OrderStatCard
                icon={<Package />}
                label="Order Placed"
                value={String(summary.pending + summary.confirmed)}
                accent="#8b5cf6"
                index={1}
              />
              <OrderStatCard
                icon={<Clock />}
                label="Pending"
                value={String(summary.processing)}
                accent="#f59e0b"
                index={2}
              />
              <OrderStatCard
                icon={<Truck />}
                label="Dispatched"
                value={String(summary.shipped)}
                accent="#06b6d4"
                index={3}
              />
              <OrderStatCard
                icon={<CheckCircle2 />}
                label="Delivered"
                value={String(summary.delivered)}
                accent="#22c55e"
                index={4}
              />
              <OrderStatCard
                icon={<IndianRupee />}
                label="Total Value"
                value={formatCurrency(summary.total_value)}
                accent="var(--sf-blue-secondary)"
                index={5}
              />
            </div>
          </motion.div>

          {/* ═══ Section 2 & 3: Category Breakdown + Active Orders ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
              <CategoryBreakdownCard data={categoryBreakdown} />
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }}>
              <ActiveOrdersCard orders={recentOrders} onViewAll={() => navigate("/retailer/orders")} />
            </motion.div>
          </div>

          {/* ═══ Section 4: Insights ═══ */}
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
            <InsightsCard data={monthlyTrends} />
          </motion.div>
        </>
      )}

    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Section Header ───────────────────────────────── */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="[&>svg]:w-4 [&>svg]:h-4" style={{ color: "var(--sf-teal)" }}>{icon}</span>
      <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--sf-text-muted)" }}>
        {title}
      </h2>
    </div>
  );
}

/* ── Order Stat Card ──────────────────────────────── */
function OrderStatCard({ icon, label, value, accent, index }: {
  icon: React.ReactNode; label: string; value: string; accent: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.04, duration: 0.35 }}
    >
      <Card className="border-[var(--sf-divider)] overflow-hidden h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
        <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl [&>svg]:w-5 [&>svg]:h-5"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            {icon}
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold leading-none mb-1" style={{ color: "var(--sf-text-primary)" }}>{value}</p>
            <p className="text-[11px] font-medium" style={{ color: "var(--sf-text-muted)" }}>{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Category Breakdown Card ──────────────────────── */
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

  // Keep in sync when parent re-fetches
  useEffect(() => { setData(initialData); }, [initialData]);

  // Only fetch from server for time-scoped filters; "all" uses initialData
  useEffect(() => {
    if (period === "all") {
      setData(initialData);
      return;
    }
    let cancelled = false;
    async function fetchFiltered() {
      setLoading(true);
      try {
        const res = await ordersApi.stats({ categoryPeriod: period }) as any;
        if (!cancelled) {
          setData(
            (res.categoryBreakdown || []).map((c: any) => ({
              category: c.category,
              quantity: parseInt(c.quantity) || 0,
            }))
          );
        }
      } catch (err) {
        console.error("Category fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFiltered();
    return () => { cancelled = true; };
  }, [period, initialData]);

  const totalPcs = data.reduce((sum, c) => sum + c.quantity, 0);

  const chartData = useMemo(() =>
    data.map((c, i) => ({
      ...c,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })),
    [data]
  );

  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.12)" }}>
              <BarChart3 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>
                Category-wise Buying
              </h3>
              <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                {totalPcs} total pcs ordered
              </p>
            </div>
          </div>

          {/* Period filter */}
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
          <div className="flex-1 flex items-center justify-center py-8">
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <BarChart3 className="w-8 h-8 mb-2" style={{ color: "rgba(139,92,246,0.25)" }} />
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>No order data for this period</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-divider)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "var(--sf-text-primary)" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--sf-bg-surface-2)",
                      border: "1px solid var(--sf-divider)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--sf-text-primary)",
                    }}
                    labelStyle={{ color: "var(--sf-text-primary)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--sf-text-primary)" }}
                    formatter={(val: number) => [`${val} pcs`, "Quantity"]}
                  />
                  <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend pills */}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Active Orders Card ──────────────────────────── */
const ORDER_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock className="w-3 h-3" /> },
  confirmed:  { label: "Confirmed",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <CheckCircle2 className="w-3 h-3" /> },
  processing: { label: "Processing", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <Package className="w-3 h-3" /> },
  shipped:    { label: "Dispatched", color: "#06b6d4", bg: "rgba(6,182,212,0.12)",  icon: <Truck className="w-3 h-3" /> },
  delivered:  { label: "Delivered",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: "Cancelled",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: <XCircle className="w-3 h-3" /> },
};

function ActiveOrdersCard({ orders, onViewAll }: {
  orders: RecentOrder[];
  onViewAll: () => void;
}) {
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "rgba(6,182,212,0.12)" }}>
              <Layers className="w-4 h-4" style={{ color: "#06b6d4" }} />
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
            {activeOrders.slice(0, 5).map((o) => {
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

/* ── Insights Card ────────────────────────────────── */
function InsightsCard({ data }: { data: MonthlyTrend[] }) {
  const [metric, setMetric] = useState<"pcs" | "value" | "orders">("pcs");

  const chartData = useMemo(() =>
    data.map((d) => ({
      ...d,
      label: formatMonthLabel(d.month),
    })),
    [data]
  );

  const metricConfig = {
    pcs:    { label: "Pieces", color: "#30B8BF", formatter: (v: number) => `${v} pcs`, dotLabel: (v: number) => `${v}` },
    value:  { label: "Value (₹)", color: "#8b5cf6", formatter: (v: number) => formatCurrency(v), dotLabel: (v: number) => `₹${(v / 1000).toFixed(0)}k` },
    orders: { label: "Orders", color: "#f59e0b", formatter: (v: number) => `${v} orders`, dotLabel: (v: number) => `${v}` },
  };

  const cfg = metricConfig[metric];

  return (
    <Card className="border-[var(--sf-divider)]" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "var(--sf-teal-glass)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--sf-text-primary)" }}>
                Buying Insights
              </h3>
              <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                Your buying pattern over the last 6 months
              </p>
            </div>
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

        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LineChart className="w-10 h-10 mb-3" style={{ color: "rgba(48,184,191,0.25)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--sf-text-muted)" }}>No data yet</p>
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Insights will appear once you place orders</p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 24, bottom: 4 }}>
                <defs>
                  {(["pcs", "value", "orders"] as const).map((m) => (
                    <linearGradient key={m} id={`gradient-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricConfig[m].color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={metricConfig[m].color} stopOpacity={0.03} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-divider)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--sf-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v) => metric === "value" ? `₹${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--sf-bg-surface-2)",
                    border: "1px solid var(--sf-divider)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--sf-text-primary)",
                  }}
                  labelStyle={{ color: "var(--sf-text-primary)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--sf-text-primary)" }}
                  formatter={(val: number) => [cfg.formatter(val), cfg.label]}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${metric})`}
                  activeDot={{ r: 6, fill: cfg.color, stroke: "#fff", strokeWidth: 2 }}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const val = payload[metric];
                    return (
                      <g key={`dot-${cx}-${cy}`}>
                        <circle cx={cx} cy={cy} r={4} fill={cfg.color} stroke="#1a1f2e" strokeWidth={2} />
                        <text
                          x={cx}
                          y={cy - 14}
                          textAnchor="middle"
                          fill={cfg.color}
                          fontSize={11}
                          fontWeight={700}
                        >
                          {cfg.dotLabel(val)}
                        </text>
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
