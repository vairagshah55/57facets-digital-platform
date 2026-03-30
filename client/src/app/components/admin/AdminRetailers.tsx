import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Upload,
  Eye,
  Bell,
  Power,
  PowerOff,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  ShoppingCart,
  Heart,
  Package,
  Clock,
  Monitor,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Checkbox } from "../ui/checkbox";
import { adminRetailers } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Retailer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  business_name: string;
  company_name: string;
  city: string;
  state: string;
  tier: "standard" | "silver" | "gold" | "platinum";
  is_active: boolean;
  order_count: number;
  last_active: string;
  created_at: string;
};

type RetailerDetail = Retailer & {
  orders: OrderItem[];
  wishlist: WishlistItem[];
  loginHistory: LoginHistoryItem[];
  recentlyViewed: RecentlyViewedItem[];
  activeSessions: SessionItem[];
  stats: {
    total_orders: number;
    total_spent: number;
    wishlist_count: number;
    products_viewed: number;
  };
};

type OrderItem = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  item_count: number;
  created_at: string;
};

type WishlistItem = {
  id: string;
  product_name: string;
  product_sku: string;
  added_at: string;
};

type LoginHistoryItem = {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  success: boolean;
};

type RecentlyViewedItem = {
  id: string;
  product_name: string;
  product_sku: string;
  viewed_at: string;
};

type SessionItem = {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
};

type CsvImportResult = {
  imported: number;
  skipped: number;
  total: number;
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

const TIERS = ["standard", "silver", "gold", "platinum"] as const;

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  standard: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  silver: { bg: "rgba(192,192,192,0.15)", text: "#c0c0c0" },
  gold: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  platinum: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
};

const NOTIFICATION_TYPES = [
  "announcement",
  "order-update",
  "new-collection",
  "system",
] as const;

function formatPrice(n: number) {
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

function formatDate(d: string) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "--";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function tierBadge(tier: string) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.standard;
  return (
    <Badge
      className="text-[10px] h-5 capitalize"
      style={{ backgroundColor: colors.bg, color: colors.text, border: "none" }}
    >
      {tier}
    </Badge>
  );
}

