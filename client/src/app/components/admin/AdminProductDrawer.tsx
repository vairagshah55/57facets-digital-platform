import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Save, Loader2, ImagePlus, Trash2, Star, AlertCircle,
  Package, Image as ImageIcon, Layers, DollarSign, ShieldCheck, Plus,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { adminProducts } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type ProductDetail = {
  id: string; name: string; sku: string; description: string | null;
  base_price: number; carat: number | null; carat_range_min: number | null;
  carat_range_max: number | null; metal_type: string | null; metal_weight: number | null;
  diamond_type: string | null; diamond_shape: string | null; diamond_color: string | null;
  diamond_clarity: string | null; diamond_certification: string | null;
  setting_type: string | null; hallmark: string | null; width_mm: number | null;
  height_mm: number | null; gold_purity_options: string | null; finish_options: string | null;
  availability: "in-stock" | "made-to-order" | "out-of-stock"; lead_time_days: number | null;
  min_order_qty: number | null; max_order_qty: number | null; is_new: boolean;
  is_active: boolean; occasion_tags: string | null; price_modifiers: string | null;
  category_id: string | null; category: string | null;
  images: ProductImage[]; collections: { id: string; name: string }[];
};

type ProductImage = { id: string; url: string; is_primary: boolean; sort_order: number };
type Category = { id: string; name: string };
type Collection = { id: string; name: string };

type FormData = {
  name: string; sku: string; description: string; category_id: string;
  collection_ids: string[]; occasion_tags: string; metal_type: string;
  gold_colour: string; metal_weight: string; diamond_type: string;
  diamond_shape: string; diamond_color: string; diamond_clarity: string;
  diamond_certification: string; setting_type: string; hallmark: string;
  width_mm: string; height_mm: string; gold_purity_options: string;
  finish_options: string; carat: string; carat_range_min: string;
  carat_range_max: string; carat_options: number[]; color_stones: { name: string; quality: string }[];
  base_price: string; price_modifiers: string; availability: string;
  lead_time_days: string; min_order_qty: string; max_order_qty: string;
  is_new: boolean; is_active: boolean;
};

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "out-of-stock", label: "Out of Stock" },
] as const;

/* ── Jewellery spec dropdowns ── */
const GOLD_TYPES = ["14KT", "18KT", "22KT"];
const GOLD_COLOURS = ["YELLOW", "ROSE", "WHITE", "TWO TONE"];
const DIAMOND_SHAPES = ["Round", "Princess", "Pan", "Baguette", "Marquise", "Oval", "Solitaire", "Emerald", "Cushion", "Radiant"];
const DIAMOND_SHADES = ["EF", "FG", "GH", "HI", "IJ"];
const DIAMOND_QUALITIES = ["VVS", "VVS-VS", "VS", "VS-SI", "SI"];
const COLOR_STONE_NAMES = ["Precious Stones", "Semi Precious Stones", "Synthetic Stones", "Pearl", "Beads", "Kundan"];

const COLOR_STONE_QUALITY_MAP: Record<string, string[]> = {
  "Precious Stones": ["EMERALD", "Ruby", "BLUE SAPPHIRE", "YELLOW SAPPHIRE", "NAVRATNA"],
  "Semi Precious Stones": ["BLUE COLOUR STONE", "GREEN COLOUR STONE", "RED COLOUR STONE"],
  "Synthetic Stones": ["CORAL", "BLUE COLOUR STONE", "GREEN COLOUR STONE", "RED COLOUR STONE"],
  "Pearl": ["FRESH WATER PEARLS", "PEARL"],
  "Beads": ["Beads"],
  "Kundan": ["Kundan Billor"],
};

const MAX_IMAGES = 10;

