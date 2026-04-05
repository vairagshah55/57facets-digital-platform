import { useNavigate, useLocation, Outlet } from "react-router";
import { LogOut, Menu, X, LayoutDashboard, Package, Users, ShoppingCart, Layers, Bell, CheckCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { adminDashboard } from "../../../lib/adminApi";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Products", path: "/admin/products", icon: <Package className="w-4 h-4" /> },
  { label: "Orders", path: "/admin/orders", icon: <ShoppingCart className="w-4 h-4" /> },
  { label: "Retailers", path: "/admin/retailers", icon: <Users className="w-4 h-4" /> },
  { label: "Collections", path: "/admin/collections", icon: <Layers className="w-4 h-4" /> },
];

export function AdminLayout() {
  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundColor: "var(--sf-bg-base)",
        fontFamily: "'General Sans', 'Inter', sans-serif",
      }}
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { admin } = useAdminAuth();

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] border-r shrink-0"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: "var(--sf-divider)",
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b" style={{ borderColor: "var(--sf-divider)" }}>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <path d="M16 2L28 12L16 30L4 12L16 2Z" stroke="var(--sf-blue-primary)" strokeWidth="1.5" fill="none" />
          <path d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z" stroke="var(--sf-blue-primary)" strokeWidth="1.5" fill="none" opacity="0.5" />
        </svg>
        <div>
          <p className="text-sm font-semibold" style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}>
            57Facets
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--sf-blue-secondary)" }}>
            Admin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
              style={{
                backgroundColor: active ? "var(--sf-bg-surface-2)" : "transparent",
                color: active ? "var(--sf-text-primary)" : "var(--sf-text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ color: active ? "var(--sf-blue-primary)" : "var(--sf-text-muted)" }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Admin info */}
      <div className="p-4 border-t" style={{ borderColor: "var(--sf-divider)" }}>
        <p className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>
          {admin?.name || "Admin"}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--sf-text-muted)" }}>
          {admin?.email}
        </p>
      </div>
    </aside>
  );
}

function AdminTopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminDashboard.notifications().then((d: any) => {
      setNotifs(d.notifications || []);
      setUnread(d.unreadCount || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    try {
      await adminDashboard.markNotificationRead(id);
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnread((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await adminDashboard.markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markRead(n.id);
    if (n.action_path) { navigate(n.action_path); setNotifOpen(false); }
  };

  const timeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 sm:px-6 border-b"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        {/* Mobile menu */}
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "var(--sf-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Page title */}
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}>
          {NAV_ITEMS.find((i) => pathname.startsWith(i.path))?.label || "Admin"}
        </h1>

        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <Button variant="ghost" size="icon" className="relative"
              style={{ color: "var(--sf-text-secondary)" }}
              onClick={() => setNotifOpen(!notifOpen)}>
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: "#ef4444", color: "#fff", lineHeight: 1 }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl overflow-hidden z-50"
                style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] font-medium"
                      style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}>
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>
                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--sf-text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>No notifications</p>
                    </div>
                  ) : notifs.map((n) => (
                    <button key={n.id} onClick={() => handleNotifClick(n)}
                      className="w-full text-left px-4 py-3 transition-colors hover:bg-[rgba(48,184,191,0.04)]"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: n.is_read ? "none" : "rgba(48,184,191,0.03)",
                        cursor: "pointer", border: "none",
                      }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--sf-text-primary)", fontWeight: n.is_read ? 400 : 600 }}>
                            {n.title}
                          </p>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--sf-text-muted)" }}>
                            {n.message}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--sf-text-muted)" }}>{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: "var(--sf-teal)" }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => { navigate("/admin/notifications"); setNotifOpen(false); }}
                  className="w-full py-2.5 text-xs font-semibold text-center"
                  style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer", borderTop: "1px solid var(--sf-divider)" }}>
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => { logout(); navigate("/admin/login"); }}
            style={{ color: "var(--sf-text-secondary)" }}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div
          className="lg:hidden border-b px-4 pb-3 pt-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
              style={{
                backgroundColor: pathname.startsWith(item.path) ? "var(--sf-bg-surface-2)" : "transparent",
                color: pathname.startsWith(item.path) ? "var(--sf-text-primary)" : "var(--sf-text-muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
