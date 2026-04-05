import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Bell, ShoppingCart, Package, Users, CheckCheck, Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { adminDashboard } from "../../../lib/adminApi";

type AdminNotification = {
  id: string; type: string; title: string; message: string;
  is_read: boolean; action_path?: string; created_at: string;
};

const TYPE_CFG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  order:    { icon: <ShoppingCart className="w-4 h-4" />, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Order" },
  product:  { icon: <Package className="w-4 h-4" />, color: "var(--sf-teal)", bg: "rgba(48,184,191,0.12)", label: "Product" },
  retailer: { icon: <Users className="w-4 h-4" />, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Retailer" },
  system:   { icon: <Bell className="w-4 h-4" />, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "System" },
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDashboard.notifications();
      setNotifications(data.notifications || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (id: string) => {
    try { await adminDashboard.markNotificationRead(id); setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n)); } catch {}
  };
  const markAllRead = async () => {
    try { await adminDashboard.markAllNotificationsRead(); setNotifications((p) => p.map((n) => ({ ...n, is_read: true }))); } catch {}
  };
  const handleClick = (n: AdminNotification) => {
    if (!n.is_read) markRead(n.id);
    if (n.action_path) navigate(n.action_path);
  };

  const unread = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === "all" ? notifications : filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications.filter((n) => n.type === filter);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
            Notifications
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={markAllRead}
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </motion.div>

      {/* Filter tabs */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread (${unread})` },
          { key: "order", label: "Orders" },
          { key: "product", label: "Products" },
          { key: "system", label: "System" },
        ].map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: filter === t.key ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
              color: filter === t.key ? "#fff" : "var(--sf-text-muted)",
              border: filter === t.key ? "none" : "1px solid var(--sf-divider)",
              cursor: "pointer",
            }}>{t.label}</button>
        ))}
      </motion.div>

      {/* List */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-10 h-10 mb-3" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.system;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className="w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all hover:border-[var(--sf-teal)]"
                  style={{
                    backgroundColor: n.is_read ? "var(--sf-bg-surface-1)" : "rgba(48,184,191,0.03)",
                    borderColor: n.is_read ? "var(--sf-divider)" : "rgba(48,184,191,0.15)",
                    cursor: "pointer",
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm truncate" style={{ color: "var(--sf-text-primary)", fontWeight: n.is_read ? 400 : 600 }}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--sf-teal)" }} />}
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "var(--sf-text-muted)" }}>{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className="text-[9px] h-4" style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none" }}>{cfg.label}</Badge>
                      <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
