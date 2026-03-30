import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Eye,
  Heart,
  Image as ImageIcon,
  Upload,
  X,
  Star,
  GripVertical,
  ImagePlus,
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
import { adminProducts } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ProductListItem = {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  carat: number | null;
  metal_type: string | null;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  is_new: boolean;
  is_active: boolean;
  category: string | null;
  image: string | null;
  image_count: number;
  view_count: number;
  wishlist_count: number;
  occasion_tags: string | null;
  min_order_qty: number | null;
  max_order_qty: number | null;
  lead_time_days: number | null;
};

type ProductDetail = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  base_price: number;
  carat: number | null;
  carat_range_min: number | null;
  carat_range_max: number | null;
  metal_type: string | null;
  metal_weight: number | null;
  diamond_type: string | null;
  diamond_shape: string | null;
  diamond_color: string | null;
  diamond_clarity: string | null;
  diamond_certification: string | null;
  setting_type: string | null;
  hallmark: string | null;
  width_mm: number | null;
  height_mm: number | null;
  gold_purity_options: string | null;
  finish_options: string | null;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  lead_time_days: number | null;
  min_order_qty: number | null;
  max_order_qty: number | null;
  is_new: boolean;
  is_active: boolean;
  occasion_tags: string | null;
  price_modifiers: string | null;
  category_id: string | null;
  category: string | null;
  images: ProductImage[];
  collections: { id: string; name: string }[];
  stats: {
    view_count: number;
    wishlist_count: number;
    order_count: number;
  };
};

type ProductImage = {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type Category = { id: string; name: string };
type Collection = { id: string; name: string; tag?: string };

type ProductFormData = {
  name: string;
  sku: string;
  description: string;
  category_id: string;
  collection_ids: string[];
  occasion_tags: string;
  metal_type: string;
  metal_weight: string;
  diamond_type: string;
  diamond_shape: string;
  diamond_color: string;
  diamond_clarity: string;
  diamond_certification: string;
  setting_type: string;
  hallmark: string;
  width_mm: string;
  height_mm: string;
  gold_purity_options: string;
  finish_options: string;
  carat: string;
  carat_range_min: string;
  carat_range_max: string;
  base_price: string;
  price_modifiers: string;
  availability: string;
  lead_time_days: string;
  min_order_qty: string;
  max_order_qty: string;
  is_new: boolean;
  is_active: boolean;
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "out-of-stock", label: "Out of Stock" },
] as const;

const AVAILABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  "in-stock": { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  "made-to-order": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  "out-of-stock": { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)" },
};

