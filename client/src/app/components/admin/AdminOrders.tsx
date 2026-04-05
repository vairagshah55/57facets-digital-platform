import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Eye, ChevronLeft, ChevronRight, Loader2, ShoppingCart,
  Package, Truck, CheckCircle2, XCircle, Clock, ArrowRight,
  User, Phone, Mail, FileText, X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "../ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { adminOrders } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════ */

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
};

type OrderItem = {
  id: string; product_id: string; quantity: number; unit_price: number;
  carat: number | null; metal_type: string | null; gold_colour: string | null;
  diamond_shape: string | null; diamond_shade: string | null; diamond_quality: string | null;
  color_stone_name: string | null; color_stone_quality: string | null; note: string | null;
  name: string; sku: string; product_code: string | null; image: string | null; category: string | null;
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

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summary, setSummary] = useState<Record<string, number>>({});

  // Detail dialog
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Status update
  const [updating, setUpdating] = useState(false);
  const [statusDetail, setStatusDetail] = useState("");

  /* ── Fetch orders ──────────────────────────────── */
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

  /* ── Open detail ───────────────────────────────── */
  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    setStatusDetail("");
    try {
      const data = await adminOrders.detail(id);
      setDetailOrder(data);
    } catch { /* silent */ } finally { setDetailLoading(false); }
  }

  /* ── Update status ─────────────────────────────── */
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

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

      {/* ── Header ────────────────────────────────── */}
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
            Order Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{total} total order{total !== 1 ? "s" : ""}</p>
        </div>
      </motion.div>

      {/* ── Summary Cards ─────────────────────────── */}
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

      {/* ── Search ────────────────────────────────── */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
          <Input placeholder="Search order # or retailer…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 text-sm" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }} />
        </div>
      </motion.div>

      {/* ── Table ─────────────────────────────────── */}
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

      {/* ── Pagination ────────────────────────────── */}
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

      {/* ── Order Detail Dialog ───────────────────── */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) setDetailOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          {detailLoading || !detailOrder ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
                  <div className="flex items-center justify-between">
                    <span>{detailOrder.order_number}</span>
                    <StatusBadge status={detailOrder.status} />
                  </div>
                </DialogTitle>
                <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
                  Placed on {formatDateTime(detailOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              {/* Retailer Info */}
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(48,184,191,0.1)" }}>
                  <User className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{detailOrder.retailer_name}</p>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                    {detailOrder.retailer_company && <span>{detailOrder.retailer_company}</span>}
                    {detailOrder.retailer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{detailOrder.retailer_phone}</span>}
                    {detailOrder.retailer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{detailOrder.retailer_email}</span>}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-muted)" }}>
                  ITEMS ({detailOrder.items.length})
                </p>
                <div className="space-y-2">
                  {detailOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: "var(--sf-bg-surface-1)" }}>
                        {item.image ? (
                          <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5" style={{ color: "var(--sf-text-muted)" }} />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>{item.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                          {item.sku} {item.category && `· ${item.category}`}
                        </p>
                        {/* Customization tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            item.metal_type, item.gold_colour, item.carat && `${item.carat} ct`,
                            item.diamond_shape, item.diamond_shade, item.diamond_quality,
                            item.color_stone_name, item.color_stone_quality,
                          ].filter(Boolean).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: "rgba(48,184,191,0.08)", color: "var(--sf-teal)" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{formatPrice(item.unit_price)}</p>
                        <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--sf-text-secondary)" }}>Order Total</span>
                  <span className="text-base font-bold" style={{ color: "var(--sf-teal)" }}>{formatPrice(detailOrder.total)}</span>
                </div>
              </div>

              {/* Note */}
              {detailOrder.note && (
                <div className="rounded-xl p-3 flex gap-2" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                  <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{detailOrder.note}</p>
                </div>
              )}

              {/* Tracking Timeline */}
              {detailOrder.tracking.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-muted)" }}>TRACKING</p>
                  <div className="space-y-0">
                    {detailOrder.tracking.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: i === detailOrder.tracking.length - 1 ? "var(--sf-teal)" : "var(--sf-divider)" }} />
                          {i < detailOrder.tracking.length - 1 && <div className="w-px flex-1 my-1" style={{ backgroundColor: "var(--sf-divider)" }} />}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>{t.status}</p>
                          {t.detail && <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{t.detail}</p>}
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{formatDateTime(t.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

              {/* Status Update */}
              {(VALID_TRANSITIONS[detailOrder.status] || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-muted)" }}>UPDATE STATUS</p>
                  <Textarea placeholder="Add a note for this status change (optional)…"
                    value={statusDetail} onChange={(e) => setStatusDetail(e.target.value)}
                    className="mb-3 min-h-[60px] text-sm"
                    style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }} />
                  <div className="flex gap-2">
                    {(VALID_TRANSITIONS[detailOrder.status] || []).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <Button key={s} size="sm" className="gap-1.5" disabled={updating}
                          onClick={() => handleUpdateStatus(s)}
                          style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cfg.icon}
                          {cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
