import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Eye, ChevronLeft, ChevronRight, Loader2, ShoppingCart,
  Package, Truck, CheckCircle2, XCircle, Clock,
  User, Phone, Mail, FileText, ToggleLeft, ToggleRight,
  History, ChevronDown as ChevronDownIcon, ArrowRightLeft,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle,
} from "../ui/sheet";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "../ui/table";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { adminOrders } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES & CONSTANTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

type OrderListItem = {
  id: string; order_number: string; status: string; total: number;
  note: string | null; created_at: string; updated_at: string;
  retailer_name: string; retailer_company: string | null; retailer_phone: string | null;
  item_count: number;
};

type OrderDetail = OrderListItem & {
  retailer_email: string | null;
  items: OrderItem[];
  tracking: TrackingEntry[];
  edit_allowed: boolean;
  edit_allowed_at: string | null;
  edit_allowed_by: string | null;
  edit_note: string | null;
  edit_logs_count: number;
};

type EditLog = {
  id: string;
  order_id: string;
  retailer_id: string;
  retailer_name: string;
  edited_at: string;
  old_items: (OrderItem & { quantity: number; note: string | null })[];
  old_note: string | null;
  old_total: number;
  new_items: (OrderItem & { quantity: number; note: string | null })[];
  new_note: string | null;
  new_total: number;
};

type OrderItem = {
  id: string; product_id: string; quantity: number; unit_price: number;
  carat: number | null; metal_type: string | null; gold_colour: string | null;
  diamond_shape: string | null; diamond_shade: string | null; diamond_quality: string | null;
  color_stone_name: string | null; color_stone_quality: string | null; note: string | null;
  name: string; sku: string; image: string | null; category: string | null;
};

