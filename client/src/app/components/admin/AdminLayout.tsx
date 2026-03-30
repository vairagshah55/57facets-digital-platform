import { useNavigate, useLocation, Outlet } from "react-router";
import { LogOut, Menu, X, LayoutDashboard, Package, Users, ShoppingCart, Layers, Settings, Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { useAdminAuth } from "../../../context/AdminAuthContext";

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
          <Button variant="ghost" size="icon" className="relative" style={{ color: "var(--sf-text-secondary)" }}>
            <Bell className="w-5 h-5" />
          </Button>
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
