import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Check, Save, Loader2, ImagePlus,
  Trash2, Star, X, AlertCircle, Package, Image as ImageIcon,
  Layers, DollarSign, ShieldCheck,
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
  id: string; name: string; sku: string; product_code: string | null; description: string | null;
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
  [key: string]: any;
};

type ProductImage = { id: string; url: string; is_primary: boolean; sort_order: number };
type Category = { id: string; name: string };
type Collection = { id: string; name: string };

type FormData = {
  name: string; sku: string; product_code: string; description: string; category_id: string;
  collection_ids: string[]; occasion_tags: string;
  metal_type: string; gold_colour: string; metal_weight: string;
  finish_options: string; diamond_type: string; diamond_shape: string;
  diamond_color: string; diamond_clarity: string; diamond_certification: string;
  setting_type: string; hallmark: string; width_mm: string; height_mm: string;
  gold_purity_options: string; carat: string; carat_range_min: string; carat_range_max: string;
  color_stone_name: string; color_stone_quality: string;
  base_price: string; price_modifiers: string;
  availability: string; lead_time_days: string; min_order_qty: string; max_order_qty: string;
  is_new: boolean; is_active: boolean;
};

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, key: "basic",   label: "Basic Info",      desc: "Name, SKU & category",      icon: Package    },
  { id: 2, key: "media",   label: "Images",           desc: "Product photos",             icon: ImageIcon  },
  { id: 3, key: "specs",   label: "Specifications",   desc: "Gold, diamond & stones",    icon: Layers     },
  { id: 4, key: "pricing", label: "Pricing",          desc: "Price & modifiers",          icon: DollarSign },
  { id: 5, key: "status",  label: "Availability",     desc: "Stock & visibility",         icon: ShieldCheck},
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "in-stock",      label: "In Stock"      },
  { value: "made-to-order", label: "Made to Order" },
  { value: "out-of-stock",  label: "Out of Stock"  },
] as const;

const GOLD_TYPES      = ["14KT", "18KT", "22KT"];
const GOLD_COLOURS    = ["YELLOW", "ROSE", "WHITE", "TWO TONE"];
const DIAMOND_SHAPES  = ["Round", "Princess", "Pan", "Baguette", "Marquise", "Oval", "Solitaire", "Emerald", "Cushion", "Radiant"];
const DIAMOND_SHADES  = ["EF", "FG", "GH", "HI", "IJ"];
const DIAMOND_QUALITIES = ["VVS", "VVS-VS", "VS", "VS-SI", "SI"];
const COLOR_STONE_NAMES = ["Precious Stones", "Semi Precious Stones", "Synthetic Stones", "Pearl", "Beads", "Kundan"];
const COLOR_STONE_QUALITY_MAP: Record<string, string[]> = {
  "Precious Stones":       ["EMERALD", "Ruby", "BLUE SAPPHIRE", "YELLOW SAPPHIRE", "NAVRATNA"],
  "Semi Precious Stones":  ["BLUE COLOUR STONE", "GREEN COLOUR STONE", "RED COLOUR STONE"],
  "Synthetic Stones":      ["CORAL", "BLUE COLOUR STONE", "GREEN COLOUR STONE", "RED COLOUR STONE"],
  "Pearl":                 ["FRESH WATER PEARLS", "PEARL"],
  "Beads":                 ["Beads"],
  "Kundan":                ["Kundan Billor"],
};

const MAX_IMAGES = 10;

