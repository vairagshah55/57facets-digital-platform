import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
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
  BarChart3,
  Eye,
  Crown,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
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
type TopRetailer = { id: string; name: string; company_name: string; order_count: number; total_spent: number };

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatPrice(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    admin_login: "Admin logged in",
    order_placed: "New order placed",
    retailer_login: "Retailer logged in",
    product_viewed: "Product viewed",
    wishlist_add: "Added to wishlist",
  };
  return map[action] || action.replace(/_/g, " ");
}

/* ═══════════════════════════════════════════════════════
   MAIN
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
      if (s.status === "fulfilled") setStats(s.value);
      if (qa.status === "fulfilled") setQuickAccess(qa.value);
      if (act.status === "fulfilled") setActivity(act.value);
      if (oc.status === "fulfilled") setOrdersChart(oc.value);
      if (tp.status === "fulfilled") setTopProducts(tp.value);
      if (tr.status === "fulfilled") setTopRetailers(tr.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sf-blue-primary)" }} />
      </div>
    );
  }

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* ── Today's Stats ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<ShoppingCart />} label="Orders Today" value={stats?.ordersToday ?? 0} color="var(--sf-teal)" />
        <StatCard icon={<Users />} label="New Retailers" value={stats?.newRetailersToday ?? 0} color="#22c55e" />
        <StatCard icon={<KeyRound />} label="Pending OTPs" value={stats?.pendingOtps ?? 0} color="#f59e0b" />
        <StatCard icon={<Users />} label="Total Retailers" value={stats?.totalRetailers ?? 0} color="var(--sf-blue-secondary)" />
        <StatCard icon={<Package />} label="Total Products" value={stats?.totalProducts ?? 0} color="#a855f7" />
        <StatCard icon={<ShoppingCart />} label="Total Orders" value={stats?.totalOrders ?? 0} color="var(--sf-teal)" />
      </div>

      {/* ── Quick Access Cards ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pending Orders */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
          <QuickCard
            icon={<Clock />}
            title="Pending Orders"
            count={quickAccess?.pendingOrders.length ?? 0}
            color="#f59e0b"
          >
            {quickAccess?.pendingOrders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>{o.order_number}</p>
                  <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{o.retailer_name}</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--sf-teal)" }}>
                  {formatPrice(o.total)}
                </span>
              </div>
            ))}
          </QuickCard>
        </motion.div>

        {/* Active Orders (confirmed/processing/shipped) */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.07 }}>
          <QuickCard
            icon={<Package />}
            title="Active Orders"
            count={quickAccess?.activeOrders?.length ?? 0}
            color="#3b82f6"
          >
            {quickAccess?.activeOrders?.slice(0, 4).map((o: any) => (
              <div key={o.id} className="flex justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>{o.order_number}</p>
                  <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{o.retailer_name}</p>
                </div>
                <Badge className="text-[9px] h-4 capitalize" style={{
                  backgroundColor: o.status === "confirmed" ? "rgba(59,130,246,0.12)" : o.status === "processing" ? "rgba(139,92,246,0.12)" : "rgba(6,182,212,0.12)",
                  color: o.status === "confirmed" ? "#3b82f6" : o.status === "processing" ? "#8b5cf6" : "#06b6d4",
                  border: "none",
                }}>{o.status}</Badge>
              </div>
            ))}
          </QuickCard>
        </motion.div>

        {/* OTP Queue */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
          <QuickCard
            icon={<KeyRound />}
            title="OTP Queue"
            count={quickAccess?.otpQueue.length ?? 0}
            color="var(--sf-teal)"
          >
            {quickAccess?.otpQueue.slice(0, 4).map((o, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>{o.retailer_name || o.phone}</p>
                  <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{formatRelativeTime(o.created_at)}</p>
                </div>
                <Badge className="text-[10px] h-5" style={{ backgroundColor: "rgba(48,184,191,0.15)", color: "var(--sf-teal)", border: "none" }}>
                  {o.otp_code}
                </Badge>
              </div>
            ))}
          </QuickCard>
        </motion.div>

        {/* Low Stock */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <QuickCard
            icon={<AlertTriangle />}
            title="Low Stock Alerts"
            count={quickAccess?.lowStock.length ?? 0}
            color="var(--destructive)"
          >
            {quickAccess?.lowStock.slice(0, 4).map((p) => (
              <div key={p.id} className="flex justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{p.sku}</p>
                </div>
                <Badge className="text-[10px] h-5" style={{ backgroundColor: "rgba(194,23,59,0.15)", color: "var(--destructive)", border: "none" }}>
                  Out
                </Badge>
              </div>
            ))}
          </QuickCard>
        </motion.div>

        {/* Shortlist Activity */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
          <QuickCard
            icon={<Heart />}
            title="Shortlist Activity"
            count={quickAccess?.shortlistActivity.length ?? 0}
            color="#ef4444"
          >
            {quickAccess?.shortlistActivity.slice(0, 4).map((w, i) => (
              <div key={i} className="flex justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{w.product_name}</p>
                  <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{w.retailer_name}</p>
                </div>
                <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{formatRelativeTime(w.created_at)}</span>
              </div>
            ))}
          </QuickCard>
        </motion.div>
      </div>

      {/* ── Charts Row ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Orders Chart (bar) */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }} className="lg:col-span-2">
          <Card className="border-[var(--sf-divider)]" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "var(--sf-blue-primary)" }} />
                Orders — Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-[3px] h-[160px]">
                {ordersChart.map((d, i) => {
                  const max = Math.max(...ordersChart.map((x) => Number(x.count)), 1);
                  const h = (Number(d.count) / max) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                      style={{
                        height: `${Math.max(h, 2)}%`,
                        backgroundColor: Number(d.count) > 0 ? "var(--sf-blue-primary)" : "var(--sf-bg-surface-2)",
                      }}
                      title={`${new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}: ${d.count} orders`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>30 days ago</span>
                <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>Today</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }}>
          <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
                <Eye className="w-4 h-4" style={{ color: "#a855f7" }} />
                Top Viewed Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[200px]">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>No data yet</p>
                ) : (
                  topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 py-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor: i < 3 ? "rgba(168,85,247,0.15)" : "var(--sf-bg-surface-2)",
                          color: i < 3 ? "#a855f7" : "var(--sf-text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{p.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{p.sku}</p>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "#a855f7" }}>
                        {p.view_count}
                      </span>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Activity + Top Retailers ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }}>
          <Card className="border-[var(--sf-divider)]" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
                <Activity className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[280px]">
                {activity.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>No recent activity</p>
                ) : (
                  activity.map((a) => (
                    <div key={a.id} className="py-2.5 border-b last:border-0" style={{ borderColor: "var(--sf-divider)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>
                            {actionLabel(a.action)}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                            {a.actor_name || a.actor_type} {a.details?.email ? `(${a.details.email})` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--sf-text-muted)" }}>
                          {formatRelativeTime(a.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Retailers */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }}>
          <Card className="border-[var(--sf-divider)]" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
                <Crown className="w-4 h-4" style={{ color: "#f59e0b" }} />
                Most Active Retailers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[280px]">
                {topRetailers.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>No data yet</p>
                ) : (
                  topRetailers.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--sf-divider)" }}>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor: i < 3 ? "rgba(245,158,11,0.15)" : "var(--sf-bg-surface-2)",
                          color: i < 3 ? "#f59e0b" : "var(--sf-text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{r.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{r.company_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--sf-teal)" }}>
                          {formatPrice(r.total_spent)}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                          {r.order_count} orders
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="border-[var(--sf-divider)] p-4" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
          <div>
            <p className="text-xl font-semibold" style={{ color: "var(--sf-text-primary)" }}>{value}</p>
            <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{label}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function QuickCard({
  icon,
  title,
  count,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-[var(--sf-divider)] h-full" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
          <span className="[&>svg]:w-4 [&>svg]:h-4" style={{ color }}>{icon}</span>
          {title}
          <Badge
            className="text-[10px] h-5 ml-auto"
            style={{ backgroundColor: `${color}15`, color, border: "none" }}
          >
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[160px]">
          {count === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>None</p>
          ) : (
            children
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