const EMPTY: FormData = {
  name: "", sku: "", description: "", category_id: "", collection_ids: [],
  occasion_tags: "", metal_type: "", gold_colour: "", metal_weight: "",
  diamond_type: "", diamond_shape: "", diamond_color: "", diamond_clarity: "",
  diamond_certification: "", setting_type: "", hallmark: "",
  width_mm: "", height_mm: "", gold_purity_options: "", finish_options: "",
  carat: "", carat_range_min: "", carat_range_max: "", carat_options: [],
  color_stones: [],
  base_price: "", price_modifiers: "", availability: "in-stock",
  lead_time_days: "", min_order_qty: "", max_order_qty: "",
  is_new: false, is_active: true,
};

const TABS = [
  { id: "basic", label: "Basic", icon: Package },
  { id: "media", label: "Images", icon: ImageIcon },
  { id: "specs", label: "Specs", icon: Layers },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "status", label: "Status", icon: ShieldCheck },
] as const;

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function detailToForm(d: ProductDetail): FormData {
  return {
    name: d.name || "", sku: d.sku || "", description: d.description || "",
    category_id: d.category_id || "",
    collection_ids: d.collections?.map((c) => c.id) || [],
    occasion_tags: Array.isArray(d.occasion_tags) ? d.occasion_tags.join(", ") : (d.occasion_tags || ""),
    metal_type: d.metal_type || "", gold_colour: (d as any).gold_colour || "",
    metal_weight: d.metal_weight != null ? String(d.metal_weight) : "",
    diamond_type: d.diamond_type || "", diamond_shape: d.diamond_shape || "",
    diamond_color: d.diamond_color || "", diamond_clarity: d.diamond_clarity || "",
    diamond_certification: d.diamond_certification || "", setting_type: d.setting_type || "",
    hallmark: d.hallmark || "",
    width_mm: d.width_mm != null ? String(d.width_mm) : "",
    height_mm: d.height_mm != null ? String(d.height_mm) : "",
    gold_purity_options: Array.isArray(d.gold_purity_options) ? d.gold_purity_options.join(", ") : (d.gold_purity_options || ""),
    finish_options: Array.isArray(d.finish_options) ? d.finish_options.join(", ") : (d.finish_options || ""),
    carat: d.carat != null ? String(d.carat) : "",
    carat_range_min: d.carat_range_min != null ? String(d.carat_range_min) : "",
    carat_range_max: d.carat_range_max != null ? String(d.carat_range_max) : "",
    carat_options: Array.isArray(d.carat_options) ? d.carat_options.map(Number) : [],
    color_stones: (() => {
      const names = ((d as any).color_stone_name || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const quals = ((d as any).color_stone_quality || "").split(",").map((s: string) => s.trim());
      return names.map((name: string, i: number) => ({ name, quality: quals[i] || "" }));
    })(),
    base_price: d.base_price != null ? String(d.base_price) : "",
    price_modifiers: d.price_modifiers ? (typeof d.price_modifiers === "object" ? JSON.stringify(d.price_modifiers) : d.price_modifiers) : "",
    availability: d.availability || "in-stock",
    lead_time_days: d.lead_time_days != null ? String(d.lead_time_days) : "",
    min_order_qty: d.min_order_qty != null ? String(d.min_order_qty) : "",
    max_order_qty: d.max_order_qty != null ? String(d.max_order_qty) : "",
    is_new: d.is_new ?? false, is_active: d.is_active ?? true,
  };
}

function formToPayload(f: FormData) {
  return {
    name: f.name.trim(), sku: f.sku.trim(), description: f.description.trim() || null,
    category_id: f.category_id || null, collection_ids: f.collection_ids,
    occasion_tags: f.occasion_tags ? f.occasion_tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    metal_type: f.metal_type || null, gold_colour: f.gold_colour || null,
    metal_weight: f.metal_weight ? parseFloat(f.metal_weight) : null,
    diamond_type: f.diamond_type.trim() || null, diamond_shape: f.diamond_shape.trim() || null,
    diamond_color: f.diamond_color.trim() || null, diamond_clarity: f.diamond_clarity.trim() || null,
    diamond_certification: f.diamond_certification.trim() || null, setting_type: f.setting_type.trim() || null,
    hallmark: f.hallmark.trim() || null,
    width_mm: f.width_mm ? parseFloat(f.width_mm) : null, height_mm: f.height_mm ? parseFloat(f.height_mm) : null,
    gold_purity_options: f.gold_purity_options ? f.gold_purity_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    finish_options: f.finish_options ? f.finish_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    carat: f.carat ? parseFloat(f.carat) : null,
    carat_range_min: f.carat_range_min ? parseFloat(f.carat_range_min) : null,
    carat_range_max: f.carat_range_max ? parseFloat(f.carat_range_max) : null,
    carat_options: f.carat_options.length ? f.carat_options : null,
    color_stone_name: f.color_stones.length ? f.color_stones.map(s => s.name).join(",") : null,
    color_stone_quality: f.color_stones.length ? f.color_stones.map(s => s.quality).join(",") : null,
    base_price: f.base_price ? parseFloat(f.base_price) : 0,
    price_modifiers: typeof f.price_modifiers === "object" ? f.price_modifiers : (f.price_modifiers.trim() || null),
    availability: f.availability,
    lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days, 10) : null,
    min_order_qty: f.min_order_qty ? parseInt(f.min_order_qty, 10) : null,
    max_order_qty: f.max_order_qty ? parseInt(f.max_order_qty, 10) : null,
    is_new: f.is_new, is_active: f.is_active,
  };
}

