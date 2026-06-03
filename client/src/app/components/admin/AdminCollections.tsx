import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Loader2, Layers, AlertTriangle, X } from "lucide-react";
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
import { adminCollections } from "../../../lib/adminApi";
import { imageUrl } from "../../../lib/api";

type CollectionItem = {
  id: string;
  name: string;
  tagline: string | null;
  tag: "seasonal" | "themed" | "bridal" | "new-launch" | "festive";
  cover_image: string | null;
  launch_date: string | null;
  is_active: boolean;
  product_count: number | string;
};

export const TAG_META: Record<string, { label: string; color: string; bg: string }> = {
  seasonal: { label: "Seasonal", color: "#30B8BF", bg: "rgba(48,184,191,0.15)" },
  themed: { label: "Themed", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  bridal: { label: "Bridal", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  "new-launch": { label: "New Launch", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  festive: { label: "Festive", color: "#ec4899", bg: "rgba(236,72,153,0.15)" },
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' fill='%23131A25'%3E%3Crect width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-size='14'%3ENo Cover%3C/text%3E%3C/svg%3E";

export function AdminCollections() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CollectionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      const data = await adminCollections.list(params);
      setCollections(Array.isArray(data) ? data : []);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminCollections.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch {
      /* surfaced by the API helper */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
            <Layers className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight" style={{ fontFamily: "'Melodrama','Georgia',serif", color: "var(--sf-text-primary)" }}>
              Collections
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
              {collections.length} {collections.length === 1 ? "collection" : "collections"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
            <Input
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-primary)" }}
            />
          </div>
          <Button
            onClick={() => navigate("/admin/collections/new")}
            className="h-10 gap-1.5 whitespace-nowrap"
            style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> New Collection
          </Button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--sf-teal)" }} />
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Layers className="w-12 h-12 mb-4" style={{ color: "var(--sf-text-muted)", opacity: 0.4 }} />
          <p className="text-base font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>No collections yet</p>
          <p className="text-sm mb-4" style={{ color: "var(--sf-text-muted)" }}>Create your first collection to group products.</p>
          <Button onClick={() => navigate("/admin/collections/new")} className="gap-1.5" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
            <Plus className="w-4 h-4" /> New Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c, i) => {
            const meta = TAG_META[c.tag] || TAG_META.themed;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
                className="group rounded-xl border overflow-hidden flex flex-col"
                style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", opacity: c.is_active ? 1 : 0.55 }}
              >
                <div className="relative h-32 overflow-hidden" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
                  <img src={c.cover_image ? imageUrl(c.cover_image) : PLACEHOLDER} alt={c.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: meta.color, backgroundColor: meta.bg, backdropFilter: "blur(4px)" }}>
                    {meta.label}
                  </span>
                  {!c.is_active && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: "#fff", backgroundColor: "rgba(0,0,0,0.6)" }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold line-clamp-1" style={{ color: "var(--sf-text-primary)" }}>{c.name}</p>
                  <p className="text-xs line-clamp-1 mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{c.tagline || "—"}</p>
                  <p className="text-xs mt-2" style={{ color: "var(--sf-text-secondary)" }}>
                    {Number(c.product_count)} {Number(c.product_count) === 1 ? "product" : "products"}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                    <Button
                      variant="outline"
                      className="flex-1 h-8 gap-1.5 text-xs rounded-lg border-[var(--sf-divider)]"
                      style={{ color: "var(--sf-text-secondary)", backgroundColor: "var(--sf-bg-surface-2)" }}
                      onClick={() => navigate(`/admin/collections/${c.id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-lg border-[var(--sf-divider)]"
                      style={{ color: "#ef4444", backgroundColor: "var(--sf-bg-surface-2)" }}
                      onClick={() => setDeleteTarget(c)}
                      title="Deactivate collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--sf-text-primary)" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} /> Deactivate collection
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-secondary)" }}>
              "{deleteTarget?.name}" will be hidden from retailers. Its products are not deleted. You can reactivate it later by editing it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-[var(--sf-divider)]" style={{ color: "var(--sf-text-secondary)" }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={confirmDelete} disabled={deleting} style={{ backgroundColor: "#ef4444", color: "#fff" }}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Deactivate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