function formatPrice(n: number) {
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

function availabilityBadge(status: string) {
  const colors = AVAILABILITY_COLORS[status] || AVAILABILITY_COLORS["out-of-stock"];
  const label = AVAILABILITY_OPTIONS.find((o) => o.value === status)?.label || status;
  return (
    <Badge
      className="text-[10px] h-5 capitalize whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text, border: "none" }}
    >
      {label}
    </Badge>
  );
}

function activeBadge(active: boolean) {
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

const EMPTY_FORM: ProductFormData = {
  name: "",
  sku: "",
  description: "",
  category_id: "",
  collection_ids: [],
  occasion_tags: "",
  metal_type: "",
  metal_weight: "",
  diamond_type: "",
  diamond_shape: "",
  diamond_color: "",
  diamond_clarity: "",
  diamond_certification: "",
  setting_type: "",
  hallmark: "",
  width_mm: "",
  height_mm: "",
  gold_purity_options: "",
  finish_options: "",
  carat: "",
  carat_range_min: "",
  carat_range_max: "",
  base_price: "",
  price_modifiers: "",
  availability: "in-stock",
  lead_time_days: "",
  min_order_qty: "",
  max_order_qty: "",
  is_new: false,
  is_active: true,
};

function detailToForm(d: ProductDetail): ProductFormData {
  return {
    name: d.name || "",
    sku: d.sku || "",
    description: d.description || "",
    category_id: d.category_id || "",
    collection_ids: d.collections?.map((c) => c.id) || [],
    occasion_tags: d.occasion_tags || "",
    metal_type: d.metal_type || "",
    metal_weight: d.metal_weight != null ? String(d.metal_weight) : "",
    diamond_type: d.diamond_type || "",
    diamond_shape: d.diamond_shape || "",
    diamond_color: d.diamond_color || "",
    diamond_clarity: d.diamond_clarity || "",
    diamond_certification: d.diamond_certification || "",
    setting_type: d.setting_type || "",
    hallmark: d.hallmark || "",
    width_mm: d.width_mm != null ? String(d.width_mm) : "",
    height_mm: d.height_mm != null ? String(d.height_mm) : "",
    gold_purity_options: d.gold_purity_options || "",
    finish_options: d.finish_options || "",
    carat: d.carat != null ? String(d.carat) : "",
    carat_range_min: d.carat_range_min != null ? String(d.carat_range_min) : "",
    carat_range_max: d.carat_range_max != null ? String(d.carat_range_max) : "",
    base_price: d.base_price != null ? String(d.base_price) : "",
    price_modifiers: d.price_modifiers || "",
    availability: d.availability || "in-stock",
    lead_time_days: d.lead_time_days != null ? String(d.lead_time_days) : "",
    min_order_qty: d.min_order_qty != null ? String(d.min_order_qty) : "",
    max_order_qty: d.max_order_qty != null ? String(d.max_order_qty) : "",
    is_new: d.is_new ?? false,
    is_active: d.is_active ?? true,
  };
}

function formToPayload(f: ProductFormData) {
  const payload: Record<string, any> = {
    name: f.name.trim(),
    sku: f.sku.trim(),
    description: f.description.trim() || null,
    category_id: f.category_id || null,
    collection_ids: f.collection_ids,
    occasion_tags: f.occasion_tags.trim() || null,
    metal_type: f.metal_type.trim() || null,
    metal_weight: f.metal_weight ? parseFloat(f.metal_weight) : null,
    diamond_type: f.diamond_type.trim() || null,
    diamond_shape: f.diamond_shape.trim() || null,
    diamond_color: f.diamond_color.trim() || null,
    diamond_clarity: f.diamond_clarity.trim() || null,
    diamond_certification: f.diamond_certification.trim() || null,
    setting_type: f.setting_type.trim() || null,
    hallmark: f.hallmark.trim() || null,
    width_mm: f.width_mm ? parseFloat(f.width_mm) : null,
    height_mm: f.height_mm ? parseFloat(f.height_mm) : null,
    gold_purity_options: f.gold_purity_options.trim() || null,
    finish_options: f.finish_options.trim() || null,
    carat: f.carat ? parseFloat(f.carat) : null,
    carat_range_min: f.carat_range_min ? parseFloat(f.carat_range_min) : null,
    carat_range_max: f.carat_range_max ? parseFloat(f.carat_range_max) : null,
    base_price: f.base_price ? parseFloat(f.base_price) : 0,
    price_modifiers: f.price_modifiers.trim() || null,
    availability: f.availability,
    lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days, 10) : null,
    min_order_qty: f.min_order_qty ? parseInt(f.min_order_qty, 10) : null,
    max_order_qty: f.max_order_qty ? parseInt(f.max_order_qty, 10) : null,
    is_new: f.is_new,
    is_active: f.is_active,
  };
  return payload;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const PAGE_SIZE = 15;
const MAX_IMAGES = 10;

/* ═══════════════════════════════════════════════════════
   INLINE STYLED INPUT (reusable)
   ═══════════════════════════════════════════════════════ */

function SurfaceInput({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--sf-text-secondary)" }}
      >
        {label}
      </label>
      <Input
        {...props}
        className={`h-9 ${props.className || ""}`}
        style={{
          backgroundColor: "var(--sf-bg-surface-2)",
          borderColor: "var(--sf-divider)",
          color: "var(--sf-text-primary)",
          ...props.style,
        }}
      />
    </div>
  );
}

function SurfaceTextarea({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Textarea>) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--sf-text-secondary)" }}
      >
        {label}
      </label>
      <Textarea
        {...props}
        className={`min-h-[80px] ${props.className || ""}`}
        style={{
          backgroundColor: "var(--sf-bg-surface-2)",
          borderColor: "var(--sf-divider)",
          color: "var(--sf-text-primary)",
          ...props.style,
        }}
      />
    </div>
  );
}