/* ═══════════════════════════════════════════════════════
   SMALL FIELD COMPONENTS
   ═══════════════════════════════════════════════════════ */

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: "var(--sf-text-muted)" }}>
        {label}{required && <span style={{ color: "var(--destructive)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  backgroundColor: "var(--sf-bg-surface-2)",
  borderColor: "var(--sf-divider)",
  color: "var(--sf-text-primary)",
} as const;

function FInput({ label, required, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  return (
    <F label={label} required={required}>
      <Input {...props} className={`h-8 text-sm ${props.className || ""}`} style={{ ...inputStyle, ...props.style }} />
    </F>
  );
}

function FTextarea({ label, ...props }: { label: string } & React.ComponentProps<typeof Textarea>) {
  return (
    <F label={label}>
      <Textarea {...props} className={`min-h-[72px] text-sm ${props.className || ""}`} style={{ ...inputStyle, ...props.style }} />
    </F>
  );
}

function FSelect({ label, placeholder, value, onValueChange, children }: {
  label: string; placeholder: string; value: string; onValueChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <F label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-sm" style={inputStyle}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
          {children}
        </SelectContent>
      </Select>
    </F>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase mt-1 mb-3" style={{ color: "var(--sf-text-muted)" }}>
      {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DRAWER COMPONENT
   ═══════════════════════════════════════════════════════ */

export type AdminProductDrawerProps = {
  open: boolean;
  productId: string | null; // null = create
  onClose: () => void;
  onSaved: () => void;
};

export function AdminProductDrawer({ open, productId, onClose, onSaved }: AdminProductDrawerProps) {
  const isEdit = !!productId;

  const [tab, setTab] = useState<typeof TABS[number]["id"]>("basic");
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [pendingStone, setPendingStone] = useState({ name: "", quality: "" });
  const [pendingCarat, setPendingCarat] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── Load meta once ────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [cats, colls] = await Promise.all([adminProducts.categories(), adminProducts.collections()]);
        setCategories(cats || []);
        setCollections(colls || []);
      } catch { /* silent */ }
    })();
  }, []);

  /* ── Reset + load on open ──────────────────────── */
  useEffect(() => {
    if (!open) return;
    setTab("basic");
    setError(null);
    setNewFiles([]);
    setNewPreviews([]);
    setExistingImages([]);
    setPendingStone({ name: "", quality: "" });
    setPendingCarat("");
    if (!isEdit) {
      setForm({ ...EMPTY });
      return;
    }
    setLoading(true);
    setForm({ ...EMPTY });
    (async () => {
      try {
        const detail: ProductDetail = await adminProducts.detail(productId!);
        setForm(detailToForm(detail));
        setExistingImages(detail.images || []);
      } catch (err: any) {
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, productId, isEdit]);

  /* ── Block body scroll when open ──────────────── */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* ── File handling ─────────────────────────────── */
  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const total = existingImages.length + newFiles.length + arr.length;
    if (total > MAX_IMAGES) { setError(`Maximum ${MAX_IMAGES} images allowed.`); return; }
    setNewFiles((p) => [...p, ...arr]);
    setNewPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
    setError(null);
  }

  function removeNew(idx: number) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((p) => p.filter((_, i) => i !== idx));
    setNewPreviews((p) => p.filter((_, i) => i !== idx));
  }

  async function deleteExisting(imgId: string) {
    try { await adminProducts.deleteImage(imgId); setExistingImages((p) => p.filter((i) => i.id !== imgId)); }
    catch { /* silent */ }
  }

  async function setPrimary(imgId: string) {
    try { await adminProducts.setPrimaryImage(imgId); setExistingImages((p) => p.map((i) => ({ ...i, is_primary: i.id === imgId }))); }
    catch { /* silent */ }
  }

  /* ── Submit ─────────────────────────────────────── */
  async function handleSubmit() {
    if (!form.name.trim()) { setError("Product name is required."); setTab("basic"); return; }
    if (!form.sku.trim()) { setError("SKU is required."); setTab("basic"); return; }
    setSaving(true); setError(null);
    try {
      const payload = formToPayload(form);
      let pid = productId;
      if (isEdit) { await adminProducts.update(productId!, payload); }
      else { const c = await adminProducts.create(payload); pid = c.id || c.product?.id; }
      if (newFiles.length > 0 && pid) {
        setUploadingImages(true);
        try { await adminProducts.uploadImages(pid, newFiles); } catch { /* silent */ } finally { setUploadingImages(false); }
      }
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  function f(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  function scrollToTab(id: string) {
    setTab(id as typeof TABS[number]["id"]);
    const el = scrollRef.current?.querySelector(`[data-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
            style={{
              width: "min(680px, 100vw)",
              backgroundColor: "var(--sf-bg-surface-1)",
              borderLeft: "1px solid var(--sf-divider)",
            }}
          >
            {/* ── Drawer header ──────────────────────── */}
            <div
              className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0"
              style={{ borderBottom: "1px solid var(--sf-divider)" }}
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>
                  {isEdit ? (form.name || "Edit Product") : "Add New Product"}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                  {isEdit ? "Edit product details" : "Fill in product information"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm" className="h-8 gap-1.5 text-xs"
                  disabled={saving || uploadingImages}
                  onClick={handleSubmit}
                  style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
                >
                  {saving || uploadingImages
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{uploadingImages ? "Uploading…" : "Saving…"}</>
                    : <><Save className="w-3.5 h-3.5" />{isEdit ? "Update" : "Create"}</>
                  }
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}
                  style={{ color: "var(--sf-text-muted)" }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ── Tab pills ──────────────────────────── */}
            <div
              className="flex items-center gap-1 px-5 py-2 overflow-x-auto shrink-0"
              style={{ borderBottom: "1px solid var(--sf-divider)", scrollbarWidth: "none" }}
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToTab(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0"
                  style={{
                    background: tab === id ? "linear-gradient(135deg, rgba(48,184,191,0.15), rgba(38,96,160,0.1))" : "none",
                    border: tab === id ? "1px solid rgba(48,184,191,0.25)" : "1px solid transparent",
                    color: tab === id ? "var(--sf-teal)" : "var(--sf-text-muted)",
                  }}
                >
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>

            {/* ── Error banner ───────────────────────── */}
            {error && (
              <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs shrink-0"
                style={{ backgroundColor: "rgba(194,23,59,0.1)", color: "var(--destructive)", border: "1px solid rgba(194,23,59,0.2)" }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)}><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* ── Scrollable content ─────────────────── */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} />
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

                {/* ─ BASIC INFO ──────────────────────── */}
                <section data-section="basic">
                  <SectionLabel>Basic Info</SectionLabel>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FInput label="Product Name" required placeholder="e.g. Radiant Solitaire Ring" value={form.name} onChange={f("name")} />
                      <FInput label="SKU" required placeholder="RNG-001" value={form.sku} onChange={f("sku")} />
                    </div>
                    <FTextarea label="Description" placeholder="Detailed product description…" value={form.description} onChange={f("description")} />
                    <div className="grid grid-cols-2 gap-3">
                      <FSelect label="Category" placeholder="Select category" value={form.category_id} onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </FSelect>
                      <FInput label="Occasion Tags" placeholder="wedding, anniversary" value={form.occasion_tags} onChange={f("occasion_tags")} />
                    </div>
                    {collections.length > 0 && (
                      <F label="Collections">
                        <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-lg border" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
                          {collections.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                              <Checkbox
                                checked={form.collection_ids.includes(c.id)}
                                onCheckedChange={() => setForm((p) => ({
                                  ...p,
                                  collection_ids: p.collection_ids.includes(c.id)
                                    ? p.collection_ids.filter((x) => x !== c.id)
                                    : [...p.collection_ids, c.id],
                                }))}
                              />
                              <span className="text-xs" style={{ color: "var(--sf-text-primary)" }}>{c.name}</span>
                            </label>
                          ))}
                        </div>
                      </F>
                    )}
                  </div>
                </section>

                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                {/* ─ IMAGES ──────────────────────────── */}
                <section data-section="media">
                  <SectionLabel>Images</SectionLabel>
                  <div className="space-y-3">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all"
                      style={{ borderColor: dragOver ? "var(--sf-teal)" : "var(--sf-divider)", backgroundColor: dragOver ? "rgba(48,184,191,0.05)" : "var(--sf-bg-surface-2)" }}
                    >
                      <ImagePlus className="w-7 h-7 mx-auto mb-2" style={{ color: dragOver ? "var(--sf-teal)" : "var(--sf-text-muted)" }} />
                      <p className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                        {dragOver ? "Drop images here" : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Up to {MAX_IMAGES} · JPG, PNG, WEBP</p>
                      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
                    </div>

                    {/* Image grid */}
                    {(existingImages.length > 0 || newPreviews.length > 0) && (
                      <div className="grid grid-cols-5 gap-2">
                        {existingImages.map((img) => (
                          <div key={img.id} className="relative group rounded-lg overflow-hidden border aspect-square"
                            style={{ borderColor: img.is_primary ? "var(--sf-teal)" : "var(--sf-divider)", borderWidth: img.is_primary ? 2 : 1 }}>
                            <img src={imageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                            {img.is_primary && (
                              <div className="absolute top-1 left-1 rounded px-1 py-0.5 text-[8px] font-bold" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                                ★
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              {!img.is_primary && (
                                <button className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20"
                                  onClick={(e) => { e.stopPropagation(); setPrimary(img.id); }} title="Set primary">
                                  <Star className="w-3 h-3" />
                                </button>
                              )}
                              <button className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20"
                                onClick={(e) => { e.stopPropagation(); deleteExisting(img.id); }}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {newPreviews.map((src, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border aspect-square"
                            style={{ borderColor: "var(--sf-divider)" }}>
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 rounded px-1 py-0.5 text-[8px] font-bold" style={{ backgroundColor: "var(--sf-blue-primary)", color: "#fff" }}>
                              NEW
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20" onClick={() => removeNew(idx)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                {/* ─ SPECS ───────────────────────────── */}
                <section data-section="specs">
                  <SectionLabel>Metal</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <FSelect label="Gold Type" placeholder="Select gold type" value={form.metal_type} onValueChange={(v) => setForm((p) => ({ ...p, metal_type: v }))}>
                      {GOLD_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FSelect label="Gold Colour" placeholder="Select colour" value={form.gold_colour} onValueChange={(v) => setForm((p) => ({ ...p, gold_colour: v }))}>
                      {GOLD_COLOURS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FInput label="Metal Weight (g)" type="number" placeholder="4.5" value={form.metal_weight} onChange={f("metal_weight")} />
                    <FInput label="Finish Options" placeholder="Polished, Matte" value={form.finish_options} onChange={f("finish_options")} />
                  </div>

                  <SectionLabel>Diamond</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <FInput label="Diamond Type" placeholder="Natural, Lab-grown" value={form.diamond_type} onChange={f("diamond_type")} />
                    <FSelect label="Diamond Shape" placeholder="Select shape" value={form.diamond_shape} onValueChange={(v) => setForm((p) => ({ ...p, diamond_shape: v }))}>
                      {DIAMOND_SHAPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FSelect label="Diamond Shade" placeholder="Select shade" value={form.diamond_color} onValueChange={(v) => setForm((p) => ({ ...p, diamond_color: v }))}>
                      {DIAMOND_SHADES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FSelect label="Diamond Quality" placeholder="Select quality" value={form.diamond_clarity} onValueChange={(v) => setForm((p) => ({ ...p, diamond_clarity: v }))}>
                      {DIAMOND_QUALITIES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FSelect label="Certification" placeholder="Select certification" value={form.diamond_certification} onValueChange={(v) => setForm((p) => ({ ...p, diamond_certification: v }))}>
                      {["GIA", "GSI", "IGI"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FInput label="Setting Type" placeholder="Prong, Bezel, Pave" value={form.setting_type} onChange={f("setting_type")} />
                  </div>

                  <SectionLabel>Color Stones</SectionLabel>
                  {form.color_stones.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.color_stones.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                          style={{ backgroundColor: "var(--sf-bg-surface-3)", color: "var(--sf-text-primary)", border: "1px solid var(--sf-divider)" }}>
                          <span>{s.name} — {s.quality}</span>
                          <button type="button" onClick={() => setForm((p) => ({ ...p, color_stones: p.color_stones.filter((_, idx) => idx !== i) }))}>
                            <X className="h-3 w-3" style={{ color: "var(--sf-text-muted)" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <FSelect label="Stone Name" placeholder="Select stone" value={pendingStone.name}
                      onValueChange={(v) => setPendingStone({ name: v, quality: "" })}>
                      {COLOR_STONE_NAMES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                    <FSelect label="Stone Quality" placeholder={pendingStone.name ? "Select quality" : "Select stone first"}
                      value={pendingStone.quality} onValueChange={(v) => setPendingStone((p) => ({ ...p, quality: v }))}>
                      {(COLOR_STONE_QUALITY_MAP[pendingStone.name] || [])
                        .filter(q => !form.color_stones.filter(s => s.name === pendingStone.name).map(s => s.quality).includes(q))
                        .map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </FSelect>
                  </div>
                  <button type="button" disabled={!pendingStone.name || !pendingStone.quality}
                    onClick={() => { setForm((p) => ({ ...p, color_stones: [...p.color_stones, pendingStone] })); setPendingStone({ name: "", quality: "" }); }}
                    className="mb-4 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded"
                    style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-bg-base)", opacity: (!pendingStone.name || !pendingStone.quality) ? 0.4 : 1 }}>
                    <Plus className="h-3 w-3" /> Add Stone
                  </button>

                  <SectionLabel>Carat & Dimensions</SectionLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <FInput label="Carat" type="number" placeholder="1.5" value={form.carat} onChange={f("carat")} />
                    <FInput label="Carat Min" type="number" placeholder="0.5" value={form.carat_range_min} onChange={f("carat_range_min")} />
                    <FInput label="Carat Max" type="number" placeholder="3.0" value={form.carat_range_max} onChange={f("carat_range_max")} />
                    <FInput label="Hallmark" placeholder="BIS 916" value={form.hallmark} onChange={f("hallmark")} />
                    <FInput label="Width (mm)" type="number" placeholder="2.5" value={form.width_mm} onChange={f("width_mm")} />
                    <FInput label="Height (mm)" type="number" placeholder="8" value={form.height_mm} onChange={f("height_mm")} />
                  </div>

                  <SectionLabel>Carat Options</SectionLabel>
                  {form.carat_options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[...form.carat_options].sort((a, b) => a - b).map((ct) => (
                        <div key={ct} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                          style={{ backgroundColor: "var(--sf-bg-surface-3)", color: "var(--sf-text-primary)", border: "1px solid var(--sf-divider)" }}>
                          <span>{ct} ct</span>
                          <button type="button" onClick={() => setForm((p) => ({ ...p, carat_options: p.carat_options.filter(v => v !== ct) }))}>
                            <X className="h-3 w-3" style={{ color: "var(--sf-text-muted)" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <div className="w-32">
                      <FInput label="Add Carat" type="number" placeholder="e.g. 1.5" step="0.25" value={pendingCarat}
                        onChange={(e) => setPendingCarat(e.target.value)} />
                    </div>
                    <button type="button"
                      disabled={!pendingCarat || isNaN(parseFloat(pendingCarat)) || form.carat_options.includes(parseFloat(pendingCarat))}
                      onClick={() => {
                        const val = parseFloat(pendingCarat);
                        if (!isNaN(val) && !form.carat_options.includes(val)) {
                          setForm((p) => ({ ...p, carat_options: [...p.carat_options, val] }));
                          setPendingCarat("");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded mb-0.5"
                      style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-bg-base)", opacity: (!pendingCarat || isNaN(parseFloat(pendingCarat)) || form.carat_options.includes(parseFloat(pendingCarat))) ? 0.4 : 1 }}>
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                </section>

                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                {/* ─ PRICING ─────────────────────────── */}
                <section data-section="pricing">
                  <SectionLabel>Pricing</SectionLabel>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FInput label="Base Price (₹)" required type="number" placeholder="45000" value={form.base_price} onChange={f("base_price")} />
                    </div>
                    <FTextarea
                      label="Price Modifiers (JSON)"
                      placeholder={'{"18K": 1.0, "22K": 1.25}'}
                      value={form.price_modifiers}
                      onChange={f("price_modifiers")}
                      className="font-mono text-xs min-h-[80px]"
                    />
                  </div>
                </section>

                <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

                {/* ─ STATUS ──────────────────────────── */}
                <section data-section="status">
                  <SectionLabel>Availability & Status</SectionLabel>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <FSelect label="Availability" placeholder="Select" value={form.availability} onValueChange={(v) => setForm((p) => ({ ...p, availability: v }))}>
                        {AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </FSelect>
                      <FInput label="Lead Time (days)" type="number" placeholder="7" value={form.lead_time_days} onChange={f("lead_time_days")} />
                      <div className="grid grid-cols-2 gap-2 col-span-1" style={{ gridColumn: "span 1" }}>
                        <FInput label="Min Qty" type="number" placeholder="1" value={form.min_order_qty} onChange={f("min_order_qty")} />
                        <FInput label="Max Qty" type="number" placeholder="100" value={form.max_order_qty} onChange={f("max_order_qty")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label
                        className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors"
                        style={{
                          backgroundColor: form.is_new ? "rgba(48,184,191,0.07)" : "var(--sf-bg-surface-2)",
                          borderColor: form.is_new ? "rgba(48,184,191,0.3)" : "var(--sf-divider)",
                        }}
                      >
                        <Checkbox checked={form.is_new} onCheckedChange={(v) => setForm((p) => ({ ...p, is_new: v === true }))} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>New Arrival</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Shows "New" badge</p>
                        </div>
                      </label>

                      <label
                        className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors"
                        style={{
                          backgroundColor: form.is_active ? "rgba(34,197,94,0.07)" : "var(--sf-bg-surface-2)",
                          borderColor: form.is_active ? "rgba(34,197,94,0.3)" : "var(--sf-divider)",
                        }}
                      >
                        <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v === true }))} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>Active</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Visible to retailers</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Bottom padding */}
                <div className="h-6" />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
