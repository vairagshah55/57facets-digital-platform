import { useNavigate, useLocation, Outlet } from "react-router";
import {
  LogOut, Menu, X, LayoutDashboard, Package, Users,
  ShoppingCart, Layers, Bell, CheckCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { adminDashboard } from "../../../lib/adminApi";

/* ─── Constants ──────────────────────────────────── */

const SIDEBAR_EXPANDED  = 260;
const SIDEBAR_COLLAPSED = 68;

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/admin/dashboard",    icon: LayoutDashboard, color: "var(--sf-teal)" },
  { label: "Products",    path: "/admin/products",     icon: Package,         color: "#a855f7"         },
  { label: "Orders",      path: "/admin/orders",       icon: ShoppingCart,    color: "#3b82f6"         },
  { label: "Retailers",   path: "/admin/retailers",    icon: Users,           color: "#22c55e"         },
  { label: "Collections", path: "/admin/collections",  icon: Layers,          color: "#f59e0b"         },
];

const spring = { type: "spring" as const, stiffness: 280, damping: 28 };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

/* ═══════════════════════════════════════════════════
   ROOT LAYOUT
   ═══════════════════════════════════════════════════ */

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState<boolean>(() => {
    try { return localStorage.getItem("sf_sidebar") === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sf_sidebar", collapsed ? "1" : "0"); } catch { /* noop */ }
  }, [collapsed]);

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--sf-bg-base)", fontFamily: "'General Sans','Inter',sans-serif" }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0 relative" style={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED, transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -SIDEBAR_EXPANDED - 20 }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_EXPANDED - 20 }}
              transition={spring}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              style={{ width: SIDEBAR_EXPANDED }}
            >
              <AdminSidebar collapsed={false} mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar onMenuClick={() => setMobileOpen(true)} collapsed={collapsed} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════ */