type TrackingEntry = { status: string; detail: string | null; created_at: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed:  { label: "Confirmed",  color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  processing: { label: "Processing", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <Package className="w-3.5 h-3.5" /> },
  shipped:    { label: "Shipped",    color: "#06b6d4", bg: "rgba(6,182,212,0.12)",  icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:  { label: "Delivered",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled:  { label: "Cancelled",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: <XCircle className="w-3.5 h-3.5" /> },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const PAGE_SIZE = 15;

function formatPrice(n: number) { return "\u20B9" + Number(n).toLocaleString("en-IN"); }
function formatDate(d: string) { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatDateTime(d: string) { return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge className="text-[10px] h-5 gap-1 capitalize" style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none" }}>
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN COMPONENT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summary, setSummary] = useState<Record<string, number>>({});

  // Detail sheet
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Status update
  const [updating, setUpdating] = useState(false);
  const [statusDetail, setStatusDetail] = useState("");

  // Allow-edit
  const [editNote, setEditNote]         = useState("");
  const [allowingEdit, setAllowingEdit] = useState(false);
  const [editLogs, setEditLogs]         = useState<EditLog[]>([]);
  const [logsOpen, setLogsOpen]         = useState(false);

  /* Fetch orders */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await adminOrders.list(params);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setSummary(data.summary || {});
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /*  Open detail */
  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    setStatusDetail("");
    setEditNote("");
    setEditLogs([]);
    setLogsOpen(false);
    try {
      const [data, logs] = await Promise.all([
        adminOrders.detail(id),
        adminOrders.getEditLogs(id).catch(() => []),
      ]);
      setDetailOrder(data);
      setEditLogs(logs || []);
    } catch { /* silent */ } finally { setDetailLoading(false); }
  }

  /* Allow / revoke edit */
  async function handleAllowEdit() {
    if (!detailOrder || allowingEdit) return;
    setAllowingEdit(true);
    try {
      await adminOrders.allowEdit(detailOrder.id, editNote || undefined);
      const data = await adminOrders.detail(detailOrder.id);
      setDetailOrder(data);
      setEditNote("");
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setAllowingEdit(false); }
  }

  async function handleRevokeEdit() {
    if (!detailOrder || allowingEdit) return;
    setAllowingEdit(true);
    try {
      await adminOrders.revokeEdit(detailOrder.id);
      const data = await adminOrders.detail(detailOrder.id);
      setDetailOrder(data);
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setAllowingEdit(false); }
  }

  /* Update status */
  async function handleUpdateStatus(newStatus: string) {
    if (!detailOrder || updating) return;
    setUpdating(true);
    try {
      await adminOrders.updateStatus(detailOrder.id, newStatus, statusDetail || undefined);
      // Refresh detail & list
      const data = await adminOrders.detail(detailOrder.id);
      setDetailOrder(data);
      setStatusDetail("");
      fetchOrders();
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    } finally { setUpdating(false); }
  }



  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
            Order Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{total} total order{total !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* â”€â”€ Summary Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}
        className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = summary[key] || 0;
          const active = statusFilter === key;
          return (
            <button key={key} onClick={() => setStatusFilter(active ? "all" : key)}
              className="rounded-xl p-3 text-center transition-all border cursor-pointer"
              style={{
                backgroundColor: active ? cfg.bg : "var(--sf-bg-surface-1)",
                borderColor: active ? cfg.color : "var(--sf-divider)",
              }}>
              <p className="text-lg font-bold" style={{ color: active ? cfg.color : "var(--sf-text-primary)" }}>{count}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: active ? cfg.color : "var(--sf-text-muted)" }}>{cfg.label}</p>
            </button>
          );
        })}
      </motion.div>

      {/* â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
          <Input placeholder="Search order # or retailer..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 text-sm" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }} />
        </div>
      </motion.div>

      {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}
        className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingCart className="w-10 h-10" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>No orders found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "var(--sf-divider)" }}>
                {["Order #", "Retailer", "Items", "Total", "Status", "Date", ""].map((h) => (
                  <TableHead key={h} className="text-xs font-semibold" style={{ color: "var(--sf-text-muted)" }}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderColor: "var(--sf-divider)" }} onClick={() => openDetail(o.id)}>
                  <TableCell className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>{o.order_number}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>{o.retailer_name}</p>
                    {o.retailer_company && <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{o.retailer_company}</p>}
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{o.item_count}</TableCell>
                  <TableCell className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{formatPrice(o.total)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{formatDate(o.created_at)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={(e) => { e.stopPropagation(); openDetail(o.id); }}>
                      <Eye className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            Page {page} of {totalPages} ({total} orders)
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)} style={{ borderColor: "var(--sf-divider)" }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)} style={{ borderColor: "var(--sf-divider)" }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* â”€â”€ Order Detail Sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
            setDetailOrder(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-none sm:w-[760px] sm:max-w-[94vw] md:w-[820px] p-0 gap-0 flex flex-col h-full overflow-hidden [&>button]:hidden"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <SheetTitle className="sr-only">
            {detailOrder ? `Order details ${detailOrder.order_number}` : "Order details"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            View full order details, update status, and manage retailer edit access.
          </SheetDescription>

          {detailLoading || !detailOrder ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
            </div>
          ) : (
            <>
              <div
                className="h-[3px] w-full shrink-0"
                style={{ backgroundColor: (STATUS_CONFIG[detailOrder.status] || STATUS_CONFIG.pending).color }}
              />

              <div className="px-6 py-5 shrink-0" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className="text-2xl font-medium leading-tight"
                      style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}
                    >
                      {detailOrder.order_number}
                    </h2>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <StatusBadge status={detailOrder.status} />
                      <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                        Placed {formatDateTime(detailOrder.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sf-text-muted)" }}>
                      Order Total
                    </p>
                    <p className="text-xl font-semibold leading-tight mt-0.5" style={{ color: "var(--sf-teal)" }}>
                      {formatPrice(detailOrder.total)}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                      {detailOrder.items.length} item{detailOrder.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 [&_[data-slot=scroll-area-scrollbar]]:p-0.5 [&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:w-1.5 [&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:h-1.5 [&_[data-slot=scroll-area-thumb]]:rounded-full [&_[data-slot=scroll-area-thumb]]:bg-[var(--sf-divider)] [&_[data-slot=scroll-area-thumb]]:opacity-70">
                <div className="px-6 py-5 space-y-5">
                  <div
                    className="rounded-2xl p-4 flex items-start gap-3 border"
                    style={{
                      background: "linear-gradient(120deg, rgba(48,184,191,0.08), transparent 60%)",
                      borderColor: "var(--sf-divider)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(48,184,191,0.12)" }}
                    >
                      <User className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                        {detailOrder.retailer_name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                        {detailOrder.retailer_company && <span>{detailOrder.retailer_company}</span>}
                        {detailOrder.retailer_phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{detailOrder.retailer_phone}</span>
                        )}
                        {detailOrder.retailer_email && (
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{detailOrder.retailer_email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <section className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--sf-text-muted)" }}>
                      Items ({detailOrder.items.length})
                    </p>
                    <div className="space-y-2">
                      {detailOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-3 p-3 rounded-2xl border"
                          style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
                            {item.image ? (
                              <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5" style={{ color: "var(--sf-text-muted)" }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>{item.name}</p>
                            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                              {item.sku} {item.category ? `· ${item.category}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                item.metal_type,
                                item.gold_colour,
                                item.carat && `${item.carat} ct`,
                                item.diamond_shape,
                                item.diamond_shade,
                                item.diamond_quality,
                                item.color_stone_name,
                                item.color_stone_quality,
                              ]
                                .filter(Boolean)
                                .map((tag, i) => (
                                  <span
                                    key={`${item.id}-tag-${i}`}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ backgroundColor: "rgba(48,184,191,0.08)", color: "var(--sf-teal)" }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{formatPrice(item.unit_price)}</p>
                            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                      style={{
                        background: "linear-gradient(to right, rgba(48,184,191,0.1), transparent)",
                        border: "1px solid var(--sf-teal-border)",
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                        Order Total
                      </span>
                      <span className="text-lg font-semibold" style={{ color: "var(--sf-teal)" }}>
                        {formatPrice(detailOrder.total)}
                      </span>
                    </div>
                  </section>

                  {detailOrder.note && (
                    <div className="rounded-2xl p-4 flex gap-2.5 border" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
                      <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                      <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{detailOrder.note}</p>
                    </div>
                  )}

                  {detailOrder.tracking.length > 0 && (
                    <section>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--sf-text-muted)" }}>
                        Tracking
                      </p>
                      <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}>
                        {detailOrder.tracking.map((t, i) => (
                          <div key={`${t.created_at}-${i}`} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                                style={{ backgroundColor: i === detailOrder.tracking.length - 1 ? "var(--sf-teal)" : "var(--sf-divider)" }}
                              />
                              {i < detailOrder.tracking.length - 1 && (
                                <div className="w-px flex-1 my-1.5" style={{ backgroundColor: "var(--sf-divider)" }} />
                              )}
                            </div>
                            <div className="pb-3">
                              <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>{t.status}</p>
                              {t.detail && <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{t.detail}</p>}
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{formatDateTime(t.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {(VALID_TRANSITIONS[detailOrder.status] || []).length > 0 && (
                    <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--sf-text-muted)" }}>
                        Update Status
                      </p>
                      <Textarea
                        placeholder="Add a note for this status change (optional)..."
                        value={statusDetail}
                        onChange={(e) => setStatusDetail(e.target.value)}
                        className="min-h-[64px] text-sm"
                        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {(VALID_TRANSITIONS[detailOrder.status] || []).map((s) => {
                          const cfg = STATUS_CONFIG[s];
                          return (
                            <Button
                              key={s}
                              size="sm"
                              className="gap-1.5"
                              disabled={updating}
                              onClick={() => handleUpdateStatus(s)}
                              style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                            >
                              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cfg.icon}
                              {cfg.label}
                            </Button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--sf-text-muted)" }}>
                          Allow Retailer Edit
                        </p>
                      </div>
                      {detailOrder.edit_allowed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                          Edit Enabled
                        </span>
                      )}
                    </div>

                    {!detailOrder.edit_allowed ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Optional note to retailer about what to change..."
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="min-h-[64px] text-sm"
                          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                        />
                        <Button
                          size="sm"
                          disabled={allowingEdit}
                          onClick={handleAllowEdit}
                          className="gap-1.5"
                          style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
                        >
                          {allowingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ToggleRight className="w-3.5 h-3.5" />}
                          Allow Edit
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl p-3 flex items-start justify-between gap-3" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium" style={{ color: "#22c55e" }}>
                            Edit access granted to retailer
                          </p>
                          {detailOrder.edit_note && (
                            <p className="text-[11px]" style={{ color: "var(--sf-text-secondary)" }}>
                              Note: {detailOrder.edit_note}
                            </p>
                          )}
                          {detailOrder.edit_allowed_at && (
                            <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                              Granted {formatDateTime(detailOrder.edit_allowed_at)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={allowingEdit}
                          onClick={handleRevokeEdit}
                          className="gap-1.5 shrink-0"
                          style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                        >
                          {allowingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          Revoke
                        </Button>
                      </div>
                    )}
                  </section>

                  {editLogs.length > 0 && (
                    <section className="rounded-2xl border p-4" style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}>
                      <button
                        onClick={() => setLogsOpen((v) => !v)}
                        className="flex items-center gap-2 w-full mb-2"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <History className="w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
                        <p className="text-xs font-semibold uppercase tracking-wider flex-1 text-left" style={{ color: "var(--sf-text-muted)" }}>
                          Edit History ({editLogs.length})
                        </p>
                        <ChevronDownIcon
                          className="w-3.5 h-3.5 transition-transform"
                          style={{ color: "var(--sf-text-muted)", transform: logsOpen ? "rotate(180deg)" : "rotate(0)" }}
                        />
                      </button>

                      <AnimatePresence>
                        {logsOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3 overflow-hidden"
                          >
                            {editLogs.map((log, li) => (
                              <div key={log.id} className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--sf-divider)" }}>
                                <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
                                  <span className="text-[11px] font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                                    Edit #{editLogs.length - li} by {log.retailer_name}
                                  </span>
                                  <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                                    {formatDateTime(log.edited_at)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--sf-divider)" }}>
                                  <div className="p-3 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>Before</p>
                                    {(log.old_items || []).map((item: any, i: number) => (
                                      <div key={`old-${log.id}-${i}`} className="flex items-center justify-between">
                                        <span className="text-[11px] truncate pr-2" style={{ color: "var(--sf-text-secondary)" }}>
                                          {item.name || `Item ${i + 1}`}
                                        </span>
                                        <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--sf-text-muted)" }}>
                                          x{item.quantity}
                                        </span>
                                      </div>
                                    ))}
                                    {log.old_note && (
                                      <p className="text-[10px] italic" style={{ color: "var(--sf-text-muted)" }}>
                                        Note: {log.old_note}
                                      </p>
                                    )}
                                    <p className="text-xs font-semibold pt-1" style={{ color: "var(--sf-text-secondary)", borderTop: "1px solid var(--sf-divider)" }}>
                                      {formatPrice(log.old_total)}
                                    </p>
                                  </div>

                                  <div className="p-3 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#22c55e" }}>After</p>
                                    {(log.new_items || []).map((item: any, i: number) => {
                                      const oldQty = log.old_items?.[i]?.quantity;
                                      const changed = oldQty !== item.quantity;
                                      return (
                                        <div key={`new-${log.id}-${i}`} className="flex items-center justify-between">
                                          <span className="text-[11px] truncate pr-2" style={{ color: "var(--sf-text-secondary)" }}>
                                            {item.name || `Item ${i + 1}`}
                                          </span>
                                          <span className="text-[11px] font-medium shrink-0" style={{ color: changed ? "#22c55e" : "var(--sf-text-muted)" }}>
                                            x{item.quantity}
                                            {changed && <span className="ml-1 text-[9px]">(was x{oldQty})</span>}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {log.new_note && (
                                      <p className="text-[10px] italic" style={{ color: "var(--sf-text-muted)" }}>
                                        Note: {log.new_note}
                                      </p>
                                    )}
                                    <p className="text-xs font-semibold pt-1" style={{ color: "var(--sf-teal)", borderTop: "1px solid var(--sf-divider)" }}>
                                      {formatPrice(log.new_total)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  )}

                  <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
                </div>
              </ScrollArea>

              <div
                className="px-6 py-3.5 shrink-0 flex items-center justify-between gap-3"
                style={{
                  borderTop: "1px solid var(--sf-divider)",
                  backgroundColor: "var(--sf-glass-bg)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
              >
                <span className="text-[11px] font-mono" style={{ color: "var(--sf-text-muted)" }}>
                  {detailOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <SheetClose asChild>
                  <Button variant="ghost" size="sm" style={{ color: "var(--sf-text-secondary)" }}>
                    Close
                  </Button>
                </SheetClose>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