const EMPTY: FormData = {
  name: "", sku: "", product_code: "", description: "", category_id: "", collection_ids: [],
  occasion_tags: "", metal_type: "", gold_colour: "", metal_weight: "",
  finish_options: "", diamond_type: "", diamond_shape: "", diamond_color: "",
  diamond_clarity: "", diamond_certification: "", setting_type: "", hallmark: "",
  width_mm: "", height_mm: "", gold_purity_options: "",
  carat: "", carat_range_min: "", carat_range_max: "",
  color_stone_name: "", color_stone_quality: "",
  base_price: "", price_modifiers: "", availability: "in-stock",
  lead_time_days: "", min_order_qty: "", max_order_qty: "",
  is_new: false, is_active: true,
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function detailToForm(d: ProductDetail): FormData {
  return {
    name: d.name || "", sku: d.sku || "", product_code: d.product_code || "", description: d.description || "",
    category_id: d.category_id || "",
    collection_ids: d.collections?.map((c) => c.id) || [],
    occasion_tags: Array.isArray(d.occasion_tags) ? d.occasion_tags.join(", ") : (d.occasion_tags || ""),
    metal_type: d.metal_type || "", gold_colour: d.gold_colour || "",
    metal_weight: d.metal_weight != null ? String(d.metal_weight) : "",
    finish_options: Array.isArray(d.finish_options) ? d.finish_options.join(", ") : (d.finish_options || ""),
    diamond_type: d.diamond_type || "",
    diamond_shape: d.diamond_shape || "",
    diamond_color: d.diamond_color || "",
    diamond_clarity: d.diamond_clarity || "",
    diamond_certification: d.diamond_certification || "", setting_type: d.setting_type || "",
    hallmark: d.hallmark || "",
    width_mm: d.width_mm != null ? String(d.width_mm) : "",
    height_mm: d.height_mm != null ? String(d.height_mm) : "",
    gold_purity_options: Array.isArray(d.gold_purity_options) ? d.gold_purity_options.join(", ") : (d.gold_purity_options || ""),
    carat: d.carat != null ? String(d.carat) : "",
    carat_range_min: d.carat_range_min != null ? String(d.carat_range_min) : "",
    carat_range_max: d.carat_range_max != null ? String(d.carat_range_max) : "",
    color_stone_name: d.color_stone_name || "",
    color_stone_quality: d.color_stone_quality || "",
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
    name: f.name.trim(), sku: f.sku.trim(), product_code: f.product_code.trim() || null, description: f.description.trim() || null,
    category_id: f.category_id || null, collection_ids: f.collection_ids,
    occasion_tags: f.occasion_tags ? f.occasion_tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    metal_type: f.metal_type || null,
    gold_colour: f.gold_colour || null,
    metal_weight: f.metal_weight ? parseFloat(f.metal_weight) : null,
    finish_options: f.finish_options ? f.finish_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    diamond_type: f.diamond_type.trim() || null,
    diamond_shape: f.diamond_shape || null,
    diamond_color: f.diamond_color || null,
    diamond_clarity: f.diamond_clarity || null,
    diamond_certification: f.diamond_certification.trim() || null,
    setting_type: f.setting_type.trim() || null, hallmark: f.hallmark.trim() || null,
    width_mm: f.width_mm ? parseFloat(f.width_mm) : null,
    height_mm: f.height_mm ? parseFloat(f.height_mm) : null,
    gold_purity_options: f.gold_purity_options ? f.gold_purity_options.split(",").map((t) => t.trim()).filter(Boolean) : [],
    carat: f.carat ? parseFloat(f.carat) : null,
    carat_range_min: f.carat_range_min ? parseFloat(f.carat_range_min) : null,
    carat_range_max: f.carat_range_max ? parseFloat(f.carat_range_max) : null,
    color_stone_name: f.color_stone_name || null,
    color_stone_quality: f.color_stone_quality || null,
    base_price: f.base_price ? parseFloat(f.base_price) : 0,
    price_modifiers: f.price_modifiers.trim() || null,
    availability: f.availability,
    lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days, 10) : null,
    min_order_qty: f.min_order_qty ? parseInt(f.min_order_qty, 10) : null,
    max_order_qty: f.max_order_qty ? parseInt(f.max_order_qty, 10) : null,
    is_new: f.is_new, is_active: f.is_active,
  };
}

/* ═══════════════════════════════════════════════════════
   TINY FIELD COMPONENTS
   ═══════════════════════════════════════════════════════ */

const iStyle = {
  backgroundColor: "var(--sf-bg-surface-2)",
  borderColor: "var(--sf-divider)",
  color: "var(--sf-text-primary)",
} as const;

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--sf-text-secondary)" }}>
        {label}{required && <span className="ml-0.5" style={{ color: "var(--destructive)" }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{hint}</p>}
    </div>
  );
}

function FInput({ label, required, hint, ...p }: { label: string; required?: boolean; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <Field label={label} required={required} hint={hint}>
      <Input {...p} className={`h-9 text-sm ${p.className || ""}`} style={{ ...iStyle, ...p.style }} />
    </Field>
  );
}