function AdminSidebar({
  collapsed = false,
  onToggle,
  mobile,
  onClose,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { admin }    = useAdminAuth();

  function go(path: string) {
    navigate(path);
    onClose?.();
  }

  return (
    <motion.aside
      animate={{ width: mobile ? SIDEBAR_EXPANDED : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      transition={spring}
      className="flex flex-col h-full border-r overflow-hidden relative"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: "var(--sf-divider)",
        minHeight: "100vh",
      }}
    >
      {/* ── Brand ───────────────────────────────────── */}
      <div
        className="h-16 flex items-center shrink-0 px-4"
        style={{ borderBottom: "1px solid var(--sf-divider)" }}
      >
        {/* Diamond icon — always visible */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg,rgba(48,184,191,0.22),rgba(38,96,160,0.22))",
            border: "1px solid rgba(48,184,191,0.25)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28 12L16 30L4 12L16 2Z" stroke="var(--sf-teal)" strokeWidth="1.5" fill="none" />
            <path d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z" stroke="var(--sf-teal)" strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
        </div>

        {/* Brand text — fades out when collapsed */}
        <motion.div
          animate={{ opacity: collapsed && !mobile ? 0 : 1, width: collapsed && !mobile ? 0 : "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden whitespace-nowrap ml-3"
        >
          <p
            className="text-sm font-bold leading-tight"
            style={{ fontFamily: "'Melodrama','Georgia',serif", color: "var(--sf-text-primary)" }}
          >
            57Facets
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--sf-teal)" }}>
            Admin Console
          </p>
        </motion.div>

        {/* Mobile close */}
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden" style={{ padding: collapsed && !mobile ? "12px 10px" : "12px" }}>

        {/* Section label */}
        <motion.p
          animate={{ opacity: collapsed && !mobile ? 0 : 1, height: collapsed && !mobile ? 0 : "auto" }}
          transition={{ duration: 0.15 }}
          className="text-[9px] font-bold uppercase tracking-widest px-3 pb-2 overflow-hidden"
          style={{ color: "var(--sf-text-muted)" }}
        >
          Navigation
        </motion.p>

        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.path);
            const Icon   = item.icon;

            return (
              <div key={item.path} className="relative group/nav">
                <button
                  onClick={() => go(item.path)}
                  className="w-full flex items-center rounded-xl text-sm font-medium text-left transition-colors relative"
                  style={{
                    gap: collapsed && !mobile ? 0 : 10,
                    padding: collapsed && !mobile ? "10px 10px" : "10px 12px",
                    justifyContent: collapsed && !mobile ? "center" : "flex-start",
                    background: active
                      ? "linear-gradient(90deg,rgba(48,184,191,0.11) 0%,rgba(48,184,191,0.03) 100%)"
                      : "transparent",
                    color: active ? "var(--sf-text-primary)" : "var(--sf-text-muted)",
                    border: "none", cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  {/* Active left accent bar */}
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        key="bar"
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        exit={{ scaleY: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full origin-center"
                        style={{ backgroundColor: "var(--sf-teal)" }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon pill */}
                  <motion.span
                    animate={{
                      backgroundColor: active ? `${item.color}1a` : "transparent",
                      color:           active ? item.color : "var(--sf-text-muted)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
                  >
                    <Icon />
                  </motion.span>

                  {/* Label */}
                  <motion.span
                    animate={{ opacity: collapsed && !mobile ? 0 : 1, width: collapsed && !mobile ? 0 : "auto" }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>

                  {/* Chevron */}
                  {!collapsed && active && (
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-40" style={{ color: "var(--sf-teal)" }} />
                  )}
                </button>

                {/* Floating tooltip — only when collapsed desktop */}
                {collapsed && !mobile && (
                  <div
                    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150"
                    style={{
                      backgroundColor: "var(--sf-bg-surface-3)",
                      color: "var(--sf-text-primary)",
                      border: "1px solid var(--sf-divider)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                    }}
                  >
                    {/* Arrow */}
                    <span
                      className="absolute right-full top-1/2 -translate-y-1/2"
                      style={{
                        borderRight: "5px solid var(--sf-bg-surface-3)",
                        borderTop: "5px solid transparent",
                        borderBottom: "5px solid transparent",
                        width: 0, height: 0, display: "block",
                      }}
                    />
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Footer ──────────────────────────────────── */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ borderTop: "1px solid var(--sf-divider)", padding: collapsed && !mobile ? "12px 10px" : "12px" }}
      >
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            gap: collapsed && !mobile ? 0 : 10,
            padding: collapsed && !mobile ? "8px" : "10px 12px",
            justifyContent: collapsed && !mobile ? "center" : "flex-start",
          }}
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg,var(--sf-teal),var(--sf-blue-primary))", color: "#fff" }}
          >
            {initials(admin?.name || "Admin")}
          </div>

          {/* Name + email */}
          <motion.div
            animate={{ opacity: collapsed && !mobile ? 0 : 1, width: collapsed && !mobile ? 0 : "auto" }}
            transition={{ duration: 0.18 }}
            className="flex-1 min-w-0 overflow-hidden"
          >
            <p className="text-xs font-semibold truncate whitespace-nowrap" style={{ color: "var(--sf-text-primary)" }}>
              {admin?.name || "Admin"}
            </p>
            <p className="text-[10px] truncate whitespace-nowrap" style={{ color: "var(--sf-text-muted)" }}>
              {admin?.email}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Collapse toggle tab ──────────────────────── */}
      {!mobile && (
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-[22px] -right-3 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            border: "1px solid var(--sf-divider)",
            color: "var(--sf-text-muted)",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
          onMouseEnter={e => {
            (e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-3)");
            (e.currentTarget.style.color = "var(--sf-teal)");
            (e.currentTarget.style.borderColor = "rgba(48,184,191,0.4)");
          }}
          onMouseLeave={e => {
            (e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-2)");
            (e.currentTarget.style.color = "var(--sf-text-muted)");
            (e.currentTarget.style.borderColor = "var(--sf-divider)");
          }}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={spring}
          >
            <ChevronRight className="w-3 h-3" />
          </motion.div>
        </button>
      )}
    </motion.aside>
  );
}

/* ═══════════════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════════════ */

function AdminTopBar({ onMenuClick, collapsed }: { onMenuClick: () => void; collapsed: boolean }) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { logout }   = useAdminAuth();

  const [notifs, setNotifs]       = useState<any[]>([]);
  const [unread, setUnread]       = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminDashboard.notifications()
      .then((d: any) => { setNotifs(d.notifications || []); setUnread(d.unreadCount || 0); })
      .catch(() => {});
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
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await adminDashboard.markAllNotificationsRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markRead(n.id);
    if (n.action_path) { navigate(n.action_path); setNotifOpen(false); }
  };

  const timeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60)    return "just now";
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const currentPage = NAV_ITEMS.find(i => pathname.startsWith(i.path));

  return (
    <header
      className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderBottom: "1px solid var(--sf-divider)" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center"
          onClick={onMenuClick}
          style={{ color: "var(--sf-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-2)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Page breadcrumb */}
        {currentPage && (
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5"
              style={{ backgroundColor: `${currentPage.color}1a`, color: currentPage.color }}
            >
              <currentPage.icon />
            </span>
            <h1 className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
              {currentPage.label}
            </h1>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              color: "var(--sf-text-secondary)",
              backgroundColor: notifOpen ? "var(--sf-bg-surface-2)" : "transparent",
              border: "none", cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-2)")}
            onMouseLeave={e => { if (!notifOpen) (e.currentTarget.style.backgroundColor = "transparent"); }}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold"
                style={{ backgroundColor: "#ef4444", color: "#fff", lineHeight: 1 }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl overflow-hidden z-50"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  borderColor: "var(--sf-divider)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Notifications</span>
                    {unread > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                        {unread} new
                      </span>
                    )}
                  </div>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium"
                      style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}>
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                        <Bell className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                      </div>
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>All caught up</p>
                    </div>
                  ) : notifs.map((n) => (
                    <button key={n.id} onClick={() => handleNotifClick(n)}
                      className="w-full text-left px-4 py-3"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", backgroundColor: n.is_read ? "transparent" : "rgba(48,184,191,0.03)", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(48,184,191,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = n.is_read ? "transparent" : "rgba(48,184,191,0.03)")}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: n.is_read ? "transparent" : "var(--sf-teal)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--sf-text-primary)", fontWeight: n.is_read ? 400 : 600 }}>{n.title}</p>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--sf-text-muted)" }}>{n.message}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--sf-text-muted)" }}>{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { navigate("/admin/notifications"); setNotifOpen(false); }}
                  className="w-full py-2.5 text-xs font-semibold text-center"
                  style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer", borderTop: "1px solid var(--sf-divider)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(48,184,191,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  View all notifications
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate("/admin/login"); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          title="Sign out"
          style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => { (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"); (e.currentTarget.style.color = "#ef4444"); }}
          onMouseLeave={e => { (e.currentTarget.style.backgroundColor = "transparent"); (e.currentTarget.style.color = "var(--sf-text-muted)"); }}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
