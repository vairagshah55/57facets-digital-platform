import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { toast } from "sonner";
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
  ShoppingBag,
  Eye,
  RotateCcw,
  Loader2,
  Pencil,
  AlertCircle,
  Minus,
  Plus,
  Sparkles,
  TrendingUp,
  IndianRupee,
  Filter,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/app/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";

import { orders as ordersApi, products as productsApi } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

type OrderItem = {
  id: string;
  productId?: string | null;
  note?: string | null;
  name: string;
  image: string | null;
  category: string;
  carat: number;
  metal: string;
  quantity: number;
  unitPrice: number;
  priceLabel: string;
  goldColour?: string | null;
  diamondShape?: string | null;
  diamondShade?: string | null;
  diamondQuality?: string | null;
  colorStoneName?: string | null;
  colorStoneQuality?: string | null;
  caratOptions?: number[];
  metalOptions?: string[];
  goldColourOptions?: string[];
  diamondShapeOptions?: string[];
  diamondShadeOptions?: string[];
  diamondQualityOptions?: string[];
  colorStoneNameOptions?: string[];
  colorStoneQualityOptions?: string[];
};

type EditableOrderItem = {
  id?: string;
  productId: string;
  quantity: number;
  note: string;
  name: string;
  image: string | null;
  category: string;
  carat: number;
  metal: string;
  unitPrice: number;
  goldColour?: string | null;
  diamondShape?: string | null;
  diamondShade?: string | null;
  diamondQuality?: string | null;
  colorStoneName?: string | null;
  colorStoneQuality?: string | null;
  caratOptions?: number[];
  metalOptions?: string[];
  goldColourOptions?: string[];
  diamondShapeOptions?: string[];
  diamondShadeOptions?: string[];
  diamondQualityOptions?: string[];
  colorStoneNameOptions?: string[];
  colorStoneQualityOptions?: string[];
  isNew?: boolean;
};

type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  category: string;
  basePrice: number;
  carat: number;
  metalType: string;
  diamondShape: string | null;
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
  edit_allowed?: boolean;
  edit_allowed_at?: string | null;
  edit_note?: string | null;
};

type StatusTab = "all" | OrderStatus;

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%23181a1f'%3E%3Crect width='80' height='80'/%3E%3C/svg%3E";

// 57Facets support WhatsApp number
const SUPPORT_WHATSAPP = "919952222385";

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped"];

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string; glow: string; icon: React.ReactNode }
> = {
  pending:    { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.09)", border: "rgba(245,158,11,0.28)", glow: "rgba(245,158,11,0.14)",   icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed:  { label: "Confirmed",  color: "var(--sf-blue-secondary)", bg: "rgba(56,128,190,0.09)", border: "rgba(56,128,190,0.28)", glow: "rgba(56,128,190,0.14)",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  processing: { label: "Processing", color: "var(--sf-teal)", bg: "rgba(48,184,191,0.09)", border: "rgba(48,184,191,0.28)", glow: "rgba(48,184,191,0.14)",   icon: <Package className="w-3.5 h-3.5" /> },
  shipped:    { label: "Shipped",    color: "#a855f7", bg: "rgba(168,85,247,0.09)", border: "rgba(168,85,247,0.28)", glow: "rgba(168,85,247,0.14)",   icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:  { label: "Delivered",  color: "#22c55e", bg: "rgba(34,197,94,0.09)",  border: "rgba(34,197,94,0.28)",  glow: "rgba(34,197,94,0.14)",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled:  { label: "Cancelled",  color: "#c2173b", bg: "rgba(194,23,59,0.09)",  border: "rgba(194,23,59,0.28)",  glow: "rgba(194,23,59,0.14)",    icon: <XCircle className="w-3.5 h-3.5" /> },
};

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all",        label: "All Orders" },
  { key: "pending",    label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped",    label: "Shipped" },
  { key: "delivered",  label: "Delivered" },
  { key: "cancelled",  label: "Cancelled" },
];

// Stepper steps for the order tracking visual (excludes "cancelled")
const STEPPER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending",    label: "Placed" },
  { status: "confirmed",  label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped",    label: "Shipped" },
  { status: "delivered",  label: "Delivered" },
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

function parseOptionList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseCaratOptions(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  }
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) {
      return parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    }
  } catch {
    // no-op
  }
  return [];
}

function withCurrentOption(options: string[], current?: string | null): string[] {
  const clean = options.map((v) => v.trim()).filter(Boolean);
  const selected = (current || "").trim();
  if (selected && !clean.includes(selected)) clean.unshift(selected);
  return Array.from(new Set(clean));
}

function withCurrentCarat(options: number[], current?: number | null): number[] {
  const clean = options.filter((n) => Number.isFinite(n) && n > 0);
  if (Number.isFinite(current) && current! > 0 && !clean.includes(current!)) clean.unshift(current!);
  return Array.from(new Set(clean)).sort((a, b) => a - b);
}

function editItemKey(item: EditableOrderItem): string {
  return item.id ? `existing:${item.id}` : `new:${item.productId}`;
}