function FTextarea({ label, hint, ...p }: { label: string; hint?: string } & React.ComponentProps<typeof Textarea>) {
  return (
    <Field label={label} hint={hint}>
      <Textarea {...p} className={`min-h-[80px] text-sm resize-none ${p.className || ""}`} style={{ ...iStyle, ...p.style }} />
    </Field>
  );
}

function FSelect({ label, required, placeholder, value, onValueChange, children }: {
  label: string; required?: boolean; placeholder: string; value: string;
  onValueChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <Field label={label} required={required}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 text-sm" style={iStyle}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
          {children}
        </SelectContent>
      </Select>
    </Field>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--sf-text-muted)" }}>{children}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "var(--sf-divider)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP CONTENT COMPONENTS
   ═══════════════════════════════════════════════════════ */

function StepBasic({ form, setForm, categories, collections }: {
  form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>;
  categories: Category[]; collections: Collection[];
}) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <FInput label="Product Code" required placeholder="e.g. 100891" value={form.product_code} onChange={f("product_code")} />
        <FInput label="Product Name" required placeholder="e.g. Radiant Diamond Solitaire Ring" value={form.name} onChange={f("name")} />
        <FInput label="SKU" required placeholder="e.g. RNG-18K-001" value={form.sku} onChange={f("sku")} />
      </div>
      <FTextarea label="Description" placeholder="Describe the product — material, style, occasion…" value={form.description} onChange={f("description")} />
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="Category" required placeholder="Select category" value={form.category_id} onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}>
          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </FSelect>
        <FInput label="Occasion Tags" placeholder="wedding, anniversary, gift" value={form.occasion_tags} onChange={f("occasion_tags")} hint="Comma-separated" />
      </div>
      {collections.length > 0 && (
        <Field label="Collections">
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer py-1">
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
        </Field>
      )}
    </div>
  );
}

