import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Loader2,
  ImagePlus,
  Trash2,
  Star,
  X,
  AlertCircle,
  Save,
  Package,
  Image as ImageIcon,
  Layers,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { adminProducts } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

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
};

type ProductImage = {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type Category = { id: string; name: string };
type Collection = { id: string; name: string };

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
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "out-of-stock", label: "Out of Stock" },
] as const;

const MAX_IMAGES = 10;

const EMPTY_FORM: ProductFormData = {
  name: "", sku: "", description: "", category_id: "", collection_ids: [],
  occasion_tags: "", metal_type: "", metal_weight: "", diamond_type: "",
  diamond_shape: "", diamond_color: "", diamond_clarity: "",
  diamond_certification: "", setting_type: "", hallmark: "",
  width_mm: "", height_mm: "", gold_purity_options: "", finish_options: "",
  carat: "", carat_range_min: "", carat_range_max: "", base_price: "",
  price_modifiers: "", availability: "in-stock", lead_time_days: "",
  min_order_qty: "", max_order_qty: "", is_new: false, is_active: true,
};

const SECTIONS = [
  { id: "basic", label: "Basic Info", icon: Package },
  { id: "media", label: "Images", icon: ImageIcon },
  { id: "specs", label: "Specifications", icon: Layers },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "availability", label: "Availability", icon: ShieldCheck },
];

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function detailToForm(d: ProductDetail): ProductFormData {
  return {
    name: d.name || "", sku: d.sku || "", description: d.description || "",
    category_id: d.category_id || "",
    collection_ids: d.collections?.map((c) => c.id) || [],
    occasion_tags: Array.isArray(d.occasion_tags) ? d.occasion_tags.join(", ") : (d.occasion_tags || ""),
    metal_type: d.metal_type || "", metal_weight: d.metal_weight != null ? String(d.metal_weight) : "",
    diamond_type: d.diamond_type || "", diamond_shape: d.diamond_shape || "",
    diamond_color: d.diamond_color || "", diamond_clarity: d.diamond_clarity || "",
    diamond_certification: d.diamond_certification || "", setting_type: d.setting_type || "",
    hallmark: d.hallmark || "", width_mm: d.width_mm != null ? String(d.width_mm) : "",
    height_mm: d.height_mm != null ? String(d.height_mm) : "",
    gold_purity_options: Array.isArray(d.gold_purity_options) ? d.gold_purity_options.join(", ") : (d.gold_purity_options || ""),
    finish_options: Array.isArray(d.finish_options) ? d.finish_options.join(", ") : (d.finish_options || ""),
    carat: d.carat != null ? String(d.carat) : "",
    carat_range_min: d.carat_range_min != null ? String(d.carat_range_min) : "",
    carat_range_max: d.carat_range_max != null ? String(d.carat_range_max) : "",
    base_price: d.base_price != null ? String(d.base_price) : "",
    price_modifiers: d.price_modifiers ? (typeof d.price_modifiers === "object" ? JSON.stringify(d.price_modifiers) : d.price_modifiers) : "",
    availability: d.availability || "in-stock",
    lead_time_days: d.lead_time_days != null ? String(d.lead_time_days) : "",
    min_order_qty: d.min_order_qty != null ? String(d.min_order_qty) : "",
    max_order_qty: d.max_order_qty != null ? String(d.max_order_qty) : "",
    is_new: d.is_new ?? false, is_active: d.is_active ?? true,
  };
}