function SurfaceSelect({
  label,
  placeholder,
  value,
  onValueChange,
  children,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--sf-text-secondary)" }}
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="h-9"
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            borderColor: "var(--sf-divider)",
            color: "var(--sf-text-primary)",
          }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          style={{
            backgroundColor: "var(--sf-bg-surface-2)",
            borderColor: "var(--sf-divider)",
          }}
        >
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminProducts() {
  /* ── List state ─────────────────────────────────── */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [isNewFilter, setIsNewFilter] = useState<string>("all");

  /* ── Meta ───────────────────────────────────────── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  /* ── Dialog states ──────────────────────────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  /* ── Form state ─────────────────────────────────── */
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [formTab, setFormTab] = useState("basic");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Image management ──────────────────────────── */
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* ── Detail loading ─────────────────────────────── */
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Fetch categories & collections on mount ────── */
  useEffect(() => {
    (async () => {
      try {
        const [cats, colls] = await Promise.all([
          adminProducts.categories(),
          adminProducts.collections(),
        ]);
        setCategories(cats || []);
        setCollections(colls || []);
      } catch (err) {
        console.error("Failed to fetch meta:", err);
      }
    })();
  }, []);

  /* ── Fetch products ─────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (availabilityFilter !== "all") params.availability = availabilityFilter;
      if (isNewFilter !== "all") params.is_new = isNewFilter;

      const data = await adminProducts.list(params);
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, availabilityFilter, isNewFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Reset page when filters change */
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, availabilityFilter, isNewFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Open Add dialog ────────────────────────────── */
  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setExistingImages([]);
    setNewFiles([]);
    setNewPreviews([]);
    setFormError(null);
    setFormTab("basic");
    setFormOpen(true);
  }

  /* ── Open Edit dialog ──────────────────────────── */
  async function openEdit(id: string) {
    setEditingId(id);
    setFormError(null);
    setFormTab("basic");
    setNewFiles([]);
    setNewPreviews([]);
    setFormOpen(true);
    setDetailLoading(true);
    try {
      const detail: ProductDetail = await adminProducts.detail(id);
      setForm(detailToForm(detail));
      setExistingImages(detail.images || []);
    } catch (err: any) {
      setFormError(err.message || "Failed to load product");
    } finally {
      setDetailLoading(false);
    }
  }

  /* ── File handling ──────────────────────────────── */
  function handleFileSelect(files: FileList | File[]) {
    const arr = Array.from(files);
    const totalCount = existingImages.length + newFiles.length + arr.length;
    if (totalCount > MAX_IMAGES) {
      setFormError(`Maximum ${MAX_IMAGES} images allowed. Currently have ${existingImages.length + newFiles.length}.`);
      return;
    }
    const validFiles = arr.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    setNewFiles((prev) => [...prev, ...validFiles]);
    const previews = validFiles.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...previews]);
    setFormError(null);
  }

  function removeNewFile(idx: number) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDeleteExistingImage(imageId: string) {
    try {
      await adminProducts.deleteImage(imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
  }

  async function handleSetPrimary(imageId: string) {
    try {
      await adminProducts.setPrimaryImage(imageId);
      setExistingImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      );
    } catch (err) {
      console.error("Failed to set primary:", err);
    }
  }

  /* ── Drop zone handlers ─────────────────────────── */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  }

  /* ── Submit form ────────────────────────────────── */
  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError("Product name is required.");
      setFormTab("basic");
      return;
    }
    if (!form.sku.trim()) {
      setFormError("SKU is required.");
      setFormTab("basic");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = formToPayload(form);
      let productId = editingId;

      if (editingId) {
        await adminProducts.update(editingId, payload);
      } else {
        const created = await adminProducts.create(payload);
        productId = created.id || created.product?.id;
      }

      // Upload new images if any
      if (newFiles.length > 0 && productId) {
        setUploadingImages(true);
        try {
          await adminProducts.uploadImages(productId, newFiles);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
        } finally {
          setUploadingImages(false);
        }
      }

      // Cleanup preview URLs
      newPreviews.forEach((url) => URL.revokeObjectURL(url));

      setFormOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setNewFiles([]);
      setNewPreviews([]);
      setExistingImages([]);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete product ─────────────────────────────── */
  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await adminProducts.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmName("");
      fetchProducts();
    } catch (err: any) {
      console.error("Failed to delete:", err);
    }
  }

  /* ── Toggle active inline ──────────────────────── */
  async function toggleActive(id: string, current: boolean) {
    try {
      await adminProducts.update(id, { is_active: !current });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
      );
    } catch (err) {
      console.error("Failed to toggle active:", err);
    }
  }

  /* ── Collection toggle in form ──────────────────── */
  function toggleCollection(collId: string) {
    setForm((prev) => {
      const ids = prev.collection_ids.includes(collId)
        ? prev.collection_ids.filter((c) => c !== collId)
        : [...prev.collection_ids, collId];
      return { ...prev, collection_ids: ids };
    });
  }

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--sf-text-primary)" }}
          >
            Product Catalog
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--sf-text-muted)" }}
          >
            {total} total product{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
          onClick={openAdd}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </Button>
      </motion.div>

      {/* ── Filters ─────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.05 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--sf-text-muted)" }}
          />
          <Input
            placeholder="Search by name, SKU..."
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

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            className="w-[160px] h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent
            style={{
              backgroundColor: "var(--sf-bg-surface-2)",
              borderColor: "var(--sf-divider)",
            }}
          >
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger
            className="w-[160px] h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            <SelectValue placeholder="All Availability" />
          </SelectTrigger>
          <SelectContent
            style={{
              backgroundColor: "var(--sf-bg-surface-2)",
              borderColor: "var(--sf-divider)",
            }}
          >
            <SelectItem value="all">All Availability</SelectItem>
            {AVAILABILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={isNewFilter} onValueChange={setIsNewFilter}>
          <SelectTrigger
            className="w-[130px] h-9"
            style={{
              backgroundColor: "var(--sf-bg-surface-1)",
              borderColor: "var(--sf-divider)",
              color: "var(--sf-text-secondary)",
            }}
          >
            <SelectValue placeholder="New Arrivals" />
          </SelectTrigger>
          <SelectContent
            style={{
              backgroundColor: "var(--sf-bg-surface-2)",
              borderColor: "var(--sf-divider)",
            }}
          >
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="true">New Only</SelectItem>
            <SelectItem value="false">Not New</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* ── Product Table ──────────────────────────── */}
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
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Package
                  className="w-10 h-10"
                  style={{ color: "var(--sf-text-muted)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "var(--sf-text-muted)" }}
                >
                  No products found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "var(--sf-divider)" }}>
                    <TableHead
                      className="w-14"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Image
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Name
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      SKU
                    </TableHead>
                    <TableHead
                      className="hidden md:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Category
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Price
                    </TableHead>
                    <TableHead
                      className="hidden lg:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Carat
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Availability
                    </TableHead>
                    <TableHead
                      className="hidden md:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
                      Imgs
                    </TableHead>
                    <TableHead
                      className="hidden lg:table-cell"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1" />
                      Views
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Active
                    </TableHead>
                    <TableHead style={{ color: "var(--sf-text-muted)" }}>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {products.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-[var(--sf-bg-surface-2)]"
                        style={{ borderColor: "var(--sf-divider)" }}
                      >
                        {/* Thumbnail */}
                        <TableCell>
                          <div
                            className="w-10 h-10 rounded overflow-hidden flex items-center justify-center"
                            style={{
                              backgroundColor: "var(--sf-bg-surface-2)",
                            }}
                          >
                            {p.image ? (
                              <img
                                src={imageUrl(p.image)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon
                                className="w-4 h-4"
                                style={{ color: "var(--sf-text-muted)" }}
                              />
                            )}
                          </div>
                        </TableCell>

                        {/* Name + is_new badge */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-sm font-medium truncate max-w-[180px]"
                              style={{ color: "var(--sf-text-primary)" }}
                            >
                              {p.name}
                            </span>
                            {p.is_new && (
                              <Badge
                                className="text-[9px] h-4 px-1"
                                style={{
                                  backgroundColor: "rgba(59,130,246,0.15)",
                                  color: "var(--sf-blue-primary)",
                                  border: "none",
                                }}
                              >
                                NEW
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                          <span
                            className="text-xs font-mono"
                            style={{ color: "var(--sf-text-secondary)" }}
                          >
                            {p.sku}
                          </span>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="hidden md:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-secondary)" }}
                          >
                            {p.category || "--"}
                          </span>
                        </TableCell>

                        {/* Price */}
                        <TableCell>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sf-text-primary)" }}
                          >
                            {formatPrice(p.base_price)}
                          </span>
                        </TableCell>

                        {/* Carat */}
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-secondary)" }}
                          >
                            {p.carat != null ? `${p.carat} ct` : "--"}
                          </span>
                        </TableCell>

                        {/* Availability */}
                        <TableCell>{availabilityBadge(p.availability)}</TableCell>

                        {/* Image count */}
                        <TableCell className="hidden md:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            {p.image_count ?? 0}
                          </span>
                        </TableCell>

                        {/* Views */}
                        <TableCell className="hidden lg:table-cell">
                          <span
                            className="text-sm"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            {p.view_count ?? 0}
                          </span>
                        </TableCell>

                        {/* Active toggle */}
                        <TableCell>
                          <button
                            onClick={() => toggleActive(p.id, p.is_active)}
                            className="cursor-pointer"
                            title={p.is_active ? "Deactivate" : "Activate"}
                          >
                            {activeBadge(p.is_active)}
                          </button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(p.id)}
                              title="Edit product"
                            >
                              <Pencil
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--sf-blue-primary)" }}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setDeleteConfirmId(p.id);
                                setDeleteConfirmName(p.name);
                              }}
                              title="Delete product"
                            >
                              <Trash2
                                className="w-3.5 h-3.5"
                                style={{ color: "var(--destructive)" }}
                              />
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
        </Card>
      </motion.div>

      {/* ── Pagination ─────────────────────────────── */}
      {totalPages > 1 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="flex items-center justify-between"
        >
          <p
            className="text-xs"
            style={{ color: "var(--sf-text-muted)" }}
          >
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-secondary)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                  style={
                    page === pageNum
                      ? {
                          backgroundColor: "var(--sf-teal)",
                          color: "#fff",
                          border: "none",
                        }
                      : {
                          borderColor: "var(--sf-divider)",
                          color: "var(--sf-text-secondary)",
                        }
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-secondary)",
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
         ADD / EDIT PRODUCT DIALOG
         ══════════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden"
          style={{
            backgroundColor: "var(--sf-bg-surface-1)",
            borderColor: "var(--sf-divider)",
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              {editingId ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              {editingId
                ? "Update product details and media"
                : "Fill in the product information below"}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "var(--sf-blue-primary)" }}
              />
            </div>
          ) : (
            <>
              {formError && (
                <div
                  className="mx-6 mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "rgba(194,23,59,0.1)",
                    color: "var(--destructive)",
                    border: "1px solid rgba(194,23,59,0.25)",
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <Tabs
                value={formTab}
                onValueChange={setFormTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="px-6 pt-4">
                  <TabsList
                    className="w-full"
                    style={{
                      backgroundColor: "var(--sf-bg-surface-2)",
                    }}
                  >
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="specs">Specs</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="availability">Availability</TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(90vh - 260px)" }}>
                  {/* ── BASIC INFO TAB ──────────────── */}
                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SurfaceInput
                        label="Product Name *"
                        placeholder="e.g. Radiant Diamond Solitaire Ring"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                      <SurfaceInput
                        label="SKU *"
                        placeholder="e.g. RNG-001"
                        value={form.sku}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, sku: e.target.value }))
                        }
                      />
                    </div>

                    <SurfaceTextarea
                      label="Description"
                      placeholder="Detailed product description..."
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SurfaceSelect
                        label="Category"
                        placeholder="Select category"
                        value={form.category_id}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, category_id: v }))
                        }
                      >
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SurfaceSelect>

                      <SurfaceInput
                        label="Occasion Tags"
                        placeholder="wedding, anniversary, birthday"
                        value={form.occasion_tags}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            occasion_tags: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Collections multi-select */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: "var(--sf-text-secondary)" }}
                      >
                        Collections
                      </label>
                      <div
                        className="rounded-md border p-3 grid grid-cols-2 sm:grid-cols-3 gap-2"
                        style={{
                          backgroundColor: "var(--sf-bg-surface-2)",
                          borderColor: "var(--sf-divider)",
                        }}
                      >
                        {collections.length === 0 ? (
                          <p
                            className="text-xs col-span-full"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            No collections available
                          </p>
                        ) : (
                          collections.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={form.collection_ids.includes(c.id)}
                                onCheckedChange={() => toggleCollection(c.id)}
                              />
                              <span
                                className="text-xs"
                                style={{ color: "var(--sf-text-primary)" }}
                              >
                                {c.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── MEDIA TAB ──────────────────── */}
                  <TabsContent value="media" className="space-y-4 mt-0">
                    {/* Drop zone */}
                    <div
                      ref={dropZoneRef}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
                      style={{
                        borderColor: dragOver
                          ? "var(--sf-teal)"
                          : "var(--sf-divider)",
                        backgroundColor: dragOver
                          ? "rgba(45,212,191,0.05)"
                          : "var(--sf-bg-surface-2)",
                      }}
                    >
                      <ImagePlus
                        className="w-8 h-8 mx-auto mb-2"
                        style={{
                          color: dragOver
                            ? "var(--sf-teal)"
                            : "var(--sf-text-muted)",
                        }}
                      />
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--sf-text-secondary)" }}
                      >
                        {dragOver
                          ? "Drop images here"
                          : "Drag & drop images, or click to browse"}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--sf-text-muted)" }}
                      >
                        Up to {MAX_IMAGES} images. JPG, PNG, WEBP accepted.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleFileSelect(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {/* Existing images */}
                    {existingImages.length > 0 && (
                      <div className="space-y-2">
                        <label
                          className="text-xs font-medium"
                          style={{ color: "var(--sf-text-secondary)" }}
                        >
                          Existing Images ({existingImages.length})
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {existingImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group rounded-lg overflow-hidden border"
                              style={{
                                borderColor: img.is_primary
                                  ? "var(--sf-teal)"
                                  : "var(--sf-divider)",
                                borderWidth: img.is_primary ? 2 : 1,
                              }}
                            >
                              <img
                                src={imageUrl(img.url)}
                                alt="Product"
                                className="w-full aspect-square object-cover"
                              />
                              {img.is_primary && (
                                <div
                                  className="absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-semibold"
                                  style={{
                                    backgroundColor: "var(--sf-teal)",
                                    color: "#fff",
                                  }}
                                >
                                  Primary
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                {!img.is_primary && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-white hover:bg-white/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetPrimary(img.id);
                                    }}
                                    title="Set as primary"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteExistingImage(img.id);
                                  }}
                                  title="Delete image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New file previews */}
                    {newPreviews.length > 0 && (
                      <div className="space-y-2">
                        <label
                          className="text-xs font-medium"
                          style={{ color: "var(--sf-text-secondary)" }}
                        >
                          New Images to Upload ({newPreviews.length})
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {newPreviews.map((preview, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-lg overflow-hidden border"
                              style={{ borderColor: "var(--sf-divider)" }}
                            >
                              <img
                                src={preview}
                                alt={`New ${idx + 1}`}
                                className="w-full aspect-square object-cover"
                              />
                              <div
                                className="absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-semibold"
                                style={{
                                  backgroundColor: "var(--sf-blue-primary)",
                                  color: "#fff",
                                }}
                              >
                                New
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                                  onClick={() => removeNewFile(idx)}
                                  title="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {existingImages.length === 0 && newPreviews.length === 0 && (
                      <div className="text-center py-6">
                        <p
                          className="text-sm"
                          style={{ color: "var(--sf-text-muted)" }}
                        >
                          No images yet. Upload some above.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── SPECS TAB ──────────────────── */}
                  <TabsContent value="specs" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SurfaceInput
                        label="Metal Type"
                        placeholder="e.g. 18K Gold, Platinum"
                        value={form.metal_type}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, metal_type: e.target.value }))
                        }
                      />
                      <SurfaceInput
                        label="Metal Weight (g)"
                        type="number"
                        placeholder="e.g. 4.5"
                        value={form.metal_weight}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            metal_weight: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Separator
                      style={{ backgroundColor: "var(--sf-divider)" }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SurfaceInput
                        label="Diamond Type"
                        placeholder="e.g. Natural, Lab-grown"
                        value={form.diamond_type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            diamond_type: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Diamond Shape"
                        placeholder="e.g. Round, Princess, Oval"
                        value={form.diamond_shape}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            diamond_shape: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Diamond Color"
                        placeholder="e.g. D, E, F"
                        value={form.diamond_color}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            diamond_color: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Diamond Clarity"
                        placeholder="e.g. VS1, VVS2"
                        value={form.diamond_clarity}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            diamond_clarity: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Diamond Certification"
                        placeholder="e.g. GIA, IGI"
                        value={form.diamond_certification}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            diamond_certification: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Setting Type"
                        placeholder="e.g. Prong, Bezel, Pave"
                        value={form.setting_type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            setting_type: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Separator
                      style={{ backgroundColor: "var(--sf-divider)" }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SurfaceInput
                        label="Hallmark"
                        placeholder="e.g. BIS 916"
                        value={form.hallmark}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, hallmark: e.target.value }))
                        }
                      />
                      <SurfaceInput
                        label="Width (mm)"
                        type="number"
                        placeholder="e.g. 2.5"
                        value={form.width_mm}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, width_mm: e.target.value }))
                        }
                      />
                      <SurfaceInput
                        label="Height (mm)"
                        type="number"
                        placeholder="e.g. 8"
                        value={form.height_mm}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, height_mm: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SurfaceInput
                        label="Gold Purity Options"
                        placeholder="14K, 18K, 22K"
                        value={form.gold_purity_options}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            gold_purity_options: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Finish Options"
                        placeholder="Polished, Matte, Brushed"
                        value={form.finish_options}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            finish_options: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Separator
                      style={{ backgroundColor: "var(--sf-divider)" }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SurfaceInput
                        label="Carat"
                        type="number"
                        placeholder="e.g. 1.5"
                        value={form.carat}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, carat: e.target.value }))
                        }
                      />
                      <SurfaceInput
                        label="Carat Range Min"
                        type="number"
                        placeholder="e.g. 0.5"
                        value={form.carat_range_min}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            carat_range_min: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Carat Range Max"
                        type="number"
                        placeholder="e.g. 3.0"
                        value={form.carat_range_max}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            carat_range_max: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </TabsContent>

                  {/* ── PRICING TAB ────────────────── */}
                  <TabsContent value="pricing" className="space-y-4 mt-0">
                    <SurfaceInput
                      label="Base Price (INR) *"
                      type="number"
                      placeholder="e.g. 45000"
                      value={form.base_price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, base_price: e.target.value }))
                      }
                    />

                    <SurfaceTextarea
                      label="Price Modifiers (JSON)"
                      placeholder='{"18K": 1.0, "22K": 1.25, "Platinum": 1.5}'
                      value={form.price_modifiers}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          price_modifiers: e.target.value,
                        }))
                      }
                      className="font-mono text-xs min-h-[120px]"
                    />
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      Optional JSON object for price multipliers or adjustments
                      based on material/option selections.
                    </p>
                  </TabsContent>

                  {/* ── AVAILABILITY TAB ───────────── */}
                  <TabsContent value="availability" className="space-y-4 mt-0">
                    <SurfaceSelect
                      label="Availability"
                      placeholder="Select availability"
                      value={form.availability}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, availability: v }))
                      }
                    >
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SurfaceSelect>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SurfaceInput
                        label="Lead Time (days)"
                        type="number"
                        placeholder="e.g. 7"
                        value={form.lead_time_days}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            lead_time_days: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Min Order Qty"
                        type="number"
                        placeholder="e.g. 1"
                        value={form.min_order_qty}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            min_order_qty: e.target.value,
                          }))
                        }
                      />
                      <SurfaceInput
                        label="Max Order Qty"
                        type="number"
                        placeholder="e.g. 100"
                        value={form.max_order_qty}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            max_order_qty: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Separator
                      style={{ backgroundColor: "var(--sf-divider)" }}
                    />

                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={form.is_new}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({
                              ...f,
                              is_new: checked === true,
                            }))
                          }
                        />
                        <div>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sf-text-primary)" }}
                          >
                            Mark as New Arrival
                          </span>
                          <p
                            className="text-xs"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            Displays a "New" badge and includes in new arrivals
                            section
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={form.is_active}
                          onCheckedChange={(checked) =>
                            setForm((f) => ({
                              ...f,
                              is_active: checked === true,
                            }))
                          }
                        />
                        <div>
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sf-text-primary)" }}
                          >
                            Active (Visible to Retailers)
                          </span>
                          <p
                            className="text-xs"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            Inactive products are hidden from the catalog
                          </p>
                        </div>
                      </label>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

              <DialogFooter className="px-6 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormOpen(false)}
                  style={{
                    borderColor: "var(--sf-divider)",
                    color: "var(--sf-text-secondary)",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={saving || uploadingImages}
                  onClick={handleSubmit}
                  style={{
                    backgroundColor: "var(--sf-teal)",
                    color: "#fff",
                  }}
                >
                  {saving || uploadingImages ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      {uploadingImages ? "Uploading Images..." : "Saving..."}
                    </>
                  ) : editingId ? (
                    "Update Product"
                  ) : (
                    "Create Product"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
         DELETE CONFIRMATION DIALOG
         ══════════════════════════════════════════════ */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmId(null);
            setDeleteConfirmName("");
          }
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
              Delete Product
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              Are you sure you want to delete{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--sf-text-primary)" }}
              >
                {deleteConfirmName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteConfirmId(null);
                setDeleteConfirmName("");
              }}
              style={{
                borderColor: "var(--sf-divider)",
                color: "var(--sf-text-secondary)",
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              style={{
                backgroundColor: "var(--destructive)",
                color: "#fff",
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
