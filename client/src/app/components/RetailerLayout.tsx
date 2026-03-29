import { useNavigate, useLocation, Outlet } from "react-router";
import {
  Bell,
  LogOut,
  Search,
  Menu,
  X,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Layers,
  Megaphone,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover";

/* ═══════════════════════════════════════════════════════
   NOTIFICATION TYPES & MOCK DATA
   ═══════════════════════════════════════════════════════ */

type NotificationType = "order-update" | "new-collection" | "announcement" | "system";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionPath?: string;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "order-update",
    title: "Order Shipped",
    message: "ORD-2026-0318 has been dispatched via BlueDart",
    time: "2 hours ago",
    read: false,
    actionPath: "/retailer/orders",
  },
  {
    id: "n2",
    type: "new-collection",
    title: "New Collection: Spring Bloom 2026",
    message: "A fresh collection with pastel gemstones is now available",
    time: "5 hours ago",
    read: false,
    actionPath: "/retailer/collections",
  },
  {
    id: "n3",
    type: "order-update",
    title: "Order Confirmed",
    message: "ORD-2026-0305 payment verified and confirmed",
    time: "1 day ago",
    read: false,
    actionPath: "/retailer/orders",
  },
  {
    id: "n4",
    type: "announcement",
    title: "Special Discount: 15% Off Bulk Orders",
    message: "Valid on orders of 5+ items until April 10",
    time: "2 days ago",
    read: true,
  },
  {
    id: "n5",
    type: "order-update",
    title: "Order Delivered",
    message: "ORD-2026-0312 has been delivered successfully",
    time: "3 days ago",
    read: true,
    actionPath: "/retailer/orders",
  },
  {
    id: "n6",
    type: "new-collection",
    title: "Summer Radiance 2026 Launching Soon",
    message: "Preview the new summer collection before it drops Apr 1",
    time: "4 days ago",
    read: true,
    actionPath: "/retailer/collections",
  },
  {
    id: "n7",
    type: "system",
    title: "Welcome to 57Facets Retailer Portal",
    message: "Your account has been set up. Start browsing the catalog!",
    time: "1 week ago",
    read: true,
    actionPath: "/retailer/catalog",
  },
];

const NOTIFICATION_ICON: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  "order-update": { icon: <Truck className="w-4 h-4" />, color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  "new-collection": { icon: <Sparkles className="w-4 h-4" />, color: "var(--sf-teal)", bg: "rgba(48,184,191,0.15)" },
  announcement: { icon: <Megaphone className="w-4 h-4" />, color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  system: { icon: <Bell className="w-4 h-4" />, color: "var(--sf-blue-secondary)", bg: "rgba(56,128,190,0.15)" },
};

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
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--sf-bg-base)",
        fontFamily: "'General Sans', 'Inter', sans-serif",
      }}
    >
      <RetailerHeader />
      <Outlet />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════ */

function RetailerHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      markAsRead(notification.id);
      if (notification.actionPath) {
        navigate(notification.actionPath);
      }
    },
    [markAsRead, navigate]
  );

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          backgroundColor: "rgba(8, 10, 13, 0.85)",
          borderColor: "var(--sf-divider)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer shrink-0"
            style={{ background: "none", border: "none" }}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 2L28 12L16 30L4 12L16 2Z"
                stroke="var(--sf-teal)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z"
                stroke="var(--sf-teal)"
                strokeWidth="1.5"
                fill="none"
                opacity="0.5"
              />
            </svg>
            <span
              className="text-lg font-semibold hidden sm:inline"
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                color: "var(--sf-text-primary)",
              }}
            >
              57Facets
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 ml-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: pathname.startsWith(item.path) ? "var(--sf-bg-surface-2)" : "none",
                  border: "none",
                  color: pathname.startsWith(item.path)
                    ? "var(--sf-text-primary)"
                    : "var(--sf-text-muted)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm mx-4 hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--sf-text-muted)" }}
            />
            <Input
              placeholder="Search..."
              className="pl-10 h-9 border-[var(--sf-divider)]"
              style={{
                backgroundColor: "var(--sf-bg-surface-2)",
                color: "var(--sf-text-primary)",
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Notification bell with popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  style={{ color: "var(--sf-text-secondary)" }}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: "var(--sf-teal)",
                        color: "var(--sf-bg-base)",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[380px] p-0 border"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  borderColor: "var(--sf-divider)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--sf-text-primary)" }}
                    >
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <Badge
                        className="text-[10px] h-5 px-1.5"
                        style={{
                          backgroundColor: "var(--sf-teal)",
                          color: "var(--sf-bg-base)",
                          border: "none",
                        }}
                      >
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs flex items-center gap-1"
                      style={{
                        color: "var(--sf-teal)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Check className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                {/* Notification list */}
                <ScrollArea className="max-h-[400px]">
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-10">
                        <Bell
                          className="w-8 h-8 mb-2"
                          style={{ color: "var(--sf-text-muted)" }}
                        />
                        <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                          No notifications
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/retailer/login")}
              style={{ color: "var(--sf-text-secondary)" }}
            >
              <LogOut className="w-5 h-5" />
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
              backgroundColor: "rgba(8, 10, 13, 0.95)",
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

/* ═══════════════════════════════════════════════════════
   NOTIFICATION ITEM
   ═══════════════════════════════════════════════════════ */

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const cfg = NOTIFICATION_ICON[notification.type];

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-[var(--sf-bg-surface-2)]"
      style={{
        background: notification.read ? "none" : "rgba(48, 184, 191, 0.04)",
        border: "none",
        cursor: "pointer",
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm truncate"
            style={{
              color: "var(--sf-text-primary)",
              fontWeight: notification.read ? 400 : 600,
            }}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: "var(--sf-teal)" }}
            />
          )}
        </div>
        <p
          className="text-xs mt-0.5 line-clamp-2"
          style={{ color: "var(--sf-text-secondary)" }}
        >
          {notification.message}
        </p>
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--sf-text-muted)" }}
        >
          {notification.time}
        </p>
      </div>
    </button>
  );
}