function StepMedia({ existingImages, newPreviews, dragOver, setDragOver, fileInputRef, handleFiles, removeNew, deleteExisting, setPrimary }: {
  existingImages: ProductImage[]; newPreviews: string[]; dragOver: boolean;
  setDragOver: (v: boolean) => void; fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFiles: (f: FileList | File[]) => void; removeNew: (i: number) => void;
  deleteExisting: (id: string) => void; setPrimary: (id: string) => void;
}) {
  const totalImages = existingImages.length + newPreviews.length;
  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? "var(--sf-teal)" : "var(--sf-divider)",
          backgroundColor: dragOver ? "rgba(48,184,191,0.06)" : "var(--sf-bg-surface-2)",
        }}
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-4"
          style={{ backgroundColor: dragOver ? "rgba(48,184,191,0.15)" : "rgba(255,255,255,0.05)" }}>
          <ImagePlus className="w-6 h-6" style={{ color: dragOver ? "var(--sf-teal)" : "var(--sf-text-muted)" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
          {dragOver ? "Drop to upload" : "Drag & drop images here"}
        </p>
        <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>or click to browse · JPG, PNG, WEBP · up to {MAX_IMAGES} images</p>
        {totalImages > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
            style={{ backgroundColor: "rgba(48,184,191,0.12)", color: "var(--sf-teal)" }}>
            {totalImages} / {MAX_IMAGES} uploaded
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Image grid */}
      {(existingImages.length > 0 || newPreviews.length > 0) && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {existingImages.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border-2 transition-colors"
              style={{ borderColor: img.is_primary ? "var(--sf-teal)" : "transparent", backgroundColor: "var(--sf-bg-surface-2)" }}>
              <img src={imageUrl(img.url)} alt="" className="w-full h-full object-cover" />
              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5">
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                    style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                    <Star className="w-2.5 h-2.5" fill="currentColor" /> PRIMARY
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {!img.is_primary && (
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/15 hover:bg-white/25 text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); setPrimary(img.id); }} title="Set as primary">
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/15 hover:bg-red-500/60 text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); deleteExisting(img.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {newPreviews.map((src, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border-2"
              style={{ borderColor: "rgba(59,130,246,0.4)", backgroundColor: "var(--sf-bg-surface-2)" }}>
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5">
                <Badge className="text-[9px] h-4 px-1.5" style={{ backgroundColor: "var(--sf-blue-primary)", color: "#fff", border: "none" }}>NEW</Badge>
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/15 hover:bg-red-500/60 text-white transition-colors"
                  onClick={() => removeNew(idx)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepSpecs({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="space-y-6">
      <div>
        <GroupLabel>Gold</GroupLabel>
        <div className="grid grid-cols-2 gap-4">
          <FSelect label="Gold Type" placeholder="Select gold type" value={form.metal_type} onValueChange={(v) => setForm((p) => ({ ...p, metal_type: v }))}>
            {GOLD_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </FSelect>
          <FSelect label="Gold Colour" placeholder="Select colour" value={form.gold_colour} onValueChange={(v) => setForm((p) => ({ ...p, gold_colour: v }))}>
            {GOLD_COLOURS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </FSelect>
          <FInput label="Metal Weight (g)" type="number" placeholder="4.5" value={form.metal_weight} onChange={f("metal_weight")} />
          <FInput label="Finish Options" placeholder="Polished, Matte, Brushed" value={form.finish_options} onChange={f("finish_options")} hint="Comma-separated" />
        </div>
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <div>
        <GroupLabel>Diamond</GroupLabel>
        <div className="grid grid-cols-2 gap-4">
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
          <FInput label="Certification" placeholder="GIA, IGI" value={form.diamond_certification} onChange={f("diamond_certification")} />
          <FInput label="Setting Type" placeholder="Prong, Bezel, Pave" value={form.setting_type} onChange={f("setting_type")} />
        </div>
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <div>
        <GroupLabel>Color Stones</GroupLabel>
        <div className="grid grid-cols-2 gap-4">
          <FSelect label="Color Stone Name" placeholder="Select stone" value={form.color_stone_name}
            onValueChange={(v) => setForm((p) => ({ ...p, color_stone_name: v, color_stone_quality: "" }))}>
            {COLOR_STONE_NAMES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </FSelect>
          <FSelect label="Color Stone Quality" placeholder={form.color_stone_name ? "Select quality" : "Select stone first"}
            value={form.color_stone_quality} onValueChange={(v) => setForm((p) => ({ ...p, color_stone_quality: v }))}>
            {(COLOR_STONE_QUALITY_MAP[form.color_stone_name] || []).map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </FSelect>
        </div>
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <div>
        <GroupLabel>Carat & Dimensions</GroupLabel>
        <div className="grid grid-cols-3 gap-4">
          <FInput label="Carat" type="number" placeholder="1.5" value={form.carat} onChange={f("carat")} />
          <FInput label="Carat Range Min" type="number" placeholder="0.5" value={form.carat_range_min} onChange={f("carat_range_min")} />
          <FInput label="Carat Range Max" type="number" placeholder="3.0" value={form.carat_range_max} onChange={f("carat_range_max")} />
          <FInput label="Hallmark" placeholder="BIS 916" value={form.hallmark} onChange={f("hallmark")} />
          <FInput label="Width (mm)" type="number" placeholder="2.5" value={form.width_mm} onChange={f("width_mm")} />
          <FInput label="Height (mm)" type="number" placeholder="8.0" value={form.height_mm} onChange={f("height_mm")} />
        </div>
      </div>
    </div>
  );
}

function StepPricing({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="space-y-5">
      <div className="max-w-xs">
        <FInput label="Base Price (₹)" required type="number" placeholder="45000" value={form.base_price} onChange={f("base_price")} />
      </div>
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "rgba(48,184,191,0.06)", border: "1px solid rgba(48,184,191,0.2)" }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: "var(--sf-teal)" }}>Price Modifiers (optional)</p>
        <p className="text-[11px] mb-3" style={{ color: "var(--sf-text-muted)" }}>
          JSON multipliers applied per material or option selection. Example: {`{"18K": 1.0, "22K": 1.25, "Platinum": 1.5}`}
        </p>
        <FTextarea
          label=""
          placeholder={'{\n  "18K": 1.0,\n  "22K": 1.25,\n  "Platinum": 1.5\n}'}
          value={form.price_modifiers}
          onChange={f("price_modifiers")}
          className="font-mono text-xs min-h-[120px]"
        />
      </div>
    </div>
  );
}

function StepStatus({ form, setForm }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }) {
  const f = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  return (
    <div className="space-y-5">
      <GroupLabel>Stock Settings</GroupLabel>
      <div className="grid grid-cols-3 gap-4">
        <FSelect label="Availability" required placeholder="Select" value={form.availability} onValueChange={(v) => setForm((p) => ({ ...p, availability: v }))}>
          {AVAILABILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </FSelect>
        <FInput label="Lead Time (days)" type="number" placeholder="7" value={form.lead_time_days} onChange={f("lead_time_days")} />
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Min Qty" type="number" placeholder="1" value={form.min_order_qty} onChange={f("min_order_qty")} />
          <FInput label="Max Qty" type="number" placeholder="100" value={form.max_order_qty} onChange={f("max_order_qty")} />
        </div>
      </div>

      <Separator style={{ backgroundColor: "var(--sf-divider)" }} />

      <GroupLabel>Visibility Flags</GroupLabel>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer group transition-all"
          style={{
            backgroundColor: form.is_new ? "rgba(48,184,191,0.07)" : "var(--sf-bg-surface-2)",
            borderColor: form.is_new ? "rgba(48,184,191,0.35)" : "var(--sf-divider)",
          }}>
          <Checkbox checked={form.is_new} onCheckedChange={(v) => setForm((p) => ({ ...p, is_new: v === true }))} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>New Arrival</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Displays a "NEW" badge on the catalog card</p>
          </div>
        </label>
        <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer group transition-all"
          style={{
            backgroundColor: form.is_active ? "rgba(34,197,94,0.07)" : "var(--sf-bg-surface-2)",
            borderColor: form.is_active ? "rgba(34,197,94,0.35)" : "var(--sf-divider)",
          }}>
          <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v === true }))} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>Active</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>Visible to retailers in the product catalog</p>
          </div>
        </label>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN WIZARD
   ═══════════════════════════════════════════════════════ */

export function AdminProductWizard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ── Load meta ─────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [cats, colls] = await Promise.all([adminProducts.categories(), adminProducts.collections()]);
        setCategories(cats || []);
        setCollections(colls || []);
      } catch { /* silent */ }
    })();
  }, []);

  /* ── Load product for edit ─────────────────────────── */
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const d: ProductDetail = await adminProducts.detail(id!);
        setForm(detailToForm(d));
        setExistingImages(d.images || []);
      } catch (e: any) {
        setError(e.message || "Failed to load product");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id, isEdit]);

  /* ── File handling ─────────────────────────────────── */
  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    if (existingImages.length + newFiles.length + arr.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`); return;
    }
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

  /* ── Step navigation ───────────────────────────────── */
  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!form.product_code.trim()) return "Product code is required.";
      if (!form.name.trim()) return "Product name is required.";
      if (!form.sku.trim()) return "SKU is required.";
    }
    if (s === 4) {
      if (!form.base_price) return "Base price is required.";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setCompletedSteps((p) => new Set([...p, step]));
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpTo(s: number) {
    if (s === step) return;
    // Allow jump to completed steps or next step
    if (completedSteps.has(s) || s === step + 1 || s < step) {
      setError(null);
      setStep(s);
    }
  }

  /* ── Submit ────────────────────────────────────────── */
  async function handleSave() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    try {
      const payload = formToPayload(form);
      let pid = id;
      if (isEdit) { await adminProducts.update(id!, payload); }
      else { const c = await adminProducts.create(payload); pid = c.id || c.product?.id; }
      if (newFiles.length > 0 && pid) {
        setUploading(true);
        try { await adminProducts.uploadImages(pid, newFiles); } catch { /* silent */ } finally { setUploading(false); }
      }
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
      navigate("/admin/products");
    } catch (e: any) {
      setError(e.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  const isLastStep = step === STEPS.length;
  const currentStep = STEPS[step - 1];

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sf-teal)" }} />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--sf-bg-base)" }}>

      {/* ── Top bar ──────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderBottom: "1px solid var(--sf-divider)" }}
      >
        <button
          onClick={() => navigate("/admin/products")}
          className="flex items-center gap-2 text-sm transition-colors cursor-pointer"
          style={{ color: "var(--sf-text-muted)", background: "none", border: "none" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Products
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
            {isEdit ? "Edit Product" : "Add New Product"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
            Step {step} of {STEPS.length} — {currentStep.label}
          </p>
        </div>

        <Button
          size="sm" className="gap-1.5 h-8"
          disabled={saving || uploading}
          onClick={isLastStep ? handleSave : goNext}
          style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
        >
          {saving || uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />{uploading ? "Uploading…" : "Saving…"}</>
          ) : isLastStep ? (
            <><Save className="w-3.5 h-3.5" />{isEdit ? "Update Product" : "Create Product"}</>
          ) : (
            <>Continue <ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </Button>
      </div>

      {/* ── Progress bar ─────────────────────────────── */}
      <div className="h-0.5 w-full" style={{ backgroundColor: "var(--sf-divider)" }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: "var(--sf-teal)" }}
          animate={{ width: `${(step / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">

        {/* ── Left stepper sidebar ─────────────────── */}
        <aside className="w-60 shrink-0">
          <div className="sticky top-24 space-y-1">
            {STEPS.map((s) => {
              const isDone = completedSteps.has(s.id);
              const isActive = step === s.id;
              const isReachable = isDone || s.id <= step;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => jumpTo(s.id)}
                  disabled={!isReachable}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all cursor-pointer disabled:cursor-default"
                  style={{
                    backgroundColor: isActive ? "rgba(48,184,191,0.1)" : "transparent",
                    border: isActive ? "1px solid rgba(48,184,191,0.25)" : "1px solid transparent",
                  }}
                >
                  {/* Step circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all"
                    style={{
                      backgroundColor: isDone
                        ? "var(--sf-teal)"
                        : isActive
                        ? "rgba(48,184,191,0.2)"
                        : "var(--sf-bg-surface-2)",
                      color: isDone
                        ? "#fff"
                        : isActive
                        ? "var(--sf-teal)"
                        : "var(--sf-text-muted)",
                      border: isActive && !isDone ? "1.5px solid var(--sf-teal)" : "none",
                    }}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s.id}
                  </div>

                  {/* Step text */}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: isActive ? "var(--sf-teal)" : isDone ? "var(--sf-text-secondary)" : "var(--sf-text-muted)" }}>
                      {s.label}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                      {s.desc}
                    </p>
                  </div>

                  {/* Done indicator */}
                  {isDone && !isActive && (
                    <div className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--sf-teal)" }} />
                  )}
                </button>
              );
            })}

            {/* Summary card */}
            {completedSteps.size > 0 && (
              <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)" }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--sf-text-muted)" }}>PROGRESS</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(completedSteps.size / STEPS.length) * 100}%`, backgroundColor: "var(--sf-teal)" }} />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--sf-teal)" }}>
                    {completedSteps.size}/{STEPS.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Step header */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl shrink-0"
              style={{ backgroundColor: "rgba(48,184,191,0.12)" }}>
              <currentStep.icon className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
                {currentStep.label}
              </h2>
              <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>{currentStep.desc}</p>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: "rgba(194,23,59,0.1)", color: "var(--destructive)", border: "1px solid rgba(194,23,59,0.25)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="shrink-0"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step content card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}
            >
              {step === 1 && <StepBasic form={form} setForm={setForm} categories={categories} collections={collections} />}
              {step === 2 && (
                <StepMedia
                  existingImages={existingImages} newPreviews={newPreviews}
                  dragOver={dragOver} setDragOver={setDragOver}
                  fileInputRef={fileInputRef} handleFiles={handleFiles}
                  removeNew={removeNew} deleteExisting={deleteExisting} setPrimary={setPrimary}
                />
              )}
              {step === 3 && <StepSpecs form={form} setForm={setForm} />}
              {step === 4 && <StepPricing form={form} setForm={setForm} />}
              {step === 5 && <StepStatus form={form} setForm={setForm} />}
            </motion.div>
          </AnimatePresence>

          {/* Bottom nav */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline" size="sm" className="gap-1.5 h-9"
              onClick={step === 1 ? () => navigate("/admin/products") : goBack}
              style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s) => (
                <div key={s.id} className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{ backgroundColor: step === s.id ? "var(--sf-teal)" : completedSteps.has(s.id) ? "rgba(48,184,191,0.4)" : "var(--sf-divider)" }} />
              ))}
            </div>

            <Button
              size="sm" className="gap-1.5 h-9"
              disabled={saving || uploading}
              onClick={isLastStep ? handleSave : goNext}
              style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
            >
              {saving || uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />{uploading ? "Uploading…" : "Saving…"}</>
              ) : isLastStep ? (
                <><Save className="w-3.5 h-3.5" />{isEdit ? "Update" : "Create Product"}</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
