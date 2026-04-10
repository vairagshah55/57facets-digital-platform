import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Shield,
  Monitor,
  LogIn,
  ShoppingCart,
  Heart,
  Package,
  Truck,
  Pencil,
  Trash2,
  FolderPlus,
  UserPlus,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { adminAudit } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type AuditEntry = {
  id: string;
  actor_type: "retailer" | "admin" | "system";
  actor_id: string | null;
  actor_name: string | null;
  actor_company: string | null;
  actor_contact: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
};

type Stats = {
  total: number;
  last_24h: number;
  retailer_actions: number;
  admin_actions: number;
};

/* ═══════════════════════════════════════════════════════
   ACTION DISPLAY CONFIG
   ═══════════════════════════════════════════════════════ */

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  "login":              { label: "Logged In",        icon: <LogIn className="w-3.5 h-3.5" />,       color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "order.placed":       { label: "Placed Order",     icon: <ShoppingCart className="w-3.5 h-3.5" />, color: "var(--sf-teal)", bg: "var(--sf-teal-glass)" },
  "order.status_changed": { label: "Order Status",   icon: <Truck className="w-3.5 h-3.5" />,       color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  "wishlist.added":     { label: "Wishlisted",       icon: <Heart className="w-3.5 h-3.5" />,       color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "wishlist.removed":   { label: "Unwishlisted",     icon: <Heart className="w-3.5 h-3.5" />,       color: "#8A929F", bg: "rgba(138,146,159,0.12)" },
  "product.created":    { label: "Created Product",  icon: <Package className="w-3.5 h-3.5" />,     color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  "product.updated":    { label: "Updated Product",  icon: <Pencil className="w-3.5 h-3.5" />,      color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  "product.deleted":    { label: "Deleted Product",  icon: <Trash2 className="w-3.5 h-3.5" />,      color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "retailer.created":   { label: "Created Retailer", icon: <UserPlus className="w-3.5 h-3.5" />,    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "retailer.activated":   { label: "Activated Retailer", icon: <User className="w-3.5 h-3.5" />,    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  "retailer.deactivated": { label: "Deactivated Retailer", icon: <User className="w-3.5 h-3.5" />,  color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  "collection.created": { label: "Created Collection", icon: <FolderPlus className="w-3.5 h-3.5" />, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  "admin.login":        { label: "Admin Login",      icon: <Shield className="w-3.5 h-3.5" />,      color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  "product.imported":   { label: "Imported Products", icon: <Package className="w-3.5 h-3.5" />,    color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || {
    label: action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: <Activity className="w-3.5 h-3.5" />,
    color: "var(--sf-text-muted)",
    bg: "var(--sf-glass-pill)",
  };
}

const ACTOR_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  retailer: { icon: <User className="w-3.5 h-3.5" />, color: "#22c55e" },
  admin:    { icon: <Shield className="w-3.5 h-3.5" />, color: "#3b82f6" },
  system:   { icon: <Monitor className="w-3.5 h-3.5" />, color: "var(--sf-text-muted)" },
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return dateStr; }
}

function formatRelative(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return formatDateTime(dateStr);
  } catch { return dateStr; }
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [actorType, setActorType] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch stats once
  useEffect(() => {
    adminAudit.stats().then(setStats).catch(() => {});
  }, []);

  // Fetch logs
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "30" };
    if (actorType !== "all") params.actor_type = actorType;
    if (actionFilter !== "all") params.action = actionFilter;
    if (search.trim()) params.search = search.trim();
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    adminAudit.list(params).then((data: any) => {
      if (cancelled) return;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.actions) setActions(data.actions);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, actorType, actionFilter, search, dateFrom, dateTo]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setActorType("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const hasFilters = search || actorType !== "all" || actionFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: "rgba(245,158,11,0.12)" }}
          >
            <Activity className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1
              className="text-xl font-semibold leading-tight"
              style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}
            >
              Audit Log
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
              {total} events tracked
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Stats Cards ═══ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Events" value={String(stats.total)} color="var(--sf-teal)" />
          <StatCard label="Last 24 Hours" value={String(stats.last_24h)} color="#f59e0b" />
          <StatCard label="Retailer Actions" value={String(stats.retailer_actions)} color="#22c55e" />
          <StatCard label="Admin Actions" value={String(stats.admin_actions)} color="#3b82f6" />
        </div>
      )}

      {/* ═══ Filters ═══ */}
      <div
        className="rounded-xl border p-4 mb-6"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-medium flex items-center gap-1 ml-auto"
              style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
            <Input
              placeholder="Search name, action..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
            />
          </div>

          {/* Actor type */}
          <Select value={actorType} onValueChange={(v) => { setActorType(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <SelectItem value="all">All Actors</SelectItem>
              <SelectItem value="retailer">Retailer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          {/* Action */}
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{getActionConfig(a).label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
              placeholder="From"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* ═══ Timeline ═══ */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
      >
        {loading && logs.length === 0 ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="skeleton-shimmer w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-3.5 w-2/3 rounded-md" />
                  <div className="skeleton-shimmer h-3 w-1/3 rounded-md" />
                </div>
                <div className="skeleton-shimmer h-3 w-16 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Activity className="w-10 h-10 mb-3" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>No audit events found</p>
            <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s", pointerEvents: loading ? "none" : "auto" }}>
            {logs.map((entry, idx) => (
              <AuditRow key={entry.id} entry={entry} isLast={idx === logs.length - 1} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--sf-divider)" }}
          >
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              Page {page} of {totalPages} ({total} events)
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ color: "var(--sf-text-secondary)" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ color: "var(--sf-text-secondary)" }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "var(--sf-text-muted)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function AuditRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const actionCfg = getActionConfig(entry.action);
  const actorCfg = ACTOR_ICON[entry.actor_type] || ACTOR_ICON.system;

  // Build description
  let description = actionCfg.label;
  if (entry.details) {
    if (entry.details.order_number) description += ` #${entry.details.order_number}`;
    if (entry.details.items) description += ` (${entry.details.items} items)`;
    if (entry.details.total) description += ` — ₹${Number(entry.details.total).toLocaleString("en-IN")}`;
    if (entry.details.from && entry.details.to) description += `: ${entry.details.from} → ${entry.details.to}`;
    if (entry.details.name) description += `: ${entry.details.name}`;
    if (entry.details.count) description += ` (${entry.details.count} items)`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--sf-glass-bg)]"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--sf-divider)" }}
    >
      {/* Action icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: actionCfg.bg }}
      >
        <span style={{ color: actionCfg.color }}>{actionCfg.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
            {description}
          </p>
          {entry.entity_type && (
            <Badge className="text-[9px] h-4" style={{ backgroundColor: "var(--sf-glass-pill)", color: "var(--sf-text-muted)", border: "none" }}>
              {entry.entity_type}
            </Badge>
          )}
        </div>

        {/* Actor */}
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ color: actorCfg.color }}>{actorCfg.icon}</span>
          <span className="text-xs" style={{ color: "var(--sf-text-secondary)" }}>
            {entry.actor_name || "Unknown"}
            {entry.actor_company && <span style={{ color: "var(--sf-text-muted)" }}> · {entry.actor_company}</span>}
          </span>
          <Badge className="text-[9px] h-4 capitalize" style={{
            backgroundColor: entry.actor_type === "retailer" ? "rgba(34,197,94,0.1)" : entry.actor_type === "admin" ? "rgba(59,130,246,0.1)" : "var(--sf-glass-pill)",
            color: actorCfg.color,
            border: "none",
          }}>
            {entry.actor_type}
          </Badge>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0">
        <p className="text-[11px] font-medium" style={{ color: "var(--sf-text-muted)" }}>
          {formatRelative(entry.created_at)}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)", opacity: 0.6 }}>
          {formatDateTime(entry.created_at)}
        </p>
      </div>
    </motion.div>
  );
}
