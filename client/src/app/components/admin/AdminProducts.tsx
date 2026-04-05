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
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";
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
    <Badge className="text-[10px] h-5" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "none" }}>
      Active
    </Badge>
  ) : (
    <Badge className="text-[10px] h-5" style={{ backgroundColor: "rgba(194,23,59,0.15)", color: "var(--destructive)", border: "none" }}>
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

async function downloadSampleFile() {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const headers = [
    "name", "sku", "description", "category",
    "base_price", "metal_type", "gold_colour", "metal_weight",
    "diamond_type", "diamond_shape", "diamond_color", "diamond_clarity",
    "diamond_certification", "carat", "setting_type", "hallmark",
    "width_mm", "height_mm", "color_stone_name", "color_stone_quality",
    "availability", "lead_time_days", "min_order_qty", "max_order_qty",
    "is_new", "occasion_tags", "finish_options", "images",
  ];

  const hints = [
    "Product Name", "RNG-18K-001", "Description text", "Ring / Necklace / Bracelet",
    "45000", "14KT | 18KT | 22KT", "YELLOW | ROSE | WHITE | TWO TONE", "4.5 (grams)",
    "Natural | Lab-grown", "Round | Princess | Pan | Baguette | Marquise | Oval | Solitaire | Emerald | Cushion | Radiant",
    "EF | FG | GH | HI | IJ", "VVS | VVS-VS | VS | VS-SI | SI",
    "GIA | IGI", "1.5", "Prong | Bezel | Pave", "BIS 916",
    "2.5 (mm)", "8.0 (mm)",
    "Precious Stones | Semi Precious Stones | Synthetic Stones | Pearl | Beads | Kundan",
    "EMERALD | Ruby | BLUE SAPPHIRE | CORAL | etc.",
    "in-stock | made-to-order | out-of-stock", "7 (days)", "1", "100",
    "true | false", "wedding, anniversary", "Polished, Matte",
    "filenames (e.g. ring1.jpg, ring2.png)",
  ];

  const sample = [
    "Radiant Diamond Solitaire Ring", "RNG-18K-001", "Elegant 18K gold ring", "Ring",
    "45000", "18KT", "YELLOW", "4.5",
    "Natural", "Round", "EF", "VVS",
    "GIA", "1.5", "Prong", "BIS 916",
    "2.5", "8.0", "Precious Stones", "EMERALD",
    "in-stock", "7", "1", "100",
    "true", "wedding, anniversary", "Polished",
    "ring-front.jpg, ring-side.jpg",
  ];

  const escape = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = [headers, hints, sample].map((row) => row.map(escape).join(",")).join("\n");

  // Add CSV to ZIP
  zip.file("products.csv", csv);

  // Add sample placeholder images using canvas → JPEG blob
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = "#999";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Sample", 50, 55);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  const imgBase64 = dataUrl.split(",")[1];
  const imgBytes = Uint8Array.from(atob(imgBase64), c => c.charCodeAt(0));

  zip.file("ring-front.jpg", imgBytes);
  zip.file("ring-side.jpg", imgBytes);

  // Add README
  zip.file("README.txt",
`PRODUCT IMPORT TEMPLATE
=======================

HOW TO USE:
1. Open products.csv and fill in your product data
2. Row 2 (hints) will be auto-skipped during import — delete or keep it
3. Required columns: name, sku
4. All other columns are optional

IMAGES:
- Place your product images (JPG, PNG, WEBP) in this ZIP alongside the CSV
- In the "images" column, list filenames separated by commas
  Example: ring-front.jpg, ring-side.jpg
- First image listed becomes the primary/thumbnail image
- Image filenames are matched case-insensitively

ALLOWED VALUES:
- metal_type:       14KT, 18KT, 22KT
- gold_colour:      YELLOW, ROSE, WHITE, TWO TONE
- diamond_shape:    Round, Princess, Pan, Baguette, Marquise, Oval, Solitaire, Emerald, Cushion, Radiant
- diamond_color:    EF, FG, GH, HI, IJ
- diamond_clarity:  VVS, VVS-VS, VS, VS-SI, SI
- color_stone_name: Precious Stones, Semi Precious Stones, Synthetic Stones, Pearl, Beads, Kundan
- availability:     in-stock, made-to-order, out-of-stock
- is_new:           true, false

SAMPLE ZIP STRUCTURE:
  products.zip
  ├── products.csv
  ├── ring-front.jpg
  ├── ring-side.jpg
  ├── necklace-1.png
  └── README.txt (this file)

NOTES:
- Duplicate SKU will be skipped
- New categories will be auto-created if they don't exist
- Max file size: 100MB
`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product_import_template.zip";
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminProducts() {
  const navigate = useNavigate();

  /* ── List state ─────────────────────────────────── */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [isNewFilter, setIsNewFilter] = useState<string>("all");

  /* ── Categories for filter dropdown ────────────── */
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    adminProducts.categories().then((cats: Category[]) => setCategories(cats || [])).catch(() => {});
  }, []);

  /* ── Delete confirm ────────────────────────────── */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  /* ── CSV Import ────────────────────────────────── */
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; imagesImported?: number; errors?: { row: number; reason: string }[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
            onClick={downloadSampleFile}
          >
            <Download className="w-3.5 h-3.5" />
            Sample File
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
            onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(true); }}
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
            onClick={() => navigate("/admin/products/new")}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Button>
        </div>
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
                              onClick={() => navigate(`/admin/products/${p.id}/edit`)}
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

      {/* ── Import CSV Dialog ──────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) setImportOpen(false); }}>
        <DialogContent className="sm:max-w-lg" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
                Import Products from CSV
              </div>
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-muted)" }}>
              Upload a CSV file or a ZIP containing CSV + product images. Add an "images" column with filenames (e.g. ring1.jpg, ring2.png).
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4 py-2">
              {/* Drop zone */}
              <div
                onClick={() => importFileRef.current?.click()}
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-[var(--sf-teal)]"
                style={{ borderColor: importFile ? "var(--sf-teal)" : "var(--sf-divider)", backgroundColor: importFile ? "rgba(48,184,191,0.04)" : "transparent" }}
              >
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-8 h-8" style={{ color: "var(--sf-teal)" }} />
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>{importFile.name}</p>
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--sf-text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>Click to select a CSV or ZIP file</p>
                    <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>ZIP: include CSV + product images</p>
                  </>
                )}
                <input ref={importFileRef} type="file" accept=".csv,.zip" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) setImportFile(e.target.files[0]); e.target.value = ""; }} />
              </div>

              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--sf-text-muted)" }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Duplicate SKU or product codes will be skipped automatically.
              </div>
            </div>
          ) : (
            /* Result */
            <div className="space-y-4 py-2">
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                <div className="flex items-center gap-3">
                  {importResult.imported > 0 ? (
                    <CheckCircle2 className="w-8 h-8 shrink-0" style={{ color: "#22c55e" }} />
                  ) : (
                    <AlertTriangle className="w-8 h-8 shrink-0" style={{ color: "#f59e0b" }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                      {importResult.imported > 0 ? "Import Complete" : "No Products Imported"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                      {importResult.imported} imported · {importResult.skipped} skipped · {importResult.total} total rows
                      {importResult.imagesImported ? ` · ${importResult.imagesImported} images` : ""}
                    </p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
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
                  {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setImportOpen(false)}
                style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
