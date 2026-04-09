import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  Star,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { adminProducts } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Category = { id: string; name: string };

type ProductImage = {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  media_type: string;
};

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

const AVAILABILITY_OPTIONS = [
  { value: "in-stock",       label: "In Stock"       },
  { value: "made-to-order",  label: "Made to Order"  },
  { value: "out-of-stock",   label: "Out of Stock"   },
] as const;

const AVAILABILITY_STYLE: Record<string, { bg: string; text: string }> = {
  "in-stock":      { bg: "rgba(34,197,94,0.12)",   text: "#22c55e" },
  "made-to-order": { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b" },
  "out-of-stock":  { bg: "rgba(239,68,68,0.12)",   text: "#ef4444" },
};

function formatPrice(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════════════════
   SAMPLE FILE DOWNLOAD
   ═══════════════════════════════════════════════════════ */

async function downloadSampleFile() {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const headers = [
    "name","sku","description","category",
    "base_price","metal_type","gold_colour","metal_weight",
    "diamond_type","diamond_shape","diamond_color","diamond_clarity",
    "diamond_certification","carat","setting_type","hallmark",
    "width_mm","height_mm","color_stone_name","color_stone_quality",
    "availability","lead_time_days","min_order_qty","max_order_qty",
    "is_new","occasion_tags","finish_options","images",
  ];
  const hints = [
    "Product Name","RNG-18K-001","Description text","Ring / Necklace / Bracelet",
    "45000","14KT | 18KT | 22KT","YELLOW | ROSE | WHITE | TWO TONE","4.5 (grams)",
    "Natural | Lab-grown","Round | Princess | Pan | Baguette | Marquise | Oval | Solitaire | Emerald | Cushion | Radiant",
    "EF | FG | GH | HI | IJ","VVS | VVS-VS | VS | VS-SI | SI",
    "GIA | IGI","1.5","Prong | Bezel | Pave","BIS 916",
    "2.5 (mm)","8.0 (mm)",
    "Precious Stones | Semi Precious Stones | Synthetic Stones | Pearl | Beads | Kundan",
    "EMERALD | Ruby | BLUE SAPPHIRE | CORAL | etc.",
    "in-stock | made-to-order | out-of-stock","7 (days)","1","100",
    "true | false","wedding, anniversary","Polished, Matte",
    "filenames (e.g. ring1.jpg, ring2.png)",
  ];
  const sample = [
    "Radiant Diamond Solitaire Ring","RNG-18K-001","Elegant 18K gold ring","Ring",
    "45000","18KT","YELLOW","4.5",
    "Natural","Round","EF","VVS",
    "GIA","1.5","Prong","BIS 916",
    "2.5","8.0","Precious Stones","EMERALD",
    "in-stock","7","1","100",
    "true","wedding, anniversary","Polished",
    "ring-front.jpg, ring-side.jpg",
  ];

  const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
  zip.file("products.csv", [headers,hints,sample].map(r=>r.map(escape).join(",")).join("\n"));

  const canvas = document.createElement("canvas");
  canvas.width = 100; canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e0e0e0"; ctx.fillRect(0,0,100,100);
  ctx.fillStyle = "#999"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Sample", 50, 55);
  const imgBytes = Uint8Array.from(atob(canvas.toDataURL("image/jpeg",0.8).split(",")[1]), c=>c.charCodeAt(0));
  zip.file("ring-front.jpg", imgBytes);
  zip.file("ring-side.jpg", imgBytes);

  zip.file("README.txt",
`PRODUCT IMPORT TEMPLATE
=======================
HOW TO USE:
1. Open products.csv and fill in your product data
2. Row 2 (hints) will be auto-skipped during import
3. Required columns: name, sku

IMAGES:
- Place product images (JPG, PNG, WEBP) in this ZIP alongside the CSV
- In the "images" column, list filenames separated by commas
- First image listed becomes the primary/thumbnail

ALLOWED VALUES:
- metal_type:    14KT, 18KT, 22KT
- availability:  in-stock, made-to-order, out-of-stock
- is_new:        true, false
`);

  const blob = await zip.generateAsync({ type: "blob" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "product_import_template.zip",
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts]               = useState<ProductListItem[]>([]);
  const [total, setTotal]                     = useState(0);
  const [page, setPage]                       = useState(1);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState("");
  const [categoryFilter, setCategoryFilter]   = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [isNewFilter, setIsNewFilter]         = useState<string>("all");
  const [categories, setCategories]           = useState<Category[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const [importOpen, setImportOpen]     = useState(false);
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number; skipped: number; total: number;
    imagesImported?: number;
    errors?: { row: number; reason: string }[];
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  // Image management dialog
  const [imgDialogPid,   setImgDialogPid]   = useState<string | null>(null);
  const [imgDialogName,  setImgDialogName]  = useState("");
  const [imgList,        setImgList]        = useState<ProductImage[]>([]);
  const [imgLoading,     setImgLoading]     = useState(false);
  const [imgUploading,   setImgUploading]   = useState(false);
  const [imgDragOver,    setImgDragOver]    = useState(false);
  const imgUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    adminProducts.categories().then((cats: Category[]) => setCategories(cats || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
      if (search.trim())                params.search       = search.trim();
      if (categoryFilter !== "all")     params.category     = categoryFilter;
      if (availabilityFilter !== "all") params.availability = availabilityFilter;
      if (isNewFilter !== "all")        params.is_new       = isNewFilter;
      const data = await adminProducts.list(params);
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, availabilityFilter, isNewFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search, categoryFilter, availabilityFilter, isNewFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      await adminProducts.delete(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmName("");
      fetchProducts();
    } catch (err) { console.error("Failed to delete:", err); }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await adminProducts.update(id, { is_active: !current });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
    } catch (err) { console.error("Failed to toggle active:", err); }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await adminProducts.importCsv(importFile);
      setImportResult(result);
      fetchProducts();
    } catch (e: any) {
      setImportResult({ imported: 0, skipped: 0, total: 0, errors: [{ row: 0, reason: e.message || "Import failed" }] });
    } finally {
      setImporting(false);
    }
  }

  /* ── Image dialog handlers ──────────────────────── */
  async function openImgDialog(pid: string, name: string) {
    setImgDialogPid(pid);
    setImgDialogName(name);
    setImgList([]);
    setImgLoading(true);
    try {
      const imgs = await adminProducts.listImages(pid);
      setImgList(imgs);
    } catch (err) { console.error(err); }
    setImgLoading(false);
  }

  async function handleImgUpload(files: FileList | File[]) {
    if (!imgDialogPid || !files.length) return;
    setImgUploading(true);
    try {
      await adminProducts.uploadImages(imgDialogPid, files);
      const imgs = await adminProducts.listImages(imgDialogPid);
      setImgList(imgs);
      const primary = imgs.find((i: ProductImage) => i.is_primary);
      setProducts(prev => prev.map(p =>
        p.id === imgDialogPid
          ? { ...p, image_count: imgs.length, image: primary?.image_url ?? p.image }
          : p
      ));
    } catch (err) { console.error(err); }
    setImgUploading(false);
  }

  async function handleImgDelete(imageId: string) {
    if (!imgDialogPid) return;
    try {
      await adminProducts.deleteImage(imageId);
      const next = imgList.filter(i => i.id !== imageId);
      setImgList(next);
      setProducts(prev => prev.map(p =>
        p.id === imgDialogPid ? { ...p, image_count: next.length } : p
      ));
    } catch (err) { console.error(err); }
  }

  async function handleImgSetPrimary(imageId: string) {
    if (!imgDialogPid) return;
    try {
      await adminProducts.setPrimaryImage(imageId);
      const next = imgList.map(i => ({ ...i, is_primary: i.id === imageId }));
      setImgList(next);
      const primary = next.find(i => i.is_primary);
      setProducts(prev => prev.map(p =>
        p.id === imgDialogPid ? { ...p, image: primary?.image_url ?? p.image } : p
      ));
    } catch (err) { console.error(err); }
  }

  const activeFilters = [categoryFilter, availabilityFilter, isNewFilter].filter(v => v !== "all").length;

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-7 space-y-5">

      {/* ── Page header ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Melodrama','Georgia',serif", color: "var(--sf-text-primary)" }}
          >
            Product Catalog
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            {total.toLocaleString()} product{total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            className="gap-1.5 h-9"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
            onClick={downloadSampleFile}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sample File</span>
          </Button>
          <Button
            size="sm" variant="outline"
            className="gap-1.5 h-9"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
            onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(true); }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-9 px-4"
            style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
            onClick={() => navigate("/admin/products/new")}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Button>
        </div>
      </motion.div>

      {/* ── Filter bar ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--sf-text-muted)" }} />
          <Input
            placeholder="Search name, SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter icon + selects */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}>
            <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
            {activeFilters > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(48,184,191,0.15)", color: "var(--sf-teal)" }}>
                {activeFilters}
              </span>
            )}
          </div>

          <FilterSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="Category" width="150px">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect value={availabilityFilter} onChange={setAvailabilityFilter} placeholder="Availability" width="148px">
            <SelectItem value="all">All Availability</SelectItem>
            {AVAILABILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </FilterSelect>

          <FilterSelect value={isNewFilter} onChange={setIsNewFilter} placeholder="Arrivals" width="130px">
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="true">New Only</SelectItem>
            <SelectItem value="false">Not New</SelectItem>
          </FilterSelect>

          {activeFilters > 0 && (
            <button
              onClick={() => { setCategoryFilter("all"); setAvailabilityFilter("all"); setIsNewFilter("all"); }}
              className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Product Table ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
      >
        {/* Table header */}
        <div
          className="grid items-center px-4 py-2.5 border-b text-[11px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: "var(--sf-divider)",
            color: "var(--sf-text-muted)",
            gridTemplateColumns: "56px 1fr 110px 110px 100px 90px 72px 60px 80px",
          }}
        >
          <span></span>
          <span>Product</span>
          <span className="hidden md:block">Category</span>
          <span>Price</span>
          <span>Availability</span>
          <span className="hidden lg:block">Carat</span>
          <span className="hidden md:block text-center">Imgs</span>
          <span className="hidden lg:block text-center">Views</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonRows />
        ) : products.length === 0 ? (
          <EmptyState hasFilters={!!search || activeFilters > 0} onClear={() => { setSearch(""); setCategoryFilter("all"); setAvailabilityFilter("all"); setIsNewFilter("all"); }} />
        ) : (
          <AnimatePresence initial={false}>
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.015 }}
                className="group grid items-center px-4 py-3 border-b last:border-0 transition-colors"
                style={{
                  borderColor: "var(--sf-divider)",
                  backgroundColor: "transparent",
                  gridTemplateColumns: "56px 1fr 110px 110px 100px 90px 72px 60px 80px",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Thumbnail — click to manage images */}
                <button
                  onClick={() => openImgDialog(p.id, p.name)}
                  title="Manage images"
                  className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {p.image ? (
                    <img src={imageUrl(p.image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ImageIcon className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                  )}
                  <span
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </span>
                </button>

                {/* Name + meta */}
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>
                      {p.name}
                    </span>
                    {p.is_new && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(48,184,191,0.15)", color: "var(--sf-teal)" }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono" style={{ color: "var(--sf-text-muted)" }}>{p.sku}</span>
                    {p.metal_type && (
                      <span className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>· {p.metal_type}</span>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="hidden md:block pr-2">
                  {p.category ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: "rgba(38,96,160,0.12)", color: "var(--sf-blue-secondary)" }}
                    >
                      {p.category}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>—</span>
                  )}
                </div>

                {/* Price */}
                <div>
                  <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
                    {formatPrice(p.base_price)}
                  </span>
                </div>

                {/* Availability */}
                <div>
                  {(() => {
                    const s = AVAILABILITY_STYLE[p.availability] ?? AVAILABILITY_STYLE["out-of-stock"];
                    const label = AVAILABILITY_OPTIONS.find(o => o.value === p.availability)?.label ?? p.availability;
                    return (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.text }}>
                        {label}
                      </span>
                    );
                  })()}
                </div>

                {/* Carat */}
                <div className="hidden lg:block">
                  <span className="text-xs" style={{ color: "var(--sf-text-secondary)" }}>
                    {p.carat != null ? `${p.carat} ct` : "—"}
                  </span>
                </div>

                {/* Image count */}
                <div className="hidden md:flex items-center justify-center gap-1">
                  <ImageIcon className="w-3 h-3" style={{ color: "var(--sf-text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{p.image_count ?? 0}</span>
                </div>

                {/* Views */}
                <div className="hidden lg:flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" style={{ color: "var(--sf-text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{p.view_count ?? 0}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(p.id, p.is_active)}
                    title={p.is_active ? "Deactivate" : "Activate"}
                    className="w-7 h-4 rounded-full transition-all shrink-0 relative"
                    style={{
                      backgroundColor: p.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)",
                      border: `1px solid ${p.is_active ? "#22c55e44" : "#ef444444"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                      style={{
                        backgroundColor: p.is_active ? "#22c55e" : "#ef4444",
                        left: p.is_active ? "calc(100% - 14px)" : "1px",
                      }}
                    />
                  </button>

                  <button
                    onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                    title="Edit"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(38,96,160,0.15)]"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: "var(--sf-blue-primary)" }} />
                  </button>

                  <button
                    onClick={() => { setDeleteConfirmId(p.id); setDeleteConfirmName(p.name); }}
                    title="Delete"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(239,68,68,0.12)]"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Pagination ─────────────────────────────── */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between"
        >
          <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>

          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </PageBtn>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let n: number;
              if (totalPages <= 5)       n = i + 1;
              else if (page <= 3)        n = i + 1;
              else if (page >= totalPages - 2) n = totalPages - 4 + i;
              else n = page - 2 + i;
              return (
                <PageBtn key={n} onClick={() => setPage(n)} active={page === n}>
                  {n}
                </PageBtn>
              );
            })}

            <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </PageBtn>
          </div>
        </motion.div>
      )}

      {/* ── Delete dialog ───────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) { setDeleteConfirmId(null); setDeleteConfirmName(""); } }}>
        <DialogContent
          className="sm:max-w-md"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
              <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>Delete Product</DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              Are you sure you want to delete{" "}
              <span className="font-semibold" style={{ color: "var(--sf-text-primary)" }}>{deleteConfirmName}</span>?
              {" "}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(""); }}
              style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleDelete} style={{ backgroundColor: "#ef4444", color: "#fff" }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV dialog ───────────────────────── */}
      <Dialog open={importOpen} onOpenChange={open => { if (!open) setImportOpen(false); }}>
        <DialogContent className="sm:max-w-lg" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
                Import Products
              </div>
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              Upload a CSV or ZIP (CSV + images). Add an "images" column with comma-separated filenames.
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-3 py-1">
              <div
                onClick={() => importFileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: importFile ? "var(--sf-teal)" : "var(--sf-divider)",
                  backgroundColor: importFile ? "rgba(48,184,191,0.04)" : "transparent",
                }}
                onMouseEnter={e => { if (!importFile) (e.currentTarget as HTMLElement).style.borderColor = "rgba(48,184,191,0.5)"; }}
                onMouseLeave={e => { if (!importFile) (e.currentTarget as HTMLElement).style.borderColor = "var(--sf-divider)"; }}
              >
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(48,184,191,0.12)" }}>
                      <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>{importFile.name}</p>
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                      <Upload className="w-5 h-5" style={{ color: "var(--sf-text-muted)" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>Click to select file</p>
                    <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>CSV or ZIP with product images · Max 100 MB</p>
                  </>
                )}
                <input ref={importFileRef} type="file" accept=".csv,.zip" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); e.target.value = ""; }} />
              </div>

              <div className="flex items-center gap-2 text-xs px-1" style={{ color: "var(--sf-text-muted)" }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Duplicate SKUs are automatically skipped.
              </div>
            </div>
          ) : (
            <div className="py-1">
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: importResult.imported > 0 ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)" }}
                  >
                    {importResult.imported > 0
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
                      : <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                      {importResult.imported > 0 ? "Import Complete" : "No Products Imported"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                      {importResult.imported} imported · {importResult.skipped} skipped · {importResult.total} total
                      {importResult.imagesImported ? ` · ${importResult.imagesImported} images` : ""}
                    </p>
                  </div>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto border-t pt-3" style={{ borderColor: "var(--sf-divider)" }}>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: "var(--sf-text-muted)" }}>
                        <span className="shrink-0 font-mono" style={{ color: "#f59e0b" }}>Row {err.row}:</span>
                        {err.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {!importResult ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}
                  style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!importFile || importing} onClick={handleImport}
                  className="gap-1.5" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                  {importing
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                    : <><Upload className="w-3.5 h-3.5" /> Import</>}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setImportOpen(false)} style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image management dialog ─────────────────── */}
      <Dialog open={!!imgDialogPid} onOpenChange={open => { if (!open) { setImgDialogPid(null); setImgList([]); } }}>
        <DialogContent
          className="sm:max-w-2xl"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
                  <ImagePlus className="w-4 h-4" style={{ color: "#3b82f6" }} />
                </div>
                Manage Images
              </div>
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              {imgDialogName} — click the star to set primary, trash to delete
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Existing images grid */}
            {imgLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl animate-pulse"
                    style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
                ))}
              </div>
            ) : imgList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-2xl"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px dashed var(--sf-divider)" }}>
                <ImageIcon className="w-8 h-8 mb-2" style={{ color: "var(--sf-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {imgList.map((img) => (
                  <div key={img.id} className="group/img relative aspect-square rounded-xl overflow-hidden"
                    style={{
                      border: img.is_primary ? "2px solid var(--sf-teal)" : "2px solid var(--sf-divider)",
                      backgroundColor: "var(--sf-bg-surface-2)",
                    }}>
                    <img
                      src={imageUrl(img.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {/* Primary badge */}
                    {img.is_primary && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                        <Star className="w-2.5 h-2.5 fill-current" /> PRIMARY
                      </span>
                    )}
                    {/* Hover actions */}
                    <div className="absolute inset-0 flex items-end justify-end gap-1 p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}>
                      {!img.is_primary && (
                        <button
                          onClick={() => handleImgSetPrimary(img.id)}
                          title="Set as primary"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ backgroundColor: "rgba(245,158,11,0.85)", border: "none", cursor: "pointer" }}
                        >
                          <Star className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleImgDelete(img.id)}
                        title="Delete image"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "rgba(239,68,68,0.85)", border: "none", cursor: "pointer" }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImgDragOver(false); handleImgUpload(e.dataTransfer.files); }}
              onClick={() => imgUploadRef.current?.click()}
              className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all"
              style={{
                borderColor: imgDragOver ? "#3b82f6" : "var(--sf-divider)",
                backgroundColor: imgDragOver ? "rgba(59,130,246,0.06)" : "transparent",
              }}
            >
              {imgUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#3b82f6" }} />
                  <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>Uploading…</span>
                </div>
              ) : (
                <>
                  <ImagePlus className="w-5 h-5 mx-auto mb-2" style={{ color: imgDragOver ? "#3b82f6" : "var(--sf-text-muted)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                    {imgDragOver ? "Drop to upload" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                    JPG, PNG, WEBP · up to 10 images
                  </p>
                </>
              )}
              <input
                ref={imgUploadRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleImgUpload(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => { setImgDialogPid(null); setImgList([]); }}
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function FilterSelect({
  value, onChange, placeholder, width, children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-9 text-xs"
        style={{
          width,
          backgroundColor: value !== "all" ? "rgba(48,184,191,0.08)" : "var(--sf-bg-surface-1)",
          borderColor: value !== "all" ? "rgba(48,184,191,0.3)" : "var(--sf-divider)",
          color: value !== "all" ? "var(--sf-teal)" : "var(--sf-text-secondary)",
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
        {children}
      </SelectContent>
    </Select>
  );
}

function PageBtn({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all disabled:opacity-30"
      style={{
        backgroundColor: active ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
        color: active ? "#fff" : "var(--sf-text-secondary)",
        border: `1px solid ${active ? "transparent" : "var(--sf-divider)"}`,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center px-4 py-3 border-b last:border-0 animate-pulse"
          style={{
            borderColor: "var(--sf-divider)",
            gridTemplateColumns: "56px 1fr 110px 110px 100px 90px 72px 60px 80px",
          }}
        >
          <div className="w-11 h-11 rounded-xl" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="pr-3 space-y-1.5">
            <div className="h-3 w-36 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
            <div className="h-2.5 w-20 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          </div>
          <div className="hidden md:block h-5 w-16 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="h-3 w-16 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="h-5 w-20 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="hidden lg:block h-3 w-10 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="hidden md:block h-3 w-6 rounded-full mx-auto" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="hidden lg:block h-3 w-6 rounded-full mx-auto" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          <div className="flex justify-center gap-1">
            <div className="w-7 h-4 rounded-full" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
            <div className="w-7 h-7 rounded-lg" style={{ backgroundColor: "var(--sf-bg-surface-2)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
        <Package className="w-6 h-6" style={{ color: "var(--sf-text-muted)" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>
          {hasFilters ? "No products match your filters" : "No products yet"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
          {hasFilters ? "Try clearing your search or filters" : "Add your first product to get started"}
        </p>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ backgroundColor: "rgba(48,184,191,0.1)", color: "var(--sf-teal)", border: "none", cursor: "pointer" }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
