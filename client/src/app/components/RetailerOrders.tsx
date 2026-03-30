import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Search,
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronRight,
  ChevronDown,
  StickyNote,
  CalendarDays,
  ShoppingCart,
  Filter,
  Eye,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";

import { orders as ordersApi } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

type OrderItem = {
  id: string;
  name: string;
  image: string | null;
  category: string;
  carat: number;
  metal: string;
  quantity: number;
  unitPrice: number;
  priceLabel: string;
};

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  note: string;
  created_at: string;
  item_count: number;
  items?: OrderItem[];
  trackingUpdates?: { date: string; status: string; detail: string }[];
};

type StatusTab = "all" | OrderStatus;

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%23181a1f'%3E%3Crect width='80' height='80'/%3E%3C/svg%3E";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: "Confirmed", color: "var(--sf-blue-secondary)", bg: "rgba(56,128,190,0.15)", icon: <CheckCircle2 className="w-4 h-4" /> },
  processing: { label: "Processing", color: "var(--sf-teal)", bg: "rgba(48,184,191,0.15)", icon: <Package className="w-4 h-4" /> },
  shipped: { label: "Shipped", color: "#a855f7", bg: "rgba(168,85,247,0.15)", icon: <Truck className="w-4 h-4" /> },
  delivered: { label: "Delivered", color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", color: "var(--destructive)", bg: "rgba(194,23,59,0.15)", icon: <XCircle className="w-4 h-4" /> },
};

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function formatPrice(price: number): string {
  return "₹" + price.toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Data
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});

  // Detail dialog
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New order dialog
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderNote, setNewOrderNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch orders on mount and when filter/search change
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (activeTab !== "all") params.status = activeTab;
        if (search.trim()) params.search = search.trim();
        const data = await ordersApi.list(params);
        if (!cancelled) {
          setOrdersList(Array.isArray(data) ? data : data.orders ?? []);
          if (data.summary) {
            const s: Record<string, number> = { all: data.total ?? 0 };
            Object.entries(data.summary).forEach(([k, v]) => { s[k] = v as number; });
            setSummary(s);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [activeTab, search]);

  // Fetch order detail
  const openDetail = useCallback(async (order: Order) => {
    setDetailOrder(order);
    setDetailLoading(true);
    try {
      const data = await ordersApi.detail(order.id);
      setDetailOrder(data);
    } catch {
      // keep the summary-level order in the dialog
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Create order
  const handleCreateOrder = useCallback(async () => {
    setCreating(true);
    try {
      await ordersApi.create([], newOrderNote || undefined);
      setNewOrderOpen(false);
      setNewOrderNote("");
      // Re-fetch orders
      const data = await ordersApi.list({});
      setOrdersList(Array.isArray(data) ? data : data.orders ?? []);
      if (data.summary) {
        const s: Record<string, number> = { all: data.total ?? 0 };
        Object.entries(data.summary).forEach(([k, v]) => { s[k] = v as number; });
        setSummary(s);
      }
    } catch {
      alert("Failed to create order. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [newOrderNote]);

  // Summary counts derived from API summary or from local data
  const counts = useMemo(() => {
    if (Object.keys(summary).length > 0) return summary;
    const c: Record<string, number> = { all: ordersList.length };
    for (const o of ordersList) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [summary, ordersList]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* -- New Order Button */}
        <div className="flex justify-end mb-6">
          <Button
            className="h-9 text-xs gap-1.5"
            style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
            onClick={() => { setNewOrderNote(""); setNewOrderOpen(true); }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            New Order
          </Button>
        </div>

        {/* -- Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {STATUS_TABS.map((tab) => {
            const isAll = tab.key === "all";
            const cfg = isAll ? null : STATUS_CONFIG[tab.key as OrderStatus];
            return (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.key)}
                className="p-3 rounded-xl border text-center transition-all"
                style={{
                  backgroundColor:
                    activeTab === tab.key ? "var(--sf-bg-surface-2)" : "var(--sf-bg-surface-1)",
                  borderColor:
                    activeTab === tab.key
                      ? cfg?.color || "var(--sf-teal)"
                      : "var(--sf-divider)",
                  cursor: "pointer",
                }}
              >
                <p
                  className="text-xl sm:text-2xl font-semibold"
                  style={{ color: cfg?.color || "var(--sf-text-primary)" }}
                >
                  {counts[tab.key] || 0}
                </p>
                <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                  {tab.label}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* -- Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--sf-text-muted)" }}
            />
            <Input
              placeholder="Search by order ID or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-[var(--sf-divider)]"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                color: "var(--sf-text-primary)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* -- Order List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--sf-teal)" }} />
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>Loading orders...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-lg font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
              Failed to load orders
            </p>
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>{error}</p>
          </div>
        ) : ordersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)" }} />
            <p className="text-lg font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
              No orders found
            </p>
            <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
              {activeTab !== "all" ? "Try a different status filter" : "Place your first order from the catalog"}
            </p>
            <Button
              className="mt-4 gap-2"
              style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
              onClick={() => navigate("/retailer/catalog")}
            >
              Browse Catalog <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ordersList.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                index={i}
                expanded={expandedOrder === order.id}
                onToggle={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
                onViewDetail={() => openDetail(order)}
                onReorder={() => navigate("/retailer/catalog")}
              />
            ))}
          </div>
        )}
      </main>

      {/* === New Order Dialog === */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              Place New Order Request
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-secondary)" }}>
              Add items from the catalog or wishlist, then submit your order request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--sf-text-secondary)" }}>
                Special Notes / Instructions
              </label>
              <Textarea
                placeholder="E.g., delivery deadline, gift wrapping, size requirements, engraving..."
                value={newOrderNote}
                onChange={(e) => setNewOrderNote(e.target.value)}
                className="border-[var(--sf-divider)] min-h-[100px]"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              Your order request will be reviewed by the 57Facets team. You'll receive confirmation once approved.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" style={{ color: "var(--sf-text-secondary)" }}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleCreateOrder}
              disabled={creating}
              style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Submit Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Order Detail Dialog === */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh]"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          {detailOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
                    {detailOrder.order_number}
                  </DialogTitle>
                  <StatusBadge status={detailOrder.status} />
                </div>
                <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
                  Placed on {formatDate(detailOrder.created_at)}
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
                </div>
              ) : (
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-5 pr-2">
                    {/* Items table */}
                    {detailOrder.items && detailOrder.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-secondary)" }}>
                          ITEMS
                        </p>
                        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                          <Table>
                            <TableHeader>
                              <TableRow style={{ borderColor: "var(--sf-divider)" }}>
                                <TableHead className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Product</TableHead>
                                <TableHead className="text-xs text-right" style={{ color: "var(--sf-text-muted)" }}>Qty</TableHead>
                                <TableHead className="text-xs text-right" style={{ color: "var(--sf-text-muted)" }}>Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailOrder.items.map((item) => (
                                <TableRow key={item.id} style={{ borderColor: "var(--sf-divider)" }}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={item.image || PLACEHOLDER_IMAGE}
                                        alt={item.name}
                                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>
                                          {item.name}
                                        </p>
                                        <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                                          {item.category} · {item.carat} ct · {item.metal}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm" style={{ color: "var(--sf-text-primary)" }}>
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
                                    {item.priceLabel || formatPrice(item.unitPrice)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-between items-center mt-3 px-1">
                          <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                            Total
                          </span>
                          <span className="text-lg font-semibold" style={{ color: "var(--sf-teal)" }}>
                            {formatPrice(detailOrder.total)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* No items but total */}
                    {(!detailOrder.items || detailOrder.items.length === 0) && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                          Total ({detailOrder.item_count} items)
                        </span>
                        <span className="text-lg font-semibold" style={{ color: "var(--sf-teal)" }}>
                          {formatPrice(detailOrder.total)}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {detailOrder.note && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-secondary)" }}>
                          NOTES
                        </p>
                        <div
                          className="rounded-lg p-3 border"
                          style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
                        >
                          <div className="flex gap-2">
                            <StickyNote className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--sf-teal)" }} />
                            <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>
                              {detailOrder.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tracking timeline */}
                    {detailOrder.trackingUpdates && detailOrder.trackingUpdates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-3" style={{ color: "var(--sf-text-secondary)" }}>
                          ORDER TRACKING
                        </p>
                        <div className="space-y-0">
                          {detailOrder.trackingUpdates.map((update, idx) => (
                            <TrackingStep
                              key={idx}
                              update={update}
                              isLast={idx === detailOrder.trackingUpdates!.length - 1}
                              isFirst={idx === 0}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" style={{ color: "var(--sf-text-secondary)" }}>
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <Badge
      className="text-xs gap-1"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none" }}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function OrderCard({
  order,
  index,
  expanded,
  onToggle,
  onViewDetail,
  onReorder,
}: {
  order: Order;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
  onReorder: () => void;
}) {
  const cfg = STATUS_CONFIG[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.35 }}
    >
      <Card
        className="border-[var(--sf-divider)] overflow-hidden"
        style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
      >
        {/* Header row */}
        <button
          onClick={onToggle}
          className="w-full text-left p-4 sm:px-6"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              {cfg.icon}
            </div>

            {/* Order info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                  {order.order_number}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--sf-text-muted)" }}>
                  <CalendarDays className="w-3 h-3" /> {formatDate(order.created_at)}
                </span>
                <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                  {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Price + chevron */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
                {formatPrice(order.total)}
              </span>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{
                  color: "var(--sf-text-muted)",
                  transform: expanded ? "rotate(180deg)" : "rotate(0)",
                }}
              />
            </div>
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
              <div className="p-4 sm:px-6 space-y-4">
                {/* Item previews */}
                {order.items && order.items.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 shrink-0">
                        <img
                          src={item.image || PLACEHOLDER_IMAGE}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>
                            {item.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                            Qty: {item.quantity} · {item.priceLabel || formatPrice(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Note */}
                {order.note && (
                  <div
                    className="flex gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                  >
                    <StickyNote className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--sf-teal)" }} />
                    <p className="text-xs" style={{ color: "var(--sf-text-secondary)" }}>
                      {order.note}
                    </p>
                  </div>
                )}

                {/* Latest tracking */}
                {order.trackingUpdates && order.trackingUpdates.length > 0 && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                  >
                    <Truck className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>
                        {order.trackingUpdates[order.trackingUpdates.length - 1].status}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--sf-text-muted)" }}>
                        {order.trackingUpdates[order.trackingUpdates.length - 1].detail}
                      </p>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--sf-text-muted)" }}>
                      {order.trackingUpdates[order.trackingUpdates.length - 1].date}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    style={{ color: "var(--sf-teal)" }}
                    onClick={onViewDetail}
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    style={{ color: "var(--sf-text-secondary)" }}
                    onClick={onReorder}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reorder
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function TrackingStep({
  update,
  isLast,
  isFirst,
}: {
  update: { date: string; status: string; detail: string };
  isLast: boolean;
  isFirst: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center w-5">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
          style={{
            backgroundColor: isLast ? "var(--sf-teal)" : "var(--sf-text-muted)",
            boxShadow: isLast ? "0 0 8px rgba(48, 184, 191, 0.5)" : "none",
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ backgroundColor: "var(--sf-divider)" }} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
          {update.status}
        </p>
        <p className="text-xs" style={{ color: "var(--sf-text-secondary)" }}>
          {update.detail}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
          {update.date}
        </p>
      </div>
    </div>
  );
}
