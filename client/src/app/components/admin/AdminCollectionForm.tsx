import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, Loader2, Search, Check, Package } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { adminCollections, adminProducts } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";
import { TAG_META } from "./AdminCollections";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  base_price: number | string;
  image: string | null;
  category: string | null;
};

const TAG_ORDER = ["new-launch", "seasonal", "bridal", "themed", "festive"];

export function AdminCollectionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("themed");
  const [coverImage, setCoverImage] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load product options + (if editing) the collection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prodData = await adminProducts.list({ limit: "1000" });
        if (!cancelled) setProducts((prodData?.products || []) as ProductOption[]);
      } catch {
        if (!cancelled) setProducts([]);
      }
      if (isEdit) {
        try {
          const c = await adminCollections.detail(id!);
          if (!cancelled) {
            setName(c.name || "");
            setTagline(c.tagline || "");
            setDescription(c.description || "");
            setTag(c.tag || "themed");
            setCoverImage(c.cover_image || "");
            setLaunchDate(c.launch_date ? String(c.launch_date).slice(0, 10) : "");
            setIsActive(c.is_active !== false);
            setSelectedIds(Array.isArray(c.product_ids) ? c.product_ids : []);
          }
        } catch {
          if (!cancelled) setError("Failed to load collection");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const toggleProduct = useCallback((pid: string) => {
    setSelectedIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }, []);

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [products, productSearch]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Collection name is required");
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      tag,
      cover_image: coverImage.trim() || null,
      launch_date: launchDate || null,
      product_ids: selectedIds,
      ...(isEdit ? { is_active: isActive } : {}),
    };
    try {
      if (isEdit) await adminCollections.update(id!, payload);
      else await adminCollections.create(payload);
      navigate("/admin/collections");
    } catch (err: any) {
      setError(err.message || "Failed to save collection");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sf-teal)" }} />
      </div>
    );
  }

  const labelCls = "text-sm font-medium block mb-1.5";
  const labelStyle = { color: "var(--sf-text-secondary)" } as const;
  const fieldStyle = { backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" } as const;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/collections")}
            className="flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer"
            style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'General Sans', 'Inter', sans-serif", color: "var(--sf-text-primary)" }}>
            {isEdit ? "Edit Collection" : "New Collection"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="h-10 gap-1.5" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {isEdit ? "Save Changes" : "Create Collection"}</>}
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: details */}
        <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <div>
            <label className={labelCls} style={labelStyle}>Name <span style={{ color: "#ef4444" }}>*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Festive Glow 2026" className="h-11 border-[var(--sf-divider)]" style={fieldStyle} />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Tagline</label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short, evocative line" className="h-11 border-[var(--sf-divider)]" style={fieldStyle} />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the collection..."
              className="w-full rounded-lg border px-3 py-2 text-sm resize-y focus:outline-none focus-visible:border-[var(--sf-teal)]"
              style={{ ...fieldStyle, borderColor: "var(--sf-divider)" }}
            />
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Tag</label>
            <div className="flex flex-wrap gap-2">
              {TAG_ORDER.map((t) => {
                const meta = TAG_META[t];
                const active = tag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={{
                      color: active ? meta.color : "var(--sf-text-muted)",
                      backgroundColor: active ? meta.bg : "var(--sf-bg-surface-2)",
                      border: `1px solid ${active ? meta.color : "var(--sf-divider)"}`,
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={labelStyle}>Launch date</label>
              <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className="h-11 border-[var(--sf-divider)]" style={fieldStyle} />
            </div>
            {isEdit && (
              <div>
                <label className={labelCls} style={labelStyle}>Status</label>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className="h-11 w-full rounded-lg text-sm font-medium cursor-pointer"
                  style={{
                    color: isActive ? "#22c55e" : "var(--sf-text-muted)",
                    backgroundColor: isActive ? "rgba(34,197,94,0.12)" : "var(--sf-bg-surface-2)",
                    border: `1px solid ${isActive ? "rgba(34,197,94,0.4)" : "var(--sf-divider)"}`,
                  }}
                >
                  {isActive ? "Active" : "Inactive"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Cover image URL</label>
            <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://... or /uploads/..." className="h-11 border-[var(--sf-divider)]" style={fieldStyle} />
            {coverImage.trim() && (
              <img src={imageUrl(coverImage.trim())} alt="cover preview" className="mt-3 w-full h-32 object-cover rounded-lg border" style={{ borderColor: "var(--sf-divider)" }} />
            )}
          </div>
        </div>

        {/* Right: product selection */}
        <div className="rounded-xl border p-5 flex flex-col" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
              <Package className="w-4 h-4" style={{ color: "var(--sf-teal)" }} /> Products
            </label>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--sf-teal)", backgroundColor: "var(--sf-teal-glass)" }}>
              {selectedIds.length} selected
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
            <Input
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10 h-10 border-[var(--sf-divider)]"
              style={fieldStyle}
            />
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: "440px" }}>
            {visibleProducts.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--sf-text-muted)" }}>No products found.</p>
            ) : (
              visibleProducts.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ backgroundColor: checked ? "var(--sf-teal-glass)" : "transparent", border: `1px solid ${checked ? "var(--sf-teal-border)" : "transparent"}` }}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleProduct(p.id)} />
                    <img
                      src={p.image ? imageUrl(p.image) : ""}
                      alt=""
                      className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                      style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{p.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--sf-text-muted)", fontFamily: "monospace" }}>{p.sku}</p>
                    </div>
                    {checked && <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--sf-teal)" }} />}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