function formToPayload(f: ProductFormData) {
  return {
    name: f.name.trim(), sku: f.sku.trim(), description: f.description.trim() || null,
    category_id: f.category_id || null, collection_ids: f.collection_ids,
    occasion_tags: f.occasion_tags ? f.occasion_tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    metal_type: f.metal_type.trim() || null, metal_weight: f.metal_weight ? parseFloat(f.metal_weight) : null,
    diamond_type: f.diamond_type.trim() || null, diamond_shape: f.diamond_shape.trim() || null,
    diamond_color: f.diamond_color.trim() || null, diamond_clarity: f.diamond_clarity.trim() || null,
    diamond_certification: f.diamond_certification.trim() || null, setting_type: f.setting_type.trim() || null,
    hallmark: f.hallmark.trim() || null,
    width_mm: f.width_mm ? parseFloat(f.width_mm) : null,
    height_mm: f.height_mm ? parseFloat(f.height_mm) : null,
    gold_purity_options: f.gold_purity_options ? f.gold_purity_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    finish_options: f.finish_options ? f.finish_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    carat: f.carat ? parseFloat(f.carat) : null,
    carat_range_min: f.carat_range_min ? parseFloat(f.carat_range_min) : null,
    carat_range_max: f.carat_range_max ? parseFloat(f.carat_range_max) : null,
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
   REUSABLE FIELD COMPONENTS
   ═══════════════════════════════════════════════════════ */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
        {label}{required && <span style={{ color: "var(--destructive)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function FieldInput({ label, required, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  return (
    <Field label={label} required={required}>
      <Input
        {...props}
        className={`h-9 ${props.className || ""}`}
        style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)", ...props.style }}
      />
    </Field>
  );
}

function FieldTextarea({ label, ...props }: { label: string } & React.ComponentProps<typeof Textarea>) {
  return (
    <Field label={label}>
      <Textarea
        {...props}
        className={`min-h-[90px] ${props.className || ""}`}
        style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)", ...props.style }}
      />
    </Field>
  );
}

function FieldSelect({ label, placeholder, value, onValueChange, children }: {
  label: string; placeholder: string; value: string; onValueChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
          {children}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SectionCard({ id, title, icon: Icon, children }: {
  id: string; title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <Card
      id={id}
      className="border-[var(--sf-divider)] scroll-mt-24"
      style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
    >
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
          <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: "rgba(48,184,191,0.12)" }}>
            <Icon className="w-3.5 h-3.5" style={{ color: "var(--sf-teal)" }} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />
      <CardContent className="p-5 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function AdminProductForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("basic");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load meta ─────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [cats, colls] = await Promise.all([adminProducts.categories(), adminProducts.collections()]);
        setCategories(cats || []);
        setCollections(colls || []);
      } catch { /* silent */ }
    })();
  }, []);

  /* ── Load product for edit ──────────────────────── */
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const detail: ProductDetail = await adminProducts.detail(id!);
        setForm(detailToForm(detail));
        setExistingImages(detail.images || []);
      } catch (err: any) {
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  /* ── Scroll spy ─────────────────────────────────── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id: sid }) => {
      const el = document.getElementById(sid);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading]);

  /* ── File handling ──────────────────────────────── */
  function handleFileSelect(files: FileList | File[]) {
    const arr = Array.from(files);
    const total = existingImages.length + newFiles.length + arr.length;
    if (total > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    const valid = arr.filter((f) => f.type.startsWith("image/"));
    if (!valid.length) return;
    setNewFiles((prev) => [...prev, ...valid]);
    setNewPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    setError(null);
  }

  function removeNewFile(idx: number) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function deleteExistingImage(imgId: string) {
    try {
      await adminProducts.deleteImage(imgId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imgId));
    } catch { /* silent */ }
  }

  async function setPrimary(imgId: string) {
    try {
      await adminProducts.setPrimaryImage(imgId);
      setExistingImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imgId })));
    } catch { /* silent */ }
  }

  /* ── Submit ─────────────────────────────────────── */
  async function handleSubmit() {
    if (!form.name.trim()) { setError("Product name is required."); document.getElementById("basic")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!form.sku.trim()) { setError("SKU is required."); document.getElementById("basic")?.scrollIntoView({ behavior: "smooth" }); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(form);
      let productId = id;
      if (isEdit) {
        await adminProducts.update(id!, payload);
      } else {
        const created = await adminProducts.create(payload);
        productId = created.id || created.product?.id;
      }
      if (newFiles.length > 0 && productId) {
        setUploadingImages(true);
        try { await adminProducts.uploadImages(productId, newFiles); }
        catch { /* silent */ }
        finally { setUploadingImages(false); }
      }
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
      navigate("/admin/products");
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  /* ── Toggle collection ──────────────────────────── */
  function toggleCollection(collId: string) {
    setForm((prev) => ({
      ...prev,
      collection_ids: prev.collection_ids.includes(collId)
        ? prev.collection_ids.filter((c) => c !== collId)
        : [...prev.collection_ids, collId],
    }));
  }

  function f(key: keyof ProductFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--sf-teal)" }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">

      {/* ── Sticky top bar ──────────────────────────── */}
      <div
        className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 flex items-center justify-between gap-3 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(8,10,13,0.85)", borderBottom: "1px solid var(--sf-divider)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => navigate("/admin/products")}
            style={{ color: "var(--sf-text-muted)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate" style={{ color: "var(--sf-text-primary)" }}>
              {isEdit ? `Edit: ${form.name || "Product"}` : "Add New Product"}
            </h1>
            <p className="text-[11px] hidden sm:block" style={{ color: "var(--sf-text-muted)" }}>
              {isEdit ? "Update product details and media" : "Fill in product information below"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/products")}
            className="h-8"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            disabled={saving || uploadingImages}
            onClick={handleSubmit}
            style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
          >
            {saving || uploadingImages ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{uploadingImages ? "Uploading..." : "Saving..."}</>
            ) : (
              <><Save className="w-3.5 h-3.5" />{isEdit ? "Update" : "Create"}</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(194,23,59,0.1)", color: "var(--destructive)", border: "1px solid rgba(194,23,59,0.25)" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </motion.div>
      )}

      {/* ── Main layout: sidebar + content ──────────── */}
      <div className="flex gap-6">

        {/* Section nav sidebar (desktop) */}
        <aside className="hidden lg:block w-40 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map(({ id: sid, label, icon: Icon }) => (
              <button
                key={sid}
                onClick={() => document.getElementById(sid)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer"
                style={{
                  background: activeSection === sid ? "linear-gradient(135deg, rgba(48,184,191,0.15), rgba(38,96,160,0.1))" : "none",
                  border: activeSection === sid ? "1px solid rgba(48,184,191,0.25)" : "1px solid transparent",
                  color: activeSection === sid ? "var(--sf-teal)" : "var(--sf-text-muted)",
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Form sections */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── BASIC INFO ──────────────────────────── */}
          <SectionCard id="basic" title="Basic Info" icon={Package}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Product Name" required placeholder="e.g. Radiant Diamond Solitaire Ring" value={form.name} onChange={f("name")} />
              <FieldInput label="SKU" required placeholder="e.g. RNG-001" value={form.sku} onChange={f("sku")} />
            </div>

            <FieldTextarea label="Description" placeholder="Detailed product description..." value={form.description} onChange={f("description")} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldSelect label="Category" placeholder="Select category" value={form.category_id} onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </FieldSelect>
              <FieldInput label="Occasion Tags" placeholder="wedding, anniversary, birthday" value={form.occasion_tags} onChange={f("occasion_tags")} />
            </div>

            {/* Collections */}
            <Field label="Collections">
              <div
                className="rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-3 gap-2"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
              >
                {collections.length === 0 ? (
                  <p className="text-xs col-span-full" style={{ color: "var(--sf-text-muted)" }}>No collections available</p>
                ) : (
                  collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form.collection_ids.includes(c.id)} onCheckedChange={() => toggleCollection(c.id)} />
                      <span className="text-xs" style={{ color: "var(--sf-text-primary)" }}>{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            </Field>
          </SectionCard>

          {/* ── IMAGES ──────────────────────────────── */}
          <SectionCard id="media" title="Images" icon={ImageIcon}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? "var(--sf-teal)" : "var(--sf-divider)",
                backgroundColor: dragOver ? "rgba(48,184,191,0.05)" : "var(--sf-bg-surface-2)",
              }}
            >
              <ImagePlus className="w-9 h-9 mx-auto mb-3" style={{ color: dragOver ? "var(--sf-teal)" : "var(--sf-text-muted)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
                {dragOver ? "Drop images here" : "Drag & drop images, or click to browse"}
              </p>
              <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Up to {MAX_IMAGES} images · JPG, PNG, WEBP</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files) handleFileSelect(e.target.files); e.target.value = ""; }} />
            </div>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                  Saved Images <span style={{ color: "var(--sf-text-muted)" }}>({existingImages.length})</span>
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border"
                      style={{ borderColor: img.is_primary ? "var(--sf-teal)" : "var(--sf-divider)", borderWidth: img.is_primary ? 2 : 1 }}>
                      <img src={imageUrl(img.url)} alt="" className="w-full aspect-square object-cover" />
                      {img.is_primary && (
                        <div className="absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                          Primary
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {!img.is_primary && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); setPrimary(img.id); }} title="Set as primary">
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white hover:bg-white/20"
                          onClick={(e) => { e.stopPropagation(); deleteExistingImage(img.id); }} title="Delete">
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
                <p className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                  To Upload <Badge className="ml-1 h-4 text-[10px] px-1.5" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "var(--sf-blue-primary)", border: "none" }}>{newPreviews.length}</Badge>
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {newPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border" style={{ borderColor: "var(--sf-divider)" }}>
                      <img src={preview} alt="" className="w-full aspect-square object-cover" />
                      <div className="absolute top-1 left-1 rounded px-1 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "var(--sf-blue-primary)", color: "#fff" }}>
                        New
                      </div>
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white hover:bg-white/20" onClick={() => removeNewFile(idx)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── SPECIFICATIONS ──────────────────────── */}
          <SectionCard id="specs" title="Specifications" icon={Layers}>
            <div className="space-y-1 mb-1">
              <p className="text-xs font-semibold" style={{ color: "var(--sf-text-muted)" }}>METAL</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Metal Type" placeholder="e.g. 18K Gold, Platinum" value={form.metal_type} onChange={f("metal_type")} />
              <FieldInput label="Metal Weight (g)" type="number" placeholder="e.g. 4.5" value={form.metal_weight} onChange={f("metal_weight")} />
              <FieldInput label="Gold Purity Options" placeholder="14K, 18K, 22K" value={form.gold_purity_options} onChange={f("gold_purity_options")} />
              <FieldInput label="Finish Options" placeholder="Polished, Matte, Brushed" value={form.finish_options} onChange={f("finish_options")} />
            </div>

            <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

            <div className="space-y-1 mb-1">
              <p className="text-xs font-semibold" style={{ color: "var(--sf-text-muted)" }}>DIAMOND</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Diamond Type" placeholder="Natural, Lab-grown" value={form.diamond_type} onChange={f("diamond_type")} />
              <FieldInput label="Diamond Shape" placeholder="Round, Princess, Oval" value={form.diamond_shape} onChange={f("diamond_shape")} />
              <FieldInput label="Diamond Color" placeholder="D, E, F" value={form.diamond_color} onChange={f("diamond_color")} />
              <FieldInput label="Diamond Clarity" placeholder="VS1, VVS2" value={form.diamond_clarity} onChange={f("diamond_clarity")} />
              <FieldInput label="Certification" placeholder="GIA, IGI" value={form.diamond_certification} onChange={f("diamond_certification")} />
              <FieldInput label="Setting Type" placeholder="Prong, Bezel, Pave" value={form.setting_type} onChange={f("setting_type")} />
            </div>

            <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

            <div className="space-y-1 mb-1">
              <p className="text-xs font-semibold" style={{ color: "var(--sf-text-muted)" }}>CARAT & DIMENSIONS</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FieldInput label="Carat" type="number" placeholder="1.5" value={form.carat} onChange={f("carat")} />
              <FieldInput label="Carat Range Min" type="number" placeholder="0.5" value={form.carat_range_min} onChange={f("carat_range_min")} />
              <FieldInput label="Carat Range Max" type="number" placeholder="3.0" value={form.carat_range_max} onChange={f("carat_range_max")} />
              <FieldInput label="Hallmark" placeholder="BIS 916" value={form.hallmark} onChange={f("hallmark")} />
              <FieldInput label="Width (mm)" type="number" placeholder="2.5" value={form.width_mm} onChange={f("width_mm")} />
              <FieldInput label="Height (mm)" type="number" placeholder="8" value={form.height_mm} onChange={f("height_mm")} />
            </div>
          </SectionCard>

          {/* ── PRICING ──────────────────────────────── */}
          <SectionCard id="pricing" title="Pricing" icon={DollarSign}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput label="Base Price (INR)" required type="number" placeholder="45000" value={form.base_price} onChange={f("base_price")} />
            </div>
            <FieldTextarea
              label="Price Modifiers (JSON)"
              placeholder={'{"18K": 1.0, "22K": 1.25, "Platinum": 1.5}'}
              value={form.price_modifiers}
              onChange={f("price_modifiers")}
              className="font-mono text-xs min-h-[110px]"
            />
            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
              Optional JSON for price multipliers based on material/option selections.
            </p>
          </SectionCard>

          {/* ── AVAILABILITY & STATUS ────────────────── */}
          <SectionCard id="availability" title="Availability & Status" icon={ShieldCheck}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FieldSelect label="Availability" placeholder="Select" value={form.availability} onValueChange={(v) => setForm((p) => ({ ...p, availability: v }))}>
                {AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FieldSelect>
              <FieldInput label="Lead Time (days)" type="number" placeholder="7" value={form.lead_time_days} onChange={f("lead_time_days")} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Min Order Qty" type="number" placeholder="1" value={form.min_order_qty} onChange={f("min_order_qty")} />
                <FieldInput label="Max Order Qty" type="number" placeholder="100" value={form.max_order_qty} onChange={f("max_order_qty")} />
              </div>
            </div>

            <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-start gap-3 cursor-pointer flex-1 rounded-xl p-4 border transition-colors"
                style={{ backgroundColor: form.is_new ? "rgba(48,184,191,0.06)" : "var(--sf-bg-surface-2)", borderColor: form.is_new ? "rgba(48,184,191,0.3)" : "var(--sf-divider)" }}>
                <Checkbox checked={form.is_new} onCheckedChange={(v) => setForm((p) => ({ ...p, is_new: v === true }))} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>New Arrival</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Shows "New" badge on product card</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer flex-1 rounded-xl p-4 border transition-colors"
                style={{ backgroundColor: form.is_active ? "rgba(34,197,94,0.06)" : "var(--sf-bg-surface-2)", borderColor: form.is_active ? "rgba(34,197,94,0.3)" : "var(--sf-divider)" }}>
                <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v === true }))} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>Active</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Visible to retailers in the catalog</p>
                </div>
              </label>
            </div>
          </SectionCard>

          {/* ── Bottom save bar ──────────────────────── */}
          <div className="flex justify-end gap-2 pb-8">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")}
              style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5" disabled={saving || uploadingImages} onClick={handleSubmit}
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
              {saving || uploadingImages ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />{uploadingImages ? "Uploading..." : "Saving..."}</>
              ) : (
                <><Save className="w-3.5 h-3.5" />{isEdit ? "Update Product" : "Create Product"}</>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