function statusBadge(active: boolean) {
  return active ? (
    <Badge
      className="text-[10px] h-5"
      style={{
        backgroundColor: "rgba(34,197,94,0.15)",
        color: "#22c55e",
        border: "none",
      }}
    >
      Active
    </Badge>
  ) : (
    <Badge
      className="text-[10px] h-5"
      style={{
        backgroundColor: "rgba(194,23,59,0.15)",
        color: "var(--destructive)",
        border: "none",
      }}
    >
      Inactive
    </Badge>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminRetailers() {
  /* ── List state ─────────────────────────────────── */
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── Dialog states ──────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [bulkNotifyOpen, setBulkNotifyOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  /* ── Detail state ───────────────────────────────── */
  const [detail, setDetail] = useState<RetailerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Fetch retailers ────────────────────────────── */
  const fetchRetailers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (search.trim()) params.search = search.trim();
      if (tierFilter !== "all") params.tier = tierFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const data = await adminRetailers.list(params);
      setRetailers(data.retailers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch retailers:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, tierFilter, statusFilter]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  /* Reset page when filters change */
  useEffect(() => {
    setPage(1);
  }, [search, tierFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Selection helpers ──────────────────────────── */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === retailers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(retailers.map((r) => r.id)));
    }
  }

  /* ── View detail ────────────────────────────────── */
  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await adminRetailers.detail(id);
      setDetail(data);
    } catch (err) {
      console.error("Failed to fetch retailer detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  /* ── Toggle active ──────────────────────────────── */
  async function toggleActive(id: string, currentlyActive: boolean) {
    try {
      if (currentlyActive) {
        await adminRetailers.deactivate(id);
      } else {
        await adminRetailers.activate(id);
      }
      fetchRetailers();
      if (detail && detail.id === id) {
        setDetail({ ...detail, is_active: !currentlyActive });
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }

  /* ── Force logout ───────────────────────────────── */
  async function handleForceLogout(id: string) {
    try {
      await adminRetailers.forceLogout(id);
      if (detail && detail.id === id) {
        setDetail({ ...detail, activeSessions: [] });
      }
    } catch (err) {
      console.error("Failed to force logout:", err);
    }
  }

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--sf-text-primary)" }}
          >
            Retailer Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {total} total retailer{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            style={{
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
            onClick={() => setCsvOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            style={{
              backgroundColor: "var(--sf-teal)",
              color: "#fff",
            }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Retailer
          </Button>
        </div>
      </motion.div>

      {/* ── Filters ─────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.05 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--sf-text-muted)" }}
          />
          <Input
            placeholder="Search by name, phone, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-primary)",
            }}
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger
            className="w-[140px] h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent
            style={{
              backgroundColor: "var(--sf-bg-surface-2)",
              borderColor: "var(--sf-divider)",
            }}
          >
            <SelectItem value="all">All Tiers</SelectItem>
            {TIERS.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[140px] h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent
            style={{
              backgroundColor: "var(--sf-bg-surface-2)",
              borderColor: "var(--sf-divider)",
            }}
          >
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 ml-auto"
            style={{
              borderColor: "var(--sf-blue-primary)",
              color: "var(--sf-blue-primary)",
            }}
            onClick={() => setBulkNotifyOpen(true)}
          >
            <Bell className="w-3.5 h-3.5" />
            Notify Selected ({selectedIds.size})
          </Button>
        )}
      </motion.div>

      {/* ── Table ───────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.1 }}
      >
        <Card
          className="border-[var(--sf-divider)] overflow-hidden"
          style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
        >
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: "var(--sf-blue-primary)" }}
                />
              </div>
            ) : retailers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Users
                  className="w-10 h-10"
                  style={{ color: "var(--sf-text-muted)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "var(--sf-text-muted)" }}
                >
                  No retailers found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow
                    style={{ borderColor: "var(--sf-divider)" }}
                  >
                    <TableHead
                      className="w-10"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      <Checkbox
                        checked={
                          retailers.length > 0 &&
                          selectedIds.size === retailers.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Name
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Phone
                    </TableHead>
                    <TableHead
                      className="hidden md:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Business
                    </TableHead>
                    <TableHead
                      className="hidden lg:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      City
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Tier
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Status
                    </TableHead>
                    <TableHead
                      className="hidden sm:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Orders
                    </TableHead>
                    <TableHead
                      className="hidden lg:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Last Active
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {retailers.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-[var(--sf-bg-surface-2)]"
                        style={{ borderColor: "var(--sf-divider)" }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sf-text-primary)" }}
                          >
                            {r.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-secondary)" }}
                          >
                            {r.phone}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-secondary)" }}
                          >
                            {r.business_name || r.company_name || "--"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            {r.city || "--"}
                          </span>
                        </TableCell>
                        <TableCell>{tierBadge(r.tier)}</TableCell>
                        <TableCell>{statusBadge(r.is_active)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sf-text-primary)" }}
                          >
                            {r.order_count ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className="text-xs"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            {formatRelativeTime(r.last_active)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View details"
                              onClick={() => openDetail(r.id)}
                            >
                              <Eye
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--sf-blue-primary)" }}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={
                                r.is_active ? "Deactivate" : "Activate"
                              }
                              onClick={() =>
                                toggleActive(r.id, r.is_active)
                              }
                            >
                              {r.is_active ? (
                                <PowerOff
                                  className="w-3.5 h-3.5"
                                  style={{ color: "var(--destructive)" }}
                                />
                              ) : (
                                <Power
                                  className="w-3.5 h-3.5"
                                  style={{ color: "#22c55e" }}
                                />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>

          {/* Pagination */}
          {!loading && retailers.length > 0 && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: "var(--sf-divider)" }}
            >
              <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                Showing {(page - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft
                    className="w-4 h-4"
                    style={{ color: "var(--sf-text-secondary)" }}
                  />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <Button
                      key={p}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-xs"
                      style={{
                        backgroundColor:
                          p === page
                            ? "var(--sf-bg-surface-2)"
                            : "transparent",
                        color:
                          p === page
                            ? "var(--sf-text-primary)"
                            : "var(--sf-text-muted)",
                      }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: "var(--sf-text-secondary)" }}
                  />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ══════════════════════════════════════════════
         DIALOGS
         ══════════════════════════════════════════════ */}

      {/* ── Create Retailer Dialog ────────────────── */}
      <CreateRetailerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          fetchRetailers();
        }}
      />

      {/* ── Retailer Detail Dialog ────────────────── */}
      <RetailerDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detail={detail}
        loading={detailLoading}
        onToggleActive={() => {
          if (detail) toggleActive(detail.id, detail.is_active);
        }}
        onForceLogout={() => {
          if (detail) handleForceLogout(detail.id);
        }}
        onNotify={() => setNotifyOpen(true)}
      />

      {/* ── Send Notification Dialog (single) ─────── */}
      <NotificationDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        retailerId={detail?.id || null}
        retailerName={detail?.name || ""}
      />

      {/* ── Send Notification Dialog (bulk) ───────── */}
      <BulkNotificationDialog
        open={bulkNotifyOpen}
        onOpenChange={setBulkNotifyOpen}
        selectedIds={Array.from(selectedIds)}
        onSent={() => {
          setBulkNotifyOpen(false);
          setSelectedIds(new Set());
        }}
      />

      {/* ── CSV Import Dialog ─────────────────────── */}
      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => {
          setCsvOpen(false);
          fetchRetailers();
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CREATE RETAILER DIALOG
   ═══════════════════════════════════════════════════════ */

function CreateRetailerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    business_name: "",
    company_name: "",
    city: "",
    state: "",
    tier: "standard",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setForm({
      name: "",
      phone: "",
      email: "",
      business_name: "",
      company_name: "",
      city: "",
      state: "",
      tier: "standard",
    });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminRetailers.create(form);
      resetForm();
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create retailer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
            Create Retailer
          </DialogTitle>
          <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
            Add a new retailer to the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Name *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Full name"
            />
            <FieldInput
              label="Phone *"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="+91..."
            />
          </div>
          <FieldInput
            label="Email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="email@example.com"
            type="email"
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Business Name"
              value={form.business_name}
              onChange={(v) => setForm({ ...form, business_name: v })}
              placeholder="Business name"
            />
            <FieldInput
              label="Company Name"
              value={form.company_name}
              onChange={(v) => setForm({ ...form, company_name: v })}
              placeholder="Company name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="City"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
              placeholder="City"
            />
            <FieldInput
              label="State"
              value={form.state}
              onChange={(v) => setForm({ ...form, state: v })}
              placeholder="State"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Tier
            </label>
            <Select
              value={form.tier}
              onValueChange={(v) => setForm({ ...form, tier: v })}
            >
              <SelectTrigger
                className="h-9"
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-text-primary)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                }}
              >
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              style={{
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-secondary)",
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   RETAILER DETAIL DIALOG
   ═══════════════════════════════════════════════════════ */

function RetailerDetailDialog({
  open,
  onOpenChange,
  detail,
  loading,
  onToggleActive,
  onForceLogout,
  onNotify,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: RetailerDetail | null;
  loading: boolean;
  onToggleActive: () => void;
  onForceLogout: () => void;
  onNotify: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        {loading || !detail ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "var(--sf-blue-primary)" }}
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle
                    className="text-lg"
                    style={{ color: "var(--sf-text-primary)" }}
                  >
                    {detail.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1 space-x-2">
                    <span style={{ color: "var(--sf-text-secondary)" }}>
                      {detail.phone}
                    </span>
                    {detail.email && (
                      <>
                        <span style={{ color: "var(--sf-text-muted)" }}>
                          |
                        </span>
                        <span style={{ color: "var(--sf-text-secondary)" }}>
                          {detail.email}
                        </span>
                      </>
                    )}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    {tierBadge(detail.tier)}
                    {statusBadge(detail.is_active)}
                    {detail.business_name && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--sf-text-muted)" }}
                      >
                        {detail.business_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                style={{
                  borderColor: detail.is_active
                    ? "var(--destructive)"
                    : "#22c55e",
                  color: detail.is_active ? "var(--destructive)" : "#22c55e",
                }}
                onClick={onToggleActive}
              >
                {detail.is_active ? (
                  <PowerOff className="w-3 h-3" />
                ) : (
                  <Power className="w-3 h-3" />
                )}
                {detail.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                style={{
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-text-secondary)",
                }}
                onClick={onForceLogout}
              >
                <LogOut className="w-3 h-3" />
                Force Logout
                {detail.activeSessions?.length > 0 && (
                  <Badge
                    className="text-[9px] h-4 ml-1"
                    style={{
                      backgroundColor: "rgba(245,158,11,0.15)",
                      color: "#f59e0b",
                      border: "none",
                    }}
                  >
                    {detail.activeSessions.length}
                  </Badge>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                style={{
                  borderColor: "var(--sf-blue-primary)",
                  color: "var(--sf-blue-primary)",
                }}
                onClick={onNotify}
              >
                <Bell className="w-3 h-3" />
                Send Notification
              </Button>
            </div>

            <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat
                icon={<ShoppingCart className="w-4 h-4" />}
                label="Total Orders"
                value={String(detail.stats?.total_orders ?? 0)}
                color="var(--sf-teal)"
              />
              <MiniStat
                icon={<Package className="w-4 h-4" />}
                label="Total Spent"
                value={formatPrice(detail.stats?.total_spent ?? 0)}
                color="var(--sf-blue-primary)"
              />
              <MiniStat
                icon={<Heart className="w-4 h-4" />}
                label="Shortlist"
                value={String(detail.stats?.wishlist_count ?? 0)}
                color="#ef4444"
              />
              <MiniStat
                icon={<Eye className="w-4 h-4" />}
                label="Viewed"
                value={String(detail.stats?.products_viewed ?? 0)}
                color="#a855f7"
              />
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="orders" className="h-full flex flex-col">
                <TabsList
                  className="w-full"
                  style={{
                    backgroundColor: "var(--sf-bg-surface-2)",
                  }}
                >
                  <TabsTrigger
                    value="orders"
                    className="text-xs gap-1"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="wishlist"
                    className="text-xs gap-1"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <Heart className="w-3 h-3" />
                    Shortlist
                  </TabsTrigger>
                  <TabsTrigger
                    value="logins"
                    className="text-xs gap-1"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <Clock className="w-3 h-3" />
                    Logins
                  </TabsTrigger>
                  <TabsTrigger
                    value="viewed"
                    className="text-xs gap-1"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <Eye className="w-3 h-3" />
                    Viewed
                  </TabsTrigger>
                </TabsList>

                {/* Orders tab */}
                <TabsContent value="orders" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[220px]">
                    {(!detail.orders || detail.orders.length === 0) ? (
                      <EmptyTab message="No orders yet" />
                    ) : (
                      <div className="space-y-1">
                        {detail.orders.map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-[var(--sf-bg-surface-2)]"
                          >
                            <div>
                              <p
                                className="text-xs font-medium"
                                style={{ color: "var(--sf-text-primary)" }}
                              >
                                {o.order_number}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--sf-text-muted)" }}
                              >
                                {formatDateTime(o.created_at)} &middot;{" "}
                                {o.item_count} item{o.item_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <OrderStatusBadge status={o.status} />
                              <span
                                className="text-xs font-semibold"
                                style={{ color: "var(--sf-teal)" }}
                              >
                                {formatPrice(o.total)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Wishlist tab */}
                <TabsContent value="wishlist" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[220px]">
                    {(!detail.wishlist || detail.wishlist.length === 0) ? (
                      <EmptyTab message="Shortlist is empty" />
                    ) : (
                      <div className="space-y-1">
                        {detail.wishlist.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-[var(--sf-bg-surface-2)]"
                          >
                            <div>
                              <p
                                className="text-xs font-medium"
                                style={{ color: "var(--sf-text-primary)" }}
                              >
                                {w.product_name}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--sf-text-muted)" }}
                              >
                                {w.product_sku}
                              </p>
                            </div>
                            <span
                              className="text-[10px]"
                              style={{ color: "var(--sf-text-muted)" }}
                            >
                              {formatRelativeTime(w.added_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Login History tab */}
                <TabsContent value="logins" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[220px]">
                    {(!detail.loginHistory || detail.loginHistory.length === 0) ? (
                      <EmptyTab message="No login history" />
                    ) : (
                      <div className="space-y-1">
                        {detail.loginHistory.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-[var(--sf-bg-surface-2)]"
                          >
                            <div>
                              <p
                                className="text-xs font-medium flex items-center gap-1.5"
                                style={{ color: "var(--sf-text-primary)" }}
                              >
                                <Monitor className="w-3 h-3" style={{ color: "var(--sf-text-muted)" }} />
                                {l.ip_address}
                              </p>
                              <p
                                className="text-[10px] truncate max-w-[280px]"
                                style={{ color: "var(--sf-text-muted)" }}
                              >
                                {l.user_agent}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {l.success ? (
                                <CheckCircle2
                                  className="w-3 h-3"
                                  style={{ color: "#22c55e" }}
                                />
                              ) : (
                                <AlertCircle
                                  className="w-3 h-3"
                                  style={{ color: "var(--destructive)" }}
                                />
                              )}
                              <span
                                className="text-[10px]"
                                style={{ color: "var(--sf-text-muted)" }}
                              >
                                {formatRelativeTime(l.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Recently Viewed tab */}
                <TabsContent value="viewed" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[220px]">
                    {(!detail.recentlyViewed || detail.recentlyViewed.length === 0) ? (
                      <EmptyTab message="No recently viewed products" />
                    ) : (
                      <div className="space-y-1">
                        {detail.recentlyViewed.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-[var(--sf-bg-surface-2)]"
                          >
                            <div>
                              <p
                                className="text-xs font-medium"
                                style={{ color: "var(--sf-text-primary)" }}
                              >
                                {v.product_name}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--sf-text-muted)" }}
                              >
                                {v.product_sku}
                              </p>
                            </div>
                            <span
                              className="text-[10px]"
                              style={{ color: "var(--sf-text-muted)" }}
                            >
                              {formatRelativeTime(v.viewed_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   NOTIFICATION DIALOG (SINGLE)
   ═══════════════════════════════════════════════════════ */

function NotificationDialog({
  open,
  onOpenChange,
  retailerId,
  retailerName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  retailerId: string | null;
  retailerName: string;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("announcement");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function reset() {
    setTitle("");
    setMessage("");
    setType("announcement");
    setError("");
    setSuccess(false);
  }

  async function handleSend() {
    if (!retailerId || !title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await adminRetailers.notify(retailerId, title.trim(), message.trim(), type);
      setSuccess(true);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
            Send Notification
          </DialogTitle>
          <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
            Send a notification to {retailerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FieldInput
            label="Title *"
            value={title}
            onChange={setTitle}
            placeholder="Notification title"
          />
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Message *
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={3}
              style={{
                backgroundColor: "var(--sf-bg-surface-2)",
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                className="h-9"
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-text-primary)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                }}
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs flex items-center gap-1" style={{ color: "#22c55e" }}>
              <CheckCircle2 className="w-3 h-3" />
              Notification sent successfully.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            style={{
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={sending || success}
            style={{ backgroundColor: "var(--sf-blue-primary)", color: "#fff" }}
            onClick={handleSend}
          >
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   BULK NOTIFICATION DIALOG
   ═══════════════════════════════════════════════════════ */

function BulkNotificationDialog({
  open,
  onOpenChange,
  selectedIds,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("announcement");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function reset() {
    setTitle("");
    setMessage("");
    setType("announcement");
    setError("");
    setSuccess(false);
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await adminRetailers.notifyBulk(
        selectedIds,
        title.trim(),
        message.trim(),
        type
      );
      setSuccess(true);
      setTimeout(() => {
        reset();
        onSent();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to send notifications.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
            Notify Selected Retailers
          </DialogTitle>
          <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
            Send a notification to {selectedIds.length} selected retailer
            {selectedIds.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <FieldInput
            label="Title *"
            value={title}
            onChange={setTitle}
            placeholder="Notification title"
          />
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Message *
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={3}
              style={{
                backgroundColor: "var(--sf-bg-surface-2)",
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-primary)",
              }}
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                className="h-9"
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-text-primary)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                }}
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs flex items-center gap-1" style={{ color: "#22c55e" }}>
              <CheckCircle2 className="w-3 h-3" />
              Notifications sent successfully.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            style={{
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={sending || success}
            style={{ backgroundColor: "var(--sf-blue-primary)", color: "#fff" }}
            onClick={handleSend}
          >
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            Send to {selectedIds.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   CSV IMPORT DIALOG
   ═══════════════════════════════════════════════════════ */

function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CsvImportResult | null>(null);

  function reset() {
    setFile(null);
    setError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const data = await adminRetailers.importCsv(file);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Import failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          if (result) onImported();
          reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: "var(--sf-bg-surface-1)",
          borderColor: "var(--sf-divider)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
            Import Retailers from CSV
          </DialogTitle>
          <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
            Upload a CSV file to bulk-import retailers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expected format */}
          <div
            className="rounded-md p-3"
            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
          >
            <p
              className="text-xs font-medium mb-1.5"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Expected CSV columns:
            </p>
            <code
              className="text-[11px] block"
              style={{ color: "var(--sf-teal)" }}
            >
              name, phone, email, business_name, city, state, tier
            </code>
            <p
              className="text-[10px] mt-1.5"
              style={{ color: "var(--sf-text-muted)" }}
            >
              First row should be the header. name and phone are required.
            </p>
          </div>

          {/* File input */}
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: "var(--sf-text-secondary)" }}
            >
              Select File
            </label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                  setError("");
                }}
                className="flex-1"
                style={{
                  backgroundColor: "var(--sf-bg-surface-2)",
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-text-primary)",
                }}
              />
            </div>
            {file && (
              <p
                className="text-[10px] mt-1 flex items-center gap-1"
                style={{ color: "var(--sf-text-muted)" }}
              >
                <FileText className="w-3 h-3" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md p-3 space-y-1"
              style={{ backgroundColor: "rgba(34,197,94,0.08)" }}
            >
              <p
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: "#22c55e" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Import Complete
              </p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center">
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#22c55e" }}
                  >
                    {result.imported}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--sf-text-muted)" }}
                  >
                    Imported
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#f59e0b" }}
                  >
                    {result.skipped}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--sf-text-muted)" }}
                  >
                    Skipped
                  </p>
                </div>
                <div className="text-center">
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "var(--sf-text-primary)" }}
                  >
                    {result.total}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--sf-text-muted)" }}
                  >
                    Total
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (result) onImported();
              reset();
              onOpenChange(false);
            }}
            style={{
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button
              size="sm"
              disabled={uploading || !file}
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
              onClick={handleImport}
            >
              {uploading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              )}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        className="text-xs font-medium block mb-1"
        style={{ color: "var(--sf-text-secondary)" }}
      >
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
        style={{
          backgroundColor: "var(--sf-bg-surface-2)",
          borderColor: "var(--sf-divider)",
          color: "var(--sf-text-primary)",
        }}
      />
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--sf-text-primary)" }}
          >
            {value}
          </p>
          <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    pending: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
    confirmed: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
    processing: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
    shipped: { bg: "rgba(48,184,191,0.15)", text: "var(--sf-teal)" },
    delivered: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    cancelled: { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)" },
  };
  const c = colorMap[status] || colorMap.pending;
  return (
    <Badge
      className="text-[10px] h-5 capitalize"
      style={{ backgroundColor: c.bg, color: c.text, border: "none" }}
    >
      {status}
    </Badge>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-1">
      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
        {message}
      </p>
    </div>
  );
}
