import { useNavigate, useLocation, Outlet } from "react-router";
import { CartProvider } from "../../context/CartContext";
import { CartBar } from "./CartBar";
import {
  Bell,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Layers,
  Megaphone,
  Check,
  Loader2,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";

import { notifications as notificationsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

/* ═══════════════════════════════════════════════════════
   NOTIFICATION TYPES
   ═══════════════════════════════════════════════════════ */

type NotificationType = "order-update" | "new-collection" | "announcement" | "system";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_path?: string;
  created_at: string;
};

const NOTIFICATION_ICON: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  "order-update": { icon: <Truck className="w-4 h-4" />, color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  "new-collection": { icon: <Sparkles className="w-4 h-4" />, color: "var(--sf-teal)", bg: "rgba(48,184,191,0.15)" },
  announcement: { icon: <Megaphone className="w-4 h-4" />, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  system: { icon: <Bell className="w-4 h-4" />, color: "var(--sf-blue-secondary)", bg: "rgba(56,128,190,0.15)" },
};

/* ═══════════════════════════════════════════════════════
   RELATIVE TIME HELPER
   ═══════════════════════════════════════════════════════ */

function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    if (diffMs < 0) return "just now";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  } catch {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════════════════
   NAV ITEMS
   ═══════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: "Dashboard", path: "/retailer/dashboard" },
  { label: "Catalog", path: "/retailer/catalog" },
  { label: "Collections", path: "/retailer/collections" },
  { label: "Wishlist", path: "/retailer/wishlist" },
  { label: "Orders", path: "/retailer/orders" },
];

/* ═══════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════ */

export function RetailerLayout() {
  return (
    <CartProvider>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "var(--sf-bg-base)",
          fontFamily: "'General Sans', 'Inter', sans-serif",
        }}
      >
        <RetailerHeader />
        <Outlet />
        <CartBar />
      </div>
    </CartProvider>
  );
}

/* ═══════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════ */

function RetailerHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { retailer } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const data = await notificationsApi.list();
        if (!cancelled) {
          setNotifications(Array.isArray(data) ? data : data.notifications ?? []);
          setUnreadCount(
            typeof data.unreadCount === "number"
              ? data.unreadCount
              : (Array.isArray(data) ? data : data.notifications ?? []).filter(
                  (n: Notification) => !n.is_read
                ).length
          );
        }
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoadingNotifications(false);
      }
    };
    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(id);
    } catch {
      // revert
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prev = notifications;
    const prevCount = unreadCount;
    // Optimistic
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      // revert
      setNotifications(prev);
      setUnreadCount(prevCount);
    }
  }, [notifications, unreadCount]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      if (notification.action_path) {
        setNotifPopoverOpen(false);
        setTimeout(() => navigate(notification.action_path!), 100);
      }
    },
    [markAsRead, navigate]
  );

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          backgroundColor: theme === "light" ? "rgba(255,255,255,0.98)" : "var(--sf-overlay-bg)",
          backdropFilter: theme === "light" ? "none" : "blur(20px)",
          WebkitBackdropFilter: theme === "light" ? "none" : "blur(20px)",
          borderBottom: "1px solid var(--sf-divider)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Brand — diamond + company name */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 mr-8"
            style={{ background: "none", border: "none" }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(48,184,191,0.15) 0%, rgba(38,96,160,0.15) 100%)",
                border: "1px solid rgba(48,184,191,0.2)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L28 12L16 30L4 12L16 2Z" stroke="var(--sf-teal)" strokeWidth="1.8" fill="none" />
                <path d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z" stroke="var(--sf-teal)" strokeWidth="1.2" fill="none" opacity="0.4" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span
                className="block text-[15px] font-semibold leading-tight"
                style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}
              >
                {retailer?.companyName || retailer?.name || "Retailer"}
              </span>
              <span
                className="block text-[10px] font-medium tracking-widest uppercase"
                style={{ color: "var(--sf-teal)", opacity: 0.7 }}
              >
                Retailer Portal
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="hidden md:block h-7 mr-6" style={{ width: "1px", backgroundColor: "var(--sf-divider)" }} />

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(48,184,191,0.12) 0%, rgba(38,96,160,0.08) 100%)"
                      : "none",
                    border: isActive ? "1px solid rgba(48,184,191,0.18)" : "1px solid transparent",
                    color: isActive ? "var(--sf-text-primary)" : "var(--sf-text-muted)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notification bell */}
            <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-xl"
                  style={{ color: "var(--sf-text-secondary)" }}
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold animate-pulse"
                      style={{ backgroundColor: "#ef4444", color: "#fff", boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[380px] p-0 border-0 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  maxHeight: "min(70vh, 500px)",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              >
                {/* Header */}
                <div className="px-5 py-4 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(135deg, rgba(48,184,191,0.06) 0%, transparent 60%)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead}
                        className="text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:bg-[rgba(48,184,191,0.08)]"
                        style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}>
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto min-h-0"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                  {loadingNotifications ? (
                    <div className="flex flex-col items-center py-14">
                      <Loader2 className="w-5 h-5 animate-spin mb-2" style={{ color: "var(--sf-teal)" }} />
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Loading...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center py-14">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                        <Bell className="w-6 h-6" style={{ color: "var(--sf-text-muted)" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--sf-text-muted)" }}>All caught up!</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)", opacity: 0.6 }}>No new notifications</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {notifications.map((notification, idx) => {
                        const cfg = NOTIFICATION_ICON[notification.type] || NOTIFICATION_ICON.system;
                        const isUnread = !notification.is_read;
                        return (
                          <button key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="w-full text-left px-4 py-3 flex gap-3 transition-all duration-150 relative group"
                            style={{
                              background: isUnread ? "rgba(48,184,191,0.03)" : "transparent",
                              borderBottom: idx < notifications.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                              cursor: "pointer", border: "none",
                              borderLeft: isUnread ? "2px solid var(--sf-teal)" : "2px solid transparent",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? "rgba(48,184,191,0.03)" : "transparent"; }}>
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-105"
                              style={{ backgroundColor: cfg.bg }}>
                              <span style={{ color: cfg.color }}>{cfg.icon}</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] truncate leading-tight"
                                  style={{ color: "var(--sf-text-primary)", fontWeight: isUnread ? 600 : 400 }}>
                                  {notification.title}
                                </p>
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--sf-teal)" }} />
                                )}
                              </div>
                              <p className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed"
                                style={{ color: "var(--sf-text-muted)" }}>
                                {notification.message}
                              </p>
                              <p className="text-[10px] mt-1.5" style={{ color: "var(--sf-text-muted)", opacity: 0.6 }}>
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => { setNotifPopoverOpen(false); setTimeout(() => navigate("/retailer/notifications"), 100); }}
                    className="w-full py-3 text-xs font-semibold text-center transition-all hover:bg-[rgba(48,184,191,0.04)]"
                    style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}>
                    View All Notifications
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="h-9 w-9 rounded-lg"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </Button>

            {/* Divider */}
            <div className="hidden sm:block h-7" style={{ width: "1px", backgroundColor: "var(--sf-divider)" }} />

            {/* User area */}
            <div className="hidden sm:flex items-center gap-3 ml-1">
              {/* Avatar circle */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--sf-teal), var(--sf-blue-primary))",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  letterSpacing: "-0.02em",
                }}
              >
                {(retailer?.name || "R").charAt(0).toUpperCase()}
              </div>
              <div className="leading-none">
                <span
                  className="block text-[13px] font-medium"
                  style={{ color: "var(--sf-text-primary)" }}
                >
                  {retailer?.name || "Retailer"}
                </span>
                <span
                  className="block text-[11px] mt-0.5"
                  style={{ color: "var(--sf-text-muted)" }}
                >
                  {retailer?.companyName || ""}
                </span>
              </div>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/retailer/login")}
              title="Logout"
              className="h-9 w-9 rounded-lg"
              style={{ color: "var(--sf-text-muted)" }}
            >
              <LogOut className="w-[18px] h-[18px]" />
            </Button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: "var(--sf-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden border-t px-4 pb-3 pt-2"
            style={{
              backgroundColor: "var(--sf-overlay-bg)",
              borderColor: "var(--sf-divider)",
            }}
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors block"
                style={{
                  background: pathname.startsWith(item.path) ? "var(--sf-bg-surface-2)" : "none",
                  border: "none",
                  color: pathname.startsWith(item.path)
                    ? "var(--sf-text-primary)"
                    : "var(--sf-text-muted)",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