/* ═══════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════ */

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i * 0.06, 0.36),
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const THIN_MUTED_SCROLLBAR =
  "[&_[data-slot=scroll-area-scrollbar]]:p-0.5 " +
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:w-1.5 " +
  "[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:h-1.5 " +
  "[&_[data-slot=scroll-area-thumb]]:rounded-full " +
  "[&_[data-slot=scroll-area-thumb]]:bg-[var(--sf-divider)] " +
  "[&_[data-slot=scroll-area-thumb]]:opacity-70";

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Detail dialog
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New order dialog
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderNote, setNewOrderNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit order
  const [editMode, setEditMode]                   = useState(false);
  const [editItems, setEditItems]                 = useState<EditableOrderItem[]>([]);
  const [editOrderNote, setEditOrderNote]         = useState("");
  const [editProductSearch, setEditProductSearch] = useState("");
  const [editProductResults, setEditProductResults] = useState<CatalogProduct[]>([]);
  const [editProductLoading, setEditProductLoading] = useState(false);
  const [submittingEdit, setSubmittingEdit]       = useState(false);
  const [editSuccess, setEditSuccess]             = useState(false);
  const [pendingEdit, setPendingEdit]             = useState(false);

  // Toast dedup ref for tab changes
  const prevTabRef = useRef<StatusTab>("all");

  // ── Fetch orders ──────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (search.trim()) params.search = search.trim();
      const data = await ordersApi.list(params);
      setOrdersList(Array.isArray(data) ? data : data.orders ?? []);
      if (data.summary) {
        const s: Record<string, number> = { all: data.total ?? 0 };
        Object.entries(data.summary).forEach(([k, v]) => { s[k] = v as number; });
        setSummary(s);
      }
      if (silent) toast.success("Orders refreshed");
    } catch (err: any) {
      const msg = err.message || "Failed to load orders";
      setError(msg);
      if (silent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (activeTab !== "all") params.status = activeTab;
        if (search.trim()) params.search = search.trim();
        const data = await ordersApi.list(params);
        if (cancelled) return;
        setOrdersList(Array.isArray(data) ? data : data.orders ?? []);
        if (data.summary) {
          const s: Record<string, number> = { all: data.total ?? 0 };
          Object.entries(data.summary).forEach(([k, v]) => { s[k] = v as number; });
          setSummary(s);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeTab, search]);

  // Tab change toast
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if (activeTab !== "all") {
        toast.info(`Showing ${STATUS_CONFIG[activeTab as OrderStatus]?.label ?? activeTab} orders`);
      } else {
        toast.info("Showing all orders");
      }
    }
  }, [activeTab]);

  // ── Order detail ──────────────────────────────────────
  const openDetail = useCallback(async (order: Order) => {
    setDetailOrder(order);
    setDetailLoading(true);
    try {
      const data = await ordersApi.detail(order.id);
      const formatP = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
      setDetailOrder({
        ...data,
        items: (data.items || []).map((it: any) => ({
          id: it.id, productId: it.product_id, note: it.note || "",
          name: it.name || "Unknown", image: it.image || null,
          category: it.category || "", carat: it.carat || 0,
          metal: it.metal_type || "", quantity: it.quantity || 1,
          unitPrice: Number(it.unit_price) || 0,
          priceLabel: formatP(Number(it.unit_price) || 0),
          goldColour: it.gold_colour, diamondShape: it.diamond_shape,
          diamondShade: it.diamond_shade, diamondQuality: it.diamond_quality,
          colorStoneName: it.color_stone_name, colorStoneQuality: it.color_stone_quality,
          caratOptions: withCurrentCarat(parseCaratOptions(it.product_carat_options), Number(it.carat) || 0),
          metalOptions: withCurrentOption(parseOptionList(it.product_metal_type), it.metal_type),
          goldColourOptions: withCurrentOption(parseOptionList(it.product_gold_colour), it.gold_colour),
          diamondShapeOptions: withCurrentOption(parseOptionList(it.product_diamond_shape), it.diamond_shape),
          diamondShadeOptions: withCurrentOption(parseOptionList(it.product_diamond_color), it.diamond_shade),
          diamondQualityOptions: withCurrentOption(parseOptionList(it.product_diamond_clarity), it.diamond_quality),
          colorStoneNameOptions: withCurrentOption(parseOptionList(it.product_color_stone_name), it.color_stone_name),
          colorStoneQualityOptions: withCurrentOption(parseOptionList(it.product_color_stone_quality), it.color_stone_quality),
        })),
        trackingUpdates: (data.tracking || []).map((t: any) => ({
          status: t.status, detail: t.detail || "",
          date: new Date(t.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        })),
      });
    } catch {
      // keep summary-level data
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Auto-enter edit mode after detail loads
  useEffect(() => {
    if (!detailLoading && pendingEdit && detailOrder?.items) {
      openEditMode(detailOrder);
      setPendingEdit(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailLoading, pendingEdit, detailOrder]);

  function openDetailAndEdit(order: Order) {
    setPendingEdit(true);
    openDetail(order);
  }

  function openEditMode(order: Order) {
    setEditItems(
      (order.items || []).map((it) => ({
        id: it.id, productId: it.productId || "", quantity: it.quantity, note: it.note || "",
        name: it.name, image: it.image || null, category: it.category || "",
        carat: Number(it.carat) || 0, metal: it.metal || "",
        unitPrice: Number(it.unitPrice) || 0,
        goldColour: it.goldColour || null, diamondShape: it.diamondShape || null,
        diamondShade: it.diamondShade || null, diamondQuality: it.diamondQuality || null,
        colorStoneName: it.colorStoneName || null, colorStoneQuality: it.colorStoneQuality || null,
        caratOptions: it.caratOptions || [],
        metalOptions: it.metalOptions || [],
        goldColourOptions: it.goldColourOptions || [],
        diamondShapeOptions: it.diamondShapeOptions || [],
        diamondShadeOptions: it.diamondShadeOptions || [],
        diamondQualityOptions: it.diamondQualityOptions || [],
        colorStoneNameOptions: it.colorStoneNameOptions || [],
        colorStoneQualityOptions: it.colorStoneQualityOptions || [],
      }))
    );
    setEditOrderNote(order.note || "");
    setEditProductSearch("");
    setEditProductResults([]);
    setEditSuccess(false);
    setEditMode(true);
  }

  useEffect(() => {
    if (!editMode) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setEditProductLoading(true);
      try {
        const params: Record<string, string> = { limit: "8" };
        if (editProductSearch.trim()) params.search = editProductSearch.trim();
        const data = await productsApi.list(params);
        const rows = Array.isArray(data) ? data : data.products ?? [];
        if (!cancelled) {
          setEditProductResults(rows.map((p: any) => ({
            id: p.id, name: p.name || "Unknown", sku: p.sku || "",
            image: p.image || null, category: p.category || "",
            basePrice: Number(p.base_price) || 0, carat: Number(p.carat) || 0,
            metalType: p.metal_type || "", diamondShape: p.diamond_shape || null,
          })));
        }
      } catch {
        if (!cancelled) setEditProductResults([]);
      } finally {
        if (!cancelled) setEditProductLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [editMode, editProductSearch]);

  function addProductToEdit(product: CatalogProduct) {
    setEditItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) => it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, {
        productId: product.id, quantity: 1, note: "", name: product.name, image: product.image,
        category: product.category, carat: product.carat, metal: product.metalType,
        unitPrice: product.basePrice, diamondShape: product.diamondShape, isNew: true,
        caratOptions: withCurrentCarat([], product.carat),
        metalOptions: withCurrentOption([], product.metalType),
        diamondShapeOptions: withCurrentOption([], product.diamondShape || ""),
      }];
    });
  }

  function removeNewEditItem(productId: string) {
    setEditItems((prev) => prev.filter((item) => !(item.isNew && item.productId === productId)));
  }

  function updateEditItemField(
    rowKey: string,
    patch: Partial<Pick<EditableOrderItem, "note" | "unitPrice" | "carat" | "metal" | "goldColour" | "diamondShape" | "diamondShade" | "diamondQuality" | "colorStoneName" | "colorStoneQuality">>
  ) {
    setEditItems((prev) => prev.map((x) => (editItemKey(x) === rowKey ? { ...x, ...patch } : x)));
  }

  const editDraftTotal = useMemo(
    () => editItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [editItems]
  );

  async function submitEdit(orderId: string) {
    if (editItems.length === 0) { toast.error("Order must have at least one item."); return; }
    setSubmittingEdit(true);
    try {
      await ordersApi.update(orderId, {
        items: editItems.map((item) =>
          item.id
            ? {
                id: item.id,
                quantity: item.quantity,
                note: item.note || undefined,
                unitPrice: item.unitPrice,
                carat: item.carat,
                metalType: item.metal || undefined,
                goldColour: item.goldColour || undefined,
                diamondShape: item.diamondShape || undefined,
                diamondShade: item.diamondShade || undefined,
                diamondQuality: item.diamondQuality || undefined,
                colorStoneName: item.colorStoneName || undefined,
                colorStoneQuality: item.colorStoneQuality || undefined,
              }
            : {
                productId: item.productId, quantity: item.quantity, note: item.note || undefined,
                unitPrice: item.unitPrice, carat: item.carat, metalType: item.metal || undefined,
                goldColour: item.goldColour || undefined, diamondShape: item.diamondShape || undefined,
                diamondShade: item.diamondShade || undefined, diamondQuality: item.diamondQuality || undefined,
                colorStoneName: item.colorStoneName || undefined, colorStoneQuality: item.colorStoneQuality || undefined,
              }
        ),
        note: editOrderNote || undefined,
      });
      setEditMode(false);
      setEditSuccess(true);
      toast.success("Order updated — admin will review your changes.");
      const data = await ordersApi.detail(orderId);
      setDetailOrder((prev: any) => prev ? {
        ...prev, ...data,
        items: (data.items || []).map((it: any) => ({
          id: it.id, productId: it.product_id, note: it.note || "",
          name: it.name || "Unknown", image: it.image || null,
          category: it.category || "", carat: it.carat || 0, metal: it.metal_type || "",
          quantity: it.quantity || 1, unitPrice: Number(it.unit_price) || 0,
          priceLabel: "₹" + Number(it.unit_price).toLocaleString("en-IN"),
          goldColour: it.gold_colour, diamondShape: it.diamond_shape,
          diamondShade: it.diamond_shade, diamondQuality: it.diamond_quality,
          colorStoneName: it.color_stone_name, colorStoneQuality: it.color_stone_quality,
          caratOptions: withCurrentCarat(parseCaratOptions(it.product_carat_options), Number(it.carat) || 0),
          metalOptions: withCurrentOption(parseOptionList(it.product_metal_type), it.metal_type),
          goldColourOptions: withCurrentOption(parseOptionList(it.product_gold_colour), it.gold_colour),
          diamondShapeOptions: withCurrentOption(parseOptionList(it.product_diamond_shape), it.diamond_shape),
          diamondShadeOptions: withCurrentOption(parseOptionList(it.product_diamond_color), it.diamond_shade),
          diamondQualityOptions: withCurrentOption(parseOptionList(it.product_diamond_clarity), it.diamond_quality),
          colorStoneNameOptions: withCurrentOption(parseOptionList(it.product_color_stone_name), it.color_stone_name),
          colorStoneQualityOptions: withCurrentOption(parseOptionList(it.product_color_stone_quality), it.color_stone_quality),
        })),
        edit_allowed: false, total: data.total, note: data.note,
      } : null);
      const listData = await ordersApi.list({});
      setOrdersList(Array.isArray(listData) ? listData : listData.orders ?? []);
    } catch (e: any) {
      toast.error(e.message || "Failed to update order");
    } finally {
      setSubmittingEdit(false);
    }
  }

  const handleCreateOrder = useCallback(async () => {
    setCreating(true);
    try {
      await ordersApi.create([], newOrderNote || undefined);
      setNewOrderOpen(false);
      setNewOrderNote("");
      toast.success("Order request submitted! We'll confirm it shortly.");
      const data = await ordersApi.list({});
      setOrdersList(Array.isArray(data) ? data : data.orders ?? []);
      if (data.summary) {
        const s: Record<string, number> = { all: data.total ?? 0 };
        Object.entries(data.summary).forEach(([k, v]) => { s[k] = v as number; });
        setSummary(s);
      }
    } catch {
      toast.error("Failed to create order. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [newOrderNote]);

  const editableOrders = useMemo(() => ordersList.filter(o => o.edit_allowed), [ordersList]);

  const counts = useMemo(() => {
    if (Object.keys(summary).length > 0) return summary;
    const c: Record<string, number> = { all: ordersList.length };
    for (const o of ordersList) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [summary, ordersList]);

  // ── Dashboard stats (derived from full ordersList, not filtered) ──
  const stats = useMemo(() => {
    const activeCount = ordersList.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
    const portfolioValue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const sorted = [...ordersList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastOrderDate = sorted.length > 0 ? formatDate(sorted[0].created_at) : null;
    return { activeCount, portfolioValue, lastOrderDate };
  }, [ordersList]);

  // ── Client-side date filter applied on top of API results ──
  const filteredOrders = useMemo(() => {
    if (!dateFrom && !dateTo) return ordersList;
    return ordersList.filter((o) => {
      const d = new Date(o.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [ordersList, dateFrom, dateTo]);

  const hasActiveFilters = dateFrom || dateTo || search;

  function clearAllFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setActiveTab("all");
    toast.info("All filters cleared");
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page Header ──────────────────────────────── */}
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-medium tracking-tight leading-none mb-1"
              style={{ fontFamily: "'Melodrama', Georgia, serif", color: "var(--sf-text-primary)" }}
            >
              My Orders
            </h1>
            <p className="text-sm" style={{ color: "var(--sf-text-muted)", fontFamily: "'General Sans', sans-serif" }}>
              Track, manage and review your jewellery portfolio
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              title="Refresh orders"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                border: "1px solid var(--sf-divider)",
                color: "var(--sf-text-muted)",
                cursor: "pointer",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                className="h-9 text-sm gap-2 rounded-xl font-semibold"
                style={{
                  backgroundColor: "var(--sf-teal)",
                  color: "var(--sf-bg-base)",
                  boxShadow: "0 4px 16px rgba(48,184,191,0.28)",
                }}
                onClick={() => { setNewOrderNote(""); setNewOrderOpen(true); }}
              >
                <ShoppingCart className="w-4 h-4" />
                New Order
              </Button>
            </motion.div>
          </div>
        </div>

        {/* ── Dashboard Stat Cards ──────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            loading={loading}
            icon={<TrendingUp className="w-4 h-4" />}
            iconColor="var(--sf-teal)"
            iconBg="var(--sf-teal-glass)"
            label="Active Orders"
            value={String(stats.activeCount)}
          />
          <StatCard
            loading={loading}
            icon={<IndianRupee className="w-4 h-4" />}
            iconColor="#a855f7"
            iconBg="rgba(168,85,247,0.12)"
            label="Portfolio Value"
            value={loading ? "—" : formatPrice(stats.portfolioValue)}
          />
          <StatCard
            loading={loading}
            icon={<CalendarDays className="w-4 h-4" />}
            iconColor="#f59e0b"
            iconBg="rgba(245,158,11,0.12)"
            label="Last Order"
            value={stats.lastOrderDate || "—"}
          />
        </div>

        {/* ── Edit Requests Banner ─────────────────────── */}
        {editableOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border overflow-hidden"
            style={{ borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.05)" }}
          >
            <div className="flex items-center gap-2.5 px-5 py-3 border-b" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ color: "#f59e0b", fontFamily: "'Melodrama', serif" }}>
                {editableOrders.length} order{editableOrders.length > 1 ? "s" : ""} awaiting your edit
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(245,158,11,0.1)" }}>
              {editableOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{order.order_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                      {order.item_count} item{order.item_count !== 1 ? "s" : ""} · {formatPrice(order.total)}
                      {order.edit_note && <> · <span style={{ color: "#f59e0b" }}>Note: {order.edit_note}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={() => openDetailAndEdit(order)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer" }}
                  >
                    <Pencil className="w-3 h-3" /> Edit Now
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Filter Bar ───────────────────────────────── */}
        <div
          className="rounded-2xl border p-4 mb-5 space-y-3"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          {/* Row 1: Search + Filter toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
              <Input
                placeholder="Search by order ID or product name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-[var(--sf-divider)] text-sm"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); toast.info("Search cleared"); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sf-text-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="h-10 px-3.5 rounded-xl flex items-center gap-2 text-sm font-medium shrink-0 transition-colors"
              style={{
                backgroundColor: showFilters ? "var(--sf-teal-subtle)" : "var(--sf-bg-surface-2)",
                border: `1px solid ${showFilters ? "var(--sf-teal-border)" : "var(--sf-divider)"}`,
                color: showFilters ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                cursor: "pointer",
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Date Range</span>
              {(dateFrom || dateTo) && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--sf-teal)" }}
                />
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="h-10 px-3 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                style={{ backgroundColor: "var(--sf-red-subtle)", border: "1px solid var(--sf-red-border)", color: "var(--sf-red-text)", cursor: "pointer" }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Row 2: Date range (collapsible) */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                key="datefilter"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--sf-text-muted)" }}>
                      From date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        if (e.target.value) toast.info("Date filter applied");
                      }}
                      className="w-full h-9 rounded-lg border px-3 text-sm"
                      style={{
                        backgroundColor: "var(--sf-bg-surface-2)",
                        borderColor: "var(--sf-divider)",
                        color: "var(--sf-text-primary)",
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--sf-text-muted)" }}>
                      To date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        if (e.target.value) toast.info("Date filter applied");
                      }}
                      className="w-full h-9 rounded-lg border px-3 text-sm"
                      style={{
                        backgroundColor: "var(--sf-bg-surface-2)",
                        borderColor: "var(--sf-divider)",
                        color: "var(--sf-text-primary)",
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <div className="flex items-end">
                      <button
                        onClick={() => { setDateFrom(""); setDateTo(""); toast.info("Date filter cleared"); }}
                        className="h-9 px-3 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-muted)", cursor: "pointer" }}
                      >
                        Clear dates
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 3: Status pill tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{ WebkitOverflowScrolling: "touch" as any }}>
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const cfg = tab.key !== "all" ? STATUS_CONFIG[tab.key as OrderStatus] : null;
              const count = counts[tab.key] || 0;
              return (
                <motion.button
                  key={tab.key}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isActive
                      ? cfg ? cfg.bg : "var(--sf-teal-subtle)"
                      : "var(--sf-bg-surface-2)",
                    color: isActive
                      ? cfg ? cfg.color : "var(--sf-teal)"
                      : "var(--sf-text-muted)",
                    border: `1px solid ${isActive ? (cfg ? cfg.border : "rgba(48,184,191,0.3)") : "var(--sf-divider)"}`,
                    boxShadow: isActive && cfg ? `0 2px 10px ${cfg.glow}` : "none",
                    cursor: "pointer",
                  }}
                >
                  {cfg && cfg.icon}
                  {tab.label}
                  {count > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{
                        backgroundColor: isActive ? (cfg ? cfg.border : "rgba(48,184,191,0.28)") : "var(--sf-bg-surface-1)",
                        color: isActive ? (cfg ? cfg.color : "var(--sf-teal)") : "var(--sf-text-muted)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Order List ──────────────────────────────── */}
        {loading ? (
          <OrderListSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--sf-red-subtle)", border: "1px solid var(--sf-red-border)" }}
            >
              <Package className="w-7 h-7" style={{ color: "var(--sf-red-text)" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: "var(--sf-text-secondary)", fontFamily: "'Melodrama', serif" }}>
                Could not load orders
              </p>
              <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>{error}</p>
            </div>
            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-secondary)", cursor: "pointer" }}
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-24 gap-5"
          >
            <div
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--sf-teal-subtle) 0%, var(--sf-bg-surface-2) 100%)",
                border: "1px solid var(--sf-teal-border)",
                boxShadow: "0 8px 32px rgba(48,184,191,0.12)",
              }}
            >
              <ShoppingBag className="w-9 h-9" style={{ color: "var(--sf-teal)" }} />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--sf-teal)" }}
              >
                <Sparkles className="w-2.5 h-2.5" style={{ color: "var(--sf-bg-base)" }} />
              </motion.div>
            </div>
            <div className="text-center max-w-xs">
              <h3 className="text-xl font-medium mb-2" style={{ fontFamily: "'Melodrama', Georgia, serif", color: "var(--sf-text-primary)" }}>
                {hasActiveFilters ? "No matching orders" : activeTab !== "all" ? "No orders here" : "No orders yet"}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--sf-text-muted)" }}>
                {hasActiveFilters
                  ? "Try adjusting your search, date range or status filter."
                  : activeTab !== "all"
                  ? "Try a different status filter or browse the catalog."
                  : "Your order history will appear here once you start ordering."}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="h-10 px-6 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-secondary)", cursor: "pointer" }}
              >
                Clear Filters
              </button>
            ) : (
              <Button
                className="h-10 px-6 gap-2 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)", boxShadow: "0 4px 16px rgba(48,184,191,0.3)" }}
                onClick={() => navigate("/retailer/catalog")}
              >
                Browse Catalog <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Result count when filtering */}
            {hasActiveFilters && (
              <p className="text-xs mb-3" style={{ color: "var(--sf-text-muted)" }}>
                Showing {filteredOrders.length} of {ordersList.length} orders
              </p>
            )}
            <div className="space-y-3">
              {filteredOrders.map((order, i) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={i}
                  expanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  onViewDetail={() => openDetail(order)}
                  onReorder={() => navigate("/retailer/catalog")}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* === New Order Dialog === */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', serif" }}>
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
                placeholder="E.g., delivery deadline, gift wrapping, size requirements, engraving…"
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
              <Button variant="ghost" style={{ color: "var(--sf-text-secondary)" }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateOrder} disabled={creating} style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Submit Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Order Detail Sheet === */}
      <Sheet
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOrder(null);
            setEditMode(false);
            setEditSuccess(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-none sm:w-[720px] sm:max-w-[92vw] md:w-[780px] p-0 gap-0 flex flex-col h-full overflow-hidden [&>button]:hidden"
          style={{
            backgroundColor: "var(--sf-bg-surface-1)",
            borderColor: "var(--sf-divider)",
          }}
        >
          <SheetTitle className="sr-only">
            {detailOrder ? `Order details ${detailOrder.order_number}` : "Order details"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            View order details, tracking activity, and edit order items.
          </SheetDescription>
          {detailOrder && (() => {
            const cfg = STATUS_CONFIG[detailOrder.status];
            return (
              <>
                {/* ── Coloured top accent bar ── */}
                <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: cfg.color }} />

                {/* ── Header ── */}
                <div
                  className="px-6 pt-5 pb-5 shrink-0"
                  style={{ borderBottom: "1px solid var(--sf-divider)" }}
                >
                  {/* Order number row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2
                        className="text-2xl font-medium leading-tight mb-1.5"
                        style={{ fontFamily: "'Melodrama', serif", color: "var(--sf-text-primary)" }}
                      >
                        {detailOrder.order_number}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={detailOrder.status} />
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--sf-text-muted)" }}>
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(detailOrder.created_at)}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "var(--sf-teal)" }}>
                          {formatPrice(Number(detailOrder.total))}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp support */}
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi, I need support for order ${detailOrder.order_number}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shrink-0 transition-opacity hover:opacity-75"
                      style={{
                        backgroundColor: "rgba(37,211,102,0.10)",
                        color: "#25d366",
                        border: "1px solid rgba(37,211,102,0.25)",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Support
                    </a>
                  </div>

                  {/* Stepper / cancelled banner */}
                  {detailOrder.status !== "cancelled" ? (
                    <OrderStepper status={detailOrder.status} />
                  ) : (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                      style={{ backgroundColor: "rgba(194,23,59,0.07)", border: "1px solid rgba(194,23,59,0.2)", color: "#c2173b" }}
                    >
                      <XCircle className="w-4 h-4 shrink-0" /> This order was cancelled
                    </div>
                  )}
                </div>

                {/* ── Scrollable body ── */}
                {detailLoading ? (
                  <div className="p-6 space-y-3 shrink-0">
                    {[80, 80, 80, 48].map((h, i) => (
                      <Skeleton key={i} className="w-full rounded-2xl" style={{ height: h }} />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className={`flex-1 min-h-0 ${THIN_MUTED_SCROLLBAR}`}>
                    <div className={`px-6 pt-5 space-y-5 ${editMode ? "pb-28" : "pb-6"}`}>

                      {/* Edit success */}
                      {editSuccess && (
                        <div
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                          style={{ backgroundColor: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.22)" }}
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
                          <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
                            Order updated — admin will review your changes.
                          </p>
                        </div>
                      )}

                      {/* Edit available banner */}
                      {detailOrder.edit_allowed && !editMode && !editSuccess && (
                        <div
                          className="flex items-start justify-between gap-3 rounded-xl px-3.5 py-3"
                          style={{ backgroundColor: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)" }}
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>You can edit this order</p>
                              {detailOrder.edit_note && (
                                <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-secondary)" }}>
                                  Admin note: {detailOrder.edit_note}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => openEditMode(detailOrder)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                            style={{ backgroundColor: "rgba(245,158,11,0.14)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.28)", cursor: "pointer" }}
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      )}

                      {/* ── Edit / View mode with fluid transition ── */}
                      <AnimatePresence mode="wait">
                        {editMode ? (
                          <motion.div
                            key="edit-mode"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="rounded-2xl border overflow-hidden"
                            style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-1)" }}
                          >
                            {/* Edit header */}
                            <div
                              className="flex items-start justify-between gap-3 px-5 py-4 border-b"
                              style={{ borderColor: "var(--sf-divider)", background: "linear-gradient(120deg, rgba(48,184,191,0.07), transparent 65%)" }}
                            >
                              <div className="min-w-0">
                                <h3
                                  className="text-xl font-medium leading-tight"
                                  style={{ fontFamily: "'Melodrama', Georgia, serif", color: "var(--sf-text-primary)" }}
                                >
                                  Editing Order
                                </h3>
                                <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)", fontFamily: "'General Sans', sans-serif" }}>
                                  {editItems.length} item{editItems.length !== 1 ? "s" : ""} · {detailOrder.order_number}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sf-text-muted)" }}>
                                  Updated Total
                                </p>
                                <p className="text-lg font-semibold mt-0.5 leading-tight" style={{ color: "var(--sf-teal)", fontFamily: "'General Sans', sans-serif" }}>
                                  {formatPrice(editDraftTotal)}
                                </p>
                              </div>
                            </div>

                            <div className="p-4 space-y-2">
                              {/* Item rows */}
                              <AnimatePresence initial={false}>
                                {editItems.map((ei) => {
                                  const rowKey = editItemKey(ei);
                                  return (
                                    <motion.div
                                      key={rowKey}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="px-3.5 py-3 rounded-2xl space-y-3"
                                      style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                                    >
                                      <div className="flex items-center gap-3">
                                      <img
                                        src={ei.image || PLACEHOLDER_IMAGE}
                                        alt={ei.name}
                                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                                        style={{ border: "1px solid var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-1)" }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}>{ei.name}</p>
                                        <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                                          {formatPrice(ei.unitPrice)} each{ei.isNew ? <span style={{ color: "var(--sf-teal)" }}> · New</span> : ""}
                                        </p>
                                      </div>
                                      {ei.isNew && (
                                        <button
                                          onClick={() => removeNewEditItem(ei.productId)}
                                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                          style={{ backgroundColor: "var(--sf-bg-surface-1)", cursor: "pointer" }}
                                        >
                                          <X className="w-3 h-3" style={{ color: "var(--sf-text-muted)" }} />
                                        </button>
                                      )}
                                      {/* Qty stepper with teal hover glow */}
                                      <div className="flex items-center gap-1.5 shrink-0 px-1.5 py-1 rounded-xl" style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}>
                                        <button
                                          onClick={() => setEditItems((p) => p.map((x) => editItemKey(x) === rowKey ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                                          style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", cursor: "pointer" }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--sf-teal)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(48,184,191,0.15)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--sf-divider)"; e.currentTarget.style.boxShadow = "none"; }}
                                        >
                                          <Minus className="w-3 h-3" style={{ color: "var(--sf-text-secondary)" }} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}>
                                          {ei.quantity}
                                        </span>
                                        <button
                                          onClick={() => setEditItems((p) => p.map((x) => editItemKey(x) === rowKey ? { ...x, quantity: x.quantity + 1 } : x))}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                                          style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", cursor: "pointer" }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--sf-teal)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(48,184,191,0.15)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--sf-divider)"; e.currentTarget.style.boxShadow = "none"; }}
                                        >
                                          <Plus className="w-3 h-3" style={{ color: "var(--sf-text-secondary)" }} />
                                        </button>
                                      </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {ei.metalOptions && ei.metalOptions.length > 0 ? (
                                          <Select value={ei.metal || ""} onValueChange={(v) => updateEditItemField(rowKey, { metal: v })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Metal type" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.metalOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.metal || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { metal: e.target.value })}
                                            placeholder="Metal type"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.caratOptions && ei.caratOptions.length > 0 ? (
                                          <Select
                                            value={String(ei.carat)}
                                            onValueChange={(v) => {
                                              const num = parseFloat(v);
                                              updateEditItemField(rowKey, { carat: Number.isFinite(num) ? num : ei.carat });
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Carat" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.caratOptions.map((opt) => (
                                                <SelectItem key={String(opt)} value={String(opt)}>
                                                  {opt} ct
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={ei.carat}
                                            onChange={(e) => {
                                              const v = parseFloat(e.target.value);
                                              updateEditItemField(rowKey, { carat: Number.isFinite(v) ? v : 0 });
                                            }}
                                            placeholder="Carat"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}
                                          />
                                        )}
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={ei.unitPrice}
                                          onChange={(e) => {
                                            const v = parseFloat(e.target.value);
                                            updateEditItemField(rowKey, { unitPrice: Number.isFinite(v) ? v : 0 });
                                          }}
                                          placeholder="Unit price"
                                          className="h-8 text-xs"
                                          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}
                                        />
                                        {ei.goldColourOptions && ei.goldColourOptions.length > 0 ? (
                                          <Select value={ei.goldColour || ""} onValueChange={(v) => updateEditItemField(rowKey, { goldColour: v || null })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Gold colour" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.goldColourOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.goldColour || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { goldColour: e.target.value || null })}
                                            placeholder="Gold colour"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.diamondShapeOptions && ei.diamondShapeOptions.length > 0 ? (
                                          <Select value={ei.diamondShape || ""} onValueChange={(v) => updateEditItemField(rowKey, { diamondShape: v || null })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Diamond shape" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.diamondShapeOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.diamondShape || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { diamondShape: e.target.value || null })}
                                            placeholder="Diamond shape"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.diamondShadeOptions && ei.diamondShadeOptions.length > 0 ? (
                                          <Select value={ei.diamondShade || ""} onValueChange={(v) => updateEditItemField(rowKey, { diamondShade: v || null })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Diamond shade" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.diamondShadeOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.diamondShade || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { diamondShade: e.target.value || null })}
                                            placeholder="Diamond shade"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.diamondQualityOptions && ei.diamondQualityOptions.length > 0 ? (
                                          <Select value={ei.diamondQuality || ""} onValueChange={(v) => updateEditItemField(rowKey, { diamondQuality: v || null })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Diamond quality" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.diamondQualityOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.diamondQuality || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { diamondQuality: e.target.value || null })}
                                            placeholder="Diamond quality"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.colorStoneNameOptions && ei.colorStoneNameOptions.length > 0 ? (
                                          <Select value={ei.colorStoneName || ""} onValueChange={(v) => updateEditItemField(rowKey, { colorStoneName: v || null })}>
                                            <SelectTrigger className="h-8 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Color stone name" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.colorStoneNameOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.colorStoneName || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { colorStoneName: e.target.value || null })}
                                            placeholder="Color stone name"
                                            className="h-8 text-xs"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        {ei.colorStoneQualityOptions && ei.colorStoneQualityOptions.length > 0 ? (
                                          <Select value={ei.colorStoneQuality || ""} onValueChange={(v) => updateEditItemField(rowKey, { colorStoneQuality: v || null })}>
                                            <SelectTrigger className="h-8 text-xs col-span-2" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
                                              <SelectValue placeholder="Color stone quality" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
                                              {ei.colorStoneQualityOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            value={ei.colorStoneQuality || ""}
                                            onChange={(e) => updateEditItemField(rowKey, { colorStoneQuality: e.target.value || null })}
                                            placeholder="Color stone quality"
                                            className="h-8 text-xs col-span-2"
                                            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                          />
                                        )}
                                        <Input
                                          value={ei.note || ""}
                                          onChange={(e) => updateEditItemField(rowKey, { note: e.target.value })}
                                          placeholder="Item note (optional)"
                                          className="h-8 text-xs col-span-2"
                                          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                        />
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>

                              {/* Add product search */}
                              <div
                                className="rounded-2xl border mt-1 overflow-hidden"
                                style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}
                              >
                                <div className="px-3.5 pt-3.5 pb-3">
                                  <label className="text-[10px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: "var(--sf-text-muted)" }}>
                                    Add Product
                                  </label>
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--sf-text-muted)" }} />
                                    <Input
                                      value={editProductSearch}
                                      onChange={(e) => setEditProductSearch(e.target.value)}
                                      placeholder="Search by name or SKU…"
                                      className="h-9 pl-9 text-sm"
                                      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                                    />
                                  </div>
                                </div>
                                <AnimatePresence>
                                  {(editProductResults.length > 0 || editProductLoading) && (
                                    <motion.div
                                      key="search-results"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                      className="overflow-hidden border-t"
                                      style={{ borderColor: "var(--sf-divider)" }}
                                    >
                                      <div
                                        className="px-3 pb-3 space-y-1 overflow-auto [scrollbar-color:var(--sf-divider)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--sf-divider)]"
                                        style={{ maxHeight: 192, paddingTop: 8 }}
                                      >
                                        {editProductLoading ? (
                                          <div className="py-3 flex items-center justify-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--sf-text-muted)" }} />
                                            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Searching…</p>
                                          </div>
                                        ) : (
                                          editProductResults.map((product) => {
                                            const alreadyAdded = editItems.some((item) => item.productId === product.id);
                                            return (
                                              <div
                                                key={product.id}
                                                className="flex items-center gap-2.5 rounded-xl p-2"
                                                style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
                                              >
                                                <img src={product.image || PLACEHOLDER_IMAGE} alt={product.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{product.name}</p>
                                                  <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{formatPrice(product.basePrice)}</p>
                                                </div>
                                                <button
                                                  onClick={() => addProductToEdit(product)}
                                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0"
                                                  style={{ backgroundColor: "var(--sf-teal-subtle)", color: "var(--sf-teal)", border: "1px solid var(--sf-teal-border)", cursor: "pointer" }}
                                                >
                                                  {alreadyAdded ? "+1" : "Add"}
                                                </button>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                {!editProductLoading && editProductResults.length === 0 && editProductSearch.trim() && (
                                  <p className="text-xs px-3 pb-3 text-center" style={{ color: "var(--sf-text-muted)" }}>No products found.</p>
                                )}
                              </div>

                              {/* Updated Total — prominent teal accent */}
                              <div
                                className="flex items-center justify-between px-4 py-3.5 rounded-xl mt-1"
                                style={{
                                  background: "linear-gradient(to right, rgba(48,184,191,0.08), transparent)",
                                  border: "1px solid var(--sf-teal-border)",
                                }}
                              >
                                <span
                                  className="text-[11px] font-bold uppercase tracking-[0.1em]"
                                  style={{ color: "var(--sf-text-muted)" }}
                                >
                                  Updated Total
                                </span>
                                <span
                                  className="text-xl font-bold"
                                  style={{ color: "var(--sf-teal)", fontFamily: "'General Sans', sans-serif" }}
                                >
                                  {formatPrice(editDraftTotal)}
                                </span>
                              </div>

                              <Textarea
                                value={editOrderNote}
                                onChange={(e) => setEditOrderNote(e.target.value)}
                                placeholder="Order note (optional)…"
                                className="min-h-[56px] text-sm"
                                style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                              />
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="view-mode"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="space-y-5"
                          >
                            {/* ── Item Cards ── */}
                            {detailOrder.items && detailOrder.items.length > 0 && (
                              <div className="space-y-3">
                                <SectionLabel>Order Items</SectionLabel>
                                {detailOrder.items.map((item) => (
                                  <ItemCard key={item.id} item={item} />
                                ))}
                                <div
                                  className="flex items-center justify-between px-4 py-3.5 rounded-2xl mt-1"
                                  style={{
                                    background: "linear-gradient(to right, var(--sf-teal-subtle), transparent)",
                                    border: "1px solid var(--sf-teal-border)",
                                  }}
                                >
                                  <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                                    Order Total
                                  </span>
                                  <span
                                    className="text-xl font-semibold"
                                    style={{ color: "var(--sf-teal)", fontFamily: "'General Sans', sans-serif" }}
                                  >
                                    {formatPrice(Number(detailOrder.total))}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* No-items total */}
                            {(!detailOrder.items || detailOrder.items.length === 0) && (
                              <div
                                className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                                style={{ background: "linear-gradient(to right, var(--sf-teal-subtle), transparent)", border: "1px solid var(--sf-teal-border)" }}
                              >
                                <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                                  Total · {detailOrder.item_count} item{detailOrder.item_count !== 1 ? "s" : ""}
                                </span>
                                <span className="text-xl font-semibold" style={{ color: "var(--sf-teal)" }}>
                                  {formatPrice(Number(detailOrder.total))}
                                </span>
                              </div>
                            )}

                            {/* Notes */}
                            {detailOrder.note && (
                              <div>
                                <SectionLabel>Notes</SectionLabel>
                                <div
                                  className="flex gap-3 p-4 rounded-2xl"
                                  style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)" }}
                                >
                                  <StickyNote className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--sf-teal)" }} />
                                  <p className="text-sm leading-relaxed" style={{ color: "var(--sf-text-secondary)" }}>
                                    {detailOrder.note}
                                  </p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Activity log */}
                      {detailOrder.trackingUpdates && detailOrder.trackingUpdates.length > 0 && (
                        <div>
                          <SectionLabel>Activity Log</SectionLabel>
                          <div
                            className="rounded-2xl border overflow-hidden"
                            style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-2)" }}
                          >
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

                {/* ── Footer ── */}
                {editMode ? (
                  <div
                    className="px-6 py-3.5 shrink-0 flex items-center justify-between gap-3 sticky bottom-0"
                    style={{
                      borderTop: "1px solid var(--sf-divider)",
                      backgroundColor: "var(--sf-glass-bg)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    }}
                  >
                    <span className="text-[11px] font-mono" style={{ color: "var(--sf-text-muted)" }}>
                      {detailOrder.id?.slice(0, 8).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(false)}
                        style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={submittingEdit}
                        onClick={() => submitEdit(detailOrder.id)}
                        className="gap-1.5"
                        style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
                      >
                        {submittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-6 py-4 shrink-0 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--sf-divider)" }}
                  >
                    <span className="text-[11px] font-mono" style={{ color: "var(--sf-text-muted)" }}>
                      {detailOrder.id?.slice(0, 8).toUpperCase()}
                    </span>
                    <SheetClose asChild>
                      <Button variant="ghost" size="sm" style={{ color: "var(--sf-text-secondary)" }}>
                        Close
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Stat Card ── */
function StatCard({
  loading,
  icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  loading: boolean;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded" />
        </>
      ) : (
        <>
          <p
            className="text-lg sm:text-xl font-semibold leading-tight break-all"
            style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif", wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            {value}
          </p>
          <p className="text-[11px] font-medium" style={{ color: "var(--sf-text-muted)" }}>
            {label}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Order List Skeleton ── */
function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border p-5"
          style={{
            backgroundColor: "var(--sf-bg-surface-1)",
            borderColor: "var(--sf-divider)",
            borderLeft: "3px solid var(--sf-divider)",
          }}
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        letterSpacing: "0.03em",
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ── Section Label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold tracking-[0.12em] mb-2.5 uppercase"
      style={{ color: "var(--sf-text-muted)" }}
    >
      {children}
    </p>
  );
}

/* ── Order Stepper ── */
function OrderStepper({ status }: { status: OrderStatus }) {
  const currentIdx = STEPPER_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex items-start w-full">
      {STEPPER_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const cfg = STATUS_CONFIG[step.status];

        return (
          <div key={step.status} className="flex items-start flex-1 min-w-0">
            {/* Node + label */}
            <div className="flex flex-col items-center min-w-0" style={{ flex: "0 0 auto" }}>
              <motion.div
                initial={false}
                animate={{
                  boxShadow: active ? `0 0 0 4px ${cfg.glow}` : "0 0 0 0px transparent",
                }}
                transition={{ duration: 0.35 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: done
                    ? "rgba(34,197,94,0.14)"
                    : active
                    ? cfg.bg
                    : "var(--sf-bg-surface-2)",
                  border: `2px solid ${
                    done
                      ? "rgba(34,197,94,0.45)"
                      : active
                      ? cfg.color
                      : "var(--sf-divider)"
                  }`,
                  color: done ? "#22c55e" : active ? cfg.color : "var(--sf-text-muted)",
                }}
              >
                {done
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <span className="scale-90">{cfg.icon}</span>
                }
              </motion.div>
              <span
                className="text-[10px] font-semibold mt-1.5 text-center leading-tight"
                style={{
                  color: done ? "#22c55e" : active ? cfg.color : "var(--sf-text-muted)",
                  maxWidth: 48,
                }}
              >
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {idx < STEPPER_STEPS.length - 1 && (
              <div className="flex-1 flex items-center" style={{ marginTop: 15, paddingInline: 3 }}>
                <div
                  className="w-full h-px rounded-full"
                  style={{
                    backgroundColor: done ? "rgba(34,197,94,0.4)" : "var(--sf-divider)",
                    transition: "background-color 0.4s ease",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Item Card (detail dialog) ── */
function ItemCard({ item }: { item: OrderItem }) {
  // Build ordered, labelled attribute chips
  const chips: { label: string; value: string }[] = [
    item.category   ? { label: "Category",  value: item.category }            : null,
    item.metal      ? { label: "Metal",      value: item.metal }               : null,
    item.carat      ? { label: "Carat",      value: `${item.carat} ct` }       : null,
    item.goldColour ? { label: "Gold",       value: item.goldColour }          : null,
    item.diamondShape   ? { label: "Shape",  value: item.diamondShape }        : null,
    item.diamondShade   ? { label: "Shade",  value: item.diamondShade }        : null,
    item.diamondQuality ? { label: "Quality",value: item.diamondQuality }      : null,
    item.colorStoneName ? { label: "Stone",  value: item.colorStoneName }      : null,
    item.colorStoneQuality ? { label: "Stone Q", value: item.colorStoneQuality } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      className="flex gap-4 p-3 rounded-2xl border transition-colors"
      style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
    >
      {/* Square thumbnail */}
      <div
        className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0"
        style={{ border: "1px solid var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-3)" }}
      >
        <img
          src={item.image || PLACEHOLDER_IMAGE}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* Name */}
        <p
          className="text-sm font-semibold leading-snug mb-1.5"
          style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}
        >
          {item.name}
        </p>

        {/* Attribute chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {chips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-baseline gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  border: "1px solid var(--sf-divider)",
                  color: "var(--sf-text-muted)",
                }}
              >
                <span style={{ color: "var(--sf-text-muted)", opacity: 0.6 }}>{chip.label}</span>
                <span style={{ color: "var(--sf-text-secondary)", fontWeight: 500 }}>{chip.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Qty · Price */}
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
            style={{
              backgroundColor: "var(--sf-teal-subtle)",
              color: "var(--sf-teal)",
              border: "1px solid var(--sf-teal-border)",
              letterSpacing: "0.02em",
            }}
          >
            × {item.quantity}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', sans-serif" }}
          >
            {item.priceLabel || formatPrice(item.unitPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Order Card ── */
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
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{
        y: -2,
        boxShadow: `0 8px 32px ${cfg.glow}, 0 2px 8px rgba(0,0,0,0.18)`,
        transition: { duration: 0.18, ease: "easeOut" },
      }}
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: "var(--sf-divider)",
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 sm:px-6"
        style={{ background: "none", border: "none", cursor: "pointer", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, boxShadow: `0 2px 8px ${cfg.glow}` }}
          >
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--sf-text-primary)" }}>
                {order.order_number}
              </span>
              <StatusBadge status={order.status} />
              {order.edit_allowed && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", letterSpacing: "0.06em" }}>
                  <Pencil className="w-2.5 h-2.5" /> EDIT AVAILABLE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--sf-text-muted)" }}>
                <CalendarDays className="w-3 h-3" /> {formatDate(order.created_at)}
              </span>
              <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                {order.item_count} item{order.item_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
              {formatPrice(order.total)}
            </span>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
            <div className="px-5 py-4 sm:px-6 space-y-4" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
              {/* Item strip */}
              {order.items && order.items.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 shrink-0">
                      <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name}
                        className="w-11 h-11 rounded-xl object-cover"
                        style={{ border: "1px solid var(--sf-divider)" }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[120px]" style={{ color: "var(--sf-text-primary)" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>×{item.quantity} · {item.priceLabel || formatPrice(item.unitPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              {order.note && (
                <div className="flex gap-2 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}>
                  <StickyNote className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--sf-teal)" }} />
                  <p className="text-xs" style={{ color: "var(--sf-text-secondary)" }}>{order.note}</p>
                </div>
              )}

              {/* Latest tracking */}
              {order.trackingUpdates && order.trackingUpdates.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--sf-bg-surface-1)", border: `1px solid ${cfg.border}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--sf-text-primary)" }}>
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
              <div className="flex gap-2 flex-wrap pt-1">
                <button onClick={onViewDetail}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--sf-teal-subtle)", color: "var(--sf-teal)", border: "1px solid var(--sf-teal-border)", cursor: "pointer" }}>
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                <button onClick={onReorder}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--sf-glass-bg)", color: "var(--sf-text-secondary)", border: "1px solid var(--sf-divider)", cursor: "pointer" }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reorder
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Tracking Step (activity log) ── */
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
    <div
      className="flex gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--sf-divider)" }}
    >
      {/* Dot */}
      <div className="flex flex-col items-center pt-0.5 shrink-0" style={{ width: 12 }}>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor: isLast ? "var(--sf-teal)" : "var(--sf-text-muted)",
            boxShadow: isLast ? "0 0 8px rgba(48,184,191,0.55)" : "none",
            opacity: isLast ? 1 : 0.5,
          }}
        />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-xs font-semibold"
            style={{ color: isLast ? "var(--sf-text-primary)" : "var(--sf-text-secondary)" }}
          >
            {update.status}
          </p>
          <span className="text-[10px] shrink-0" style={{ color: "var(--sf-text-muted)" }}>
            {update.date}
          </span>
        </div>
        {update.detail && (
          <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {update.detail}
          </p>
        )}
      </div>
    </div>
  );
}
