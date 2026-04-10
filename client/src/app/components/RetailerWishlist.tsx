import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Heart,
  FolderPlus,
  FolderOpen,
  Pencil,
  Trash2,
  ShoppingCart,
  Search,
  X,
  Check,
  MoreVertical,
  ChevronRight,
  Plus,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

import { wishlist as wishlistApi, imageUrl } from "../../lib/api";

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

/** Ensure every folder object has a productIds array */
function mapFolders(raw: any[]): Folder[] {
  return raw.map((f: any) => ({
    id: f.id,
    name: f.name,
    color: f.color || "var(--sf-teal)",
    productIds: (Array.isArray(f.productIds) ? f.productIds : []).map(String),
  }));
}

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type WishlistProduct = {
  wishlist_id: string;
  id: string;
  name: string;
  sku: string;
  base_price: number;
  category: string;
  carat: number;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  image: string | null;
  added_at: string;
};

type Folder = {
  id: string;
  name: string;
  color: string;
  productIds: string[];
};

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' fill='%23181a1f'%3E%3Crect width='400' height='500'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

const FOLDER_COLORS = [
  "var(--sf-teal)",
  "var(--sf-blue-primary)",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
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

export function RetailerWishlist() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "All Saved"
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Fetch wishlist items and folders on mount
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsData, foldersData] = await Promise.all([
          wishlistApi.list(),
          wishlistApi.folders(),
        ]);
        if (!cancelled) {
          setProducts(Array.isArray(itemsData) ? itemsData : itemsData.items ?? []);
          setFolders(mapFolders(Array.isArray(foldersData) ? foldersData : foldersData.folders ?? []));
        }
      } catch {
        // silently handle — empty state will show
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Filtered products
  const displayed = useMemo(() => {
    let list = products;
    if (activeFolder) {
      const folder = folders.find((f) => f.id === activeFolder);
      if (folder) list = list.filter((p) => folder.productIds.includes(p.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, folders, activeFolder, search]);

  const activeFolderData = activeFolder ? folders.find((f) => f.id === activeFolder) : null;

  // -- Actions --

  const removeProduct = useCallback(
    async (productId: string) => {
      const prev = products;
      setProducts((p) => p.filter((item) => item.id !== productId));
      setFolders((flds) =>
        flds.map((f) => ({
          ...f,
          productIds: f.productIds.filter((pid) => pid !== productId),
        }))
      );
      setSelectedIds((s) => {
        const next = new Set(s);
        next.delete(productId);
        return next;
      });
      try {
        await wishlistApi.remove(productId);
      } catch {
        setProducts(prev); // revert
      }
    },
    [products]
  );

  const removeSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await removeProduct(id);
    }
    setSelectionMode(false);
  }, [selectedIds, removeProduct]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(displayed.map((p) => p.id)));
  }, [displayed]);

  const createFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      const created = await wishlistApi.createFolder(newFolderName.trim(), newFolderColor);
      setFolders((prev) => [
        ...prev,
        { id: created.id, name: created.name, color: created.color, productIds: created.productIds ?? [] },
      ]);
    } catch {
      // ignore
    }
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setCreateFolderOpen(false);
  }, [newFolderName, newFolderColor]);

  const renameFolder = useCallback(async () => {
    if (!editingFolder || !newFolderName.trim()) return;
    try {
      await wishlistApi.updateFolder(editingFolder.id, newFolderName.trim(), newFolderColor);
      setFolders((prev) =>
        prev.map((f) =>
          f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f
        )
      );
    } catch {
      // ignore
    }
    setRenameFolderOpen(false);
    setEditingFolder(null);
    setNewFolderName("");
  }, [editingFolder, newFolderName, newFolderColor]);

  const deleteFolder = useCallback(
    async (folderId: string) => {
      const prev = folders;
      setFolders((f) => f.filter((fl) => fl.id !== folderId));
      if (activeFolder === folderId) setActiveFolder(null);
      try {
        await wishlistApi.deleteFolder(folderId);
      } catch {
        setFolders(prev); // revert
      }
    },
    [activeFolder, folders]
  );

  const moveSelectedToFolder = useCallback(
    async (folderId: string) => {
      const wishlistIds = products
        .filter((p) => selectedIds.has(p.id))
        .map((p) => p.wishlist_id);
      // Optimistic
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== folderId) return f;
          const merged = new Set([...f.productIds, ...selectedIds]);
          return { ...f, productIds: Array.from(merged) };
        })
      );
      setMoveToFolderOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
      try {
        await wishlistApi.moveToFolder(folderId, wishlistIds);
      } catch {
        // re-fetch folders to get correct state
        try {
          const foldersData = await wishlistApi.folders();
          setFolders(mapFolders(Array.isArray(foldersData) ? foldersData : foldersData.folders ?? []));
        } catch { /* ignore */ }
      }
    },
    [selectedIds, products]
  );

  const orderSelected = useCallback(() => {
    alert(`Order request submitted for ${selectedIds.size} item(s)!`);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "var(--sf-teal)" }} />
          <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>Loading wishlist...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* === LEFT: Folders Sidebar === */}
          <aside className="hidden lg:block w-[240px] shrink-0">
            <div
              className="sticky top-20 rounded-xl border p-4"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                borderColor: "var(--sf-divider)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--sf-text-primary)" }}
                >
                  Folders
                </p>
                <button
                  onClick={() => { setNewFolderName(""); setCreateFolderOpen(true); }}
                  className="p-1 rounded-md transition-colors hover:bg-[var(--sf-bg-surface-2)]"
                  style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* All Saved */}
              <FolderButton
                label="All Saved"
                count={products.length}
                color="var(--sf-text-secondary)"
                active={activeFolder === null}
                onClick={() => setActiveFolder(null)}
              />

              <Separator className="my-2" style={{ backgroundColor: "var(--sf-divider)" }} />

              {/* Folder list */}
              {folders.map((folder) => (
                <div key={folder.id} className="group flex items-center">
                  <div className="flex-1 min-w-0">
                    <FolderButton
                      label={folder.name}
                      count={folder.productIds.filter((id) => products.some((p) => p.id === id)).length}
                      color={folder.color}
                      active={activeFolder === folder.id}
                      onClick={() => setActiveFolder(folder.id)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingFolder(folder);
                          setNewFolderName(folder.name);
                          setNewFolderColor(folder.color);
                          setRenameFolderOpen(true);
                        }}
                        className="text-xs gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteFolder(folder.id)}
                        className="text-xs gap-2 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {folders.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: "var(--sf-text-muted)" }}>
                  No folders yet
                </p>
              )}
            </div>
          </aside>

          {/* === RIGHT: Products === */}
          <div className="flex-1 min-w-0">
            {/* Mobile folder tabs */}
            <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveFolder(null)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  backgroundColor: activeFolder === null ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
                  borderColor: activeFolder === null ? "var(--sf-teal)" : "var(--sf-divider)",
                  color: activeFolder === null ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
                }}
              >
                <Heart className="w-3.5 h-3.5" /> All ({products.length})
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    backgroundColor: activeFolder === f.id ? f.color : "var(--sf-bg-surface-1)",
                    borderColor: activeFolder === f.id ? f.color : "var(--sf-divider)",
                    color: activeFolder === f.id ? "var(--sf-bg-base)" : "var(--sf-text-secondary)",
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {f.name}
                </button>
              ))}
              <button
                onClick={() => { setNewFolderName(""); setCreateFolderOpen(true); }}
                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border"
                style={{
                  backgroundColor: "var(--sf-bg-surface-1)",
                  borderColor: "var(--sf-divider)",
                  color: "var(--sf-teal)",
                }}
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {/* Search + Actions bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--sf-text-muted)" }}
                />
                <Input
                  placeholder="Search wishlist..."
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
              <Button
                variant={selectionMode ? "default" : "outline"}
                className="h-10 text-xs gap-1.5 border-[var(--sf-divider)]"
                style={
                  selectionMode
                    ? { backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }
                    : { backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-secondary)" }
                }
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedIds(new Set());
                }}
              >
                {selectionMode ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {selectionMode ? "Cancel" : "Select"}
              </Button>
            </div>

            {/* Selection toolbar — always visible in selection mode */}
            <AnimatePresence>
              {selectionMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="flex items-center gap-2 p-3 rounded-xl border flex-wrap"
                    style={{
                      backgroundColor: "var(--sf-bg-surface-1)",
                      borderColor: selectedIds.size > 0 ? "var(--sf-teal)" : "var(--sf-divider)",
                    }}
                  >
                    {/* Left: count + select all / deselect all */}
                    <span className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>
                      {selectedIds.size > 0 ? `${selectedIds.size} of ${displayed.length} selected` : "Select items"}
                    </span>
                    <button
                      onClick={selectedIds.size === displayed.length ? () => setSelectedIds(new Set()) : selectAll}
                      className="text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
                      style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      {selectedIds.size === displayed.length ? "Deselect all" : "Select all"}
                    </button>

                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        className="h-8 text-xs gap-1"
                        style={{ color: "var(--sf-text-secondary)" }}
                        disabled={selectedIds.size === 0}
                        onClick={() => setMoveToFolderOpen(true)}
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Move to folder</span>
                      </Button>
                      <Button
                        className="h-8 text-xs gap-1"
                        style={{
                          backgroundColor: selectedIds.size > 0 ? "var(--sf-teal)" : "var(--sf-bg-surface-2)",
                          color: selectedIds.size > 0 ? "var(--sf-bg-base)" : "var(--sf-text-muted)",
                        }}
                        disabled={selectedIds.size === 0}
                        onClick={orderSelected}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Order{selectedIds.size > 0 && ` (${selectedIds.size})`}
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 text-xs gap-1"
                        style={{ color: selectedIds.size > 0 ? "var(--destructive)" : "var(--sf-text-muted)" }}
                        disabled={selectedIds.size === 0}
                        onClick={removeSelected}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active folder header */}
            {activeFolderData && (
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeFolderData.color }}
                />
                <span className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
                  {activeFolderData.name}
                </span>
                <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                  ({displayed.length} items)
                </span>
              </div>
            )}

            {/* Product Grid */}
            {displayed.length === 0 ? (
              <EmptyState
                folder={!!activeFolder}
                onBrowse={() => navigate("/retailer/catalog")}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {displayed.map((product, i) => (
                  <WishlistCard
                    key={product.wishlist_id}
                    product={product}
                    index={i}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(product.id)}
                    onToggleSelect={() => toggleSelect(product.id)}
                    onRemove={() => removeProduct(product.id)}
                    onView={() => navigate(`/retailer/product/${product.id}`)}
                    onOrder={() => {
                      alert(`Order request submitted for: ${product.name}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* === Create Folder Dialog === */}
      <FolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="Create Folder"
        description="Organize your wishlist items into folders"
        name={newFolderName}
        onNameChange={setNewFolderName}
        color={newFolderColor}
        onColorChange={setNewFolderColor}
        onSubmit={createFolder}
        submitLabel="Create"
      />

      {/* === Rename Folder Dialog === */}
      <FolderDialog
        open={renameFolderOpen}
        onOpenChange={setRenameFolderOpen}
        title="Rename Folder"
        description="Update folder name and color"
        name={newFolderName}
        onNameChange={setNewFolderName}
        color={newFolderColor}
        onColorChange={setNewFolderColor}
        onSubmit={renameFolder}
        submitLabel="Save"
      />

      {/* === Move to Folder Dialog === */}
      <Dialog open={moveToFolderOpen} onOpenChange={setMoveToFolderOpen}>
        <DialogContent
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--sf-text-primary)" }}>
              Move to Folder
            </DialogTitle>
            <DialogDescription style={{ color: "var(--sf-text-secondary)" }}>
              Choose a folder for {selectedIds.size} selected item(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {folders.map((f) => {
              const alreadyInFolder = [...selectedIds].filter((id) => f.productIds.includes(id)).length;
              const newCount = selectedIds.size - alreadyInFolder;
              const allAlreadyIn = newCount === 0;
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{
                    borderColor: allAlreadyIn ? "var(--sf-glass-border)" : "var(--sf-divider)",
                    background: allAlreadyIn ? "var(--sf-bg-surface-2)" : "none",
                    opacity: allAlreadyIn ? 0.5 : 1,
                  }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block" style={{ color: "var(--sf-text-primary)" }}>
                      {f.name}
                    </span>
                    {alreadyInFolder > 0 && (
                      <span className="text-[11px] block mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                        {allAlreadyIn
                          ? `All ${selectedIds.size} already in this folder`
                          : `${alreadyInFolder} already here · ${newCount} new`}
                      </span>
                    )}
                  </div>
                  {allAlreadyIn ? (
                    <Badge className="text-[10px] shrink-0" style={{ backgroundColor: "var(--sf-teal-glass)", color: "var(--sf-teal)", border: "none" }}>
                      Added
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1 px-3 shrink-0"
                      style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}
                      onClick={() => moveSelectedToFolder(f.id)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {newCount === selectedIds.size ? "Add" : `Add ${newCount}`}
                    </Button>
                  )}
                </div>
              );
            })}
            {folders.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--sf-text-muted)" }}>
                No folders. Create one first.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" style={{ color: "var(--sf-text-secondary)" }}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function FolderButton({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left"
      style={{
        backgroundColor: active ? "var(--sf-bg-surface-2)" : "transparent",
        color: active ? "var(--sf-text-primary)" : "var(--sf-text-secondary)",
        border: "none",
        cursor: "pointer",
      }}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
        {count}
      </span>
    </button>
  );
}

function WishlistCard({
  product,
  index,
  selectionMode,
  selected,
  onToggleSelect,
  onRemove,
  onView,
  onOrder,
}: {
  product: WishlistProduct;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
  onView: () => void;
  onOrder: () => void;
}) {
  const availColors: Record<string, { bg: string; text: string; label: string }> = {
    "in-stock": { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "In Stock" },
    "made-to-order": { bg: "rgba(48,184,191,0.15)", text: "var(--sf-teal)", label: "Made to Order" },
    "out-of-stock": { bg: "rgba(194,23,59,0.15)", text: "var(--destructive)", label: "Out of Stock" },
  };
  const avail = availColors[product.availability] || availColors["in-stock"];
  const imgSrc = product.image ? imageUrl(product.image) : PLACEHOLDER_IMAGE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
      className="group rounded-xl border overflow-hidden relative cursor-pointer"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: selected ? "var(--sf-teal)" : "var(--sf-divider)",
        boxShadow: selected ? "0 0 0 1px var(--sf-teal), 0 0 12px var(--sf-shadow-teal)" : "none",
        opacity: selectionMode && !selected ? 0.75 : 1,
        transition: "all 0.2s ease",
      }}
      onClick={selectionMode ? onToggleSelect : undefined}
    >
      {/* Selection checkbox — visible in selection mode */}
      {selectionMode && (
        <div
          className="absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all"
          style={{
            backgroundColor: selected ? "var(--sf-teal)" : "var(--sf-bg-surface-1)",
            borderColor: selected ? "var(--sf-teal)" : "var(--sf-divider)",
            color: "#fff",
            boxShadow: selected ? "0 2px 8px var(--sf-shadow-teal)" : "0 1px 4px var(--sf-shadow-lg)",
          }}
        >
          {selected && <Check className="w-4 h-4" strokeWidth={3} />}
        </div>
      )}

      {/* Image */}
      <div
        className="aspect-[4/5] overflow-hidden relative"
        onClick={!selectionMode ? onView : undefined}
      >
        <img
          src={imgSrc}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-300 ${selectionMode && selected ? "scale-95 rounded-lg" : "group-hover:scale-105"}`}
        />
        {/* Quick actions overlay — non-selection mode */}
        {!selectionMode && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ backgroundColor: "var(--sf-backdrop)", color: "#ef4444", border: "none", cursor: "pointer" }}
            >
              <Heart className="w-4 h-4" fill="#ef4444" />
            </button>
          </div>
        )}
        {/* Availability badge */}
        <Badge
          className="absolute bottom-2 left-2 text-[10px] backdrop-blur-md"
          style={{ backgroundColor: avail.bg, color: avail.text, border: "none" }}
        >
          {avail.label}
        </Badge>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs mb-0.5" style={{ color: "var(--sf-text-muted)" }}>
          {product.category} {product.carat > 0 && `· ${product.carat} ct`}
        </p>
        <p
          className="text-sm font-medium truncate mb-1"
          style={{ color: "var(--sf-text-primary)" }}
          onClick={!selectionMode ? onView : undefined}
        >
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
            {formatPrice(product.base_price)}
          </p>
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1 px-2"
              style={{ color: "var(--sf-teal)" }}
              onClick={(e) => { e.stopPropagation(); onOrder(); }}
            >
              <ShoppingCart className="w-3 h-3" />
              Order
            </Button>
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--sf-text-muted)" }}>
          Added {formatDate(product.added_at)}
        </p>
      </div>
    </motion.div>
  );
}

function EmptyState({
  folder,
  onBrowse,
}: {
  folder: boolean;
  onBrowse: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Heart
        className="w-12 h-12 mb-4"
        style={{ color: "var(--sf-text-muted)" }}
      />
      <p className="text-lg font-medium mb-1" style={{ color: "var(--sf-text-secondary)" }}>
        {folder ? "This folder is empty" : "Your wishlist is empty"}
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--sf-text-muted)" }}>
        {folder
          ? "Move items here from your wishlist"
          : "Browse the catalog and save items you love"}
      </p>
      <Button
        className="gap-2"
        style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
        onClick={onBrowse}
      >
        Browse Catalog
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function FolderDialog({
  open,
  onOpenChange,
  title,
  description,
  name,
  onNameChange,
  color,
  onColorChange,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  name: string;
  onNameChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--sf-text-primary)" }}>{title}</DialogTitle>
          <DialogDescription style={{ color: "var(--sf-text-secondary)" }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--sf-text-secondary)" }}>
              Folder Name
            </label>
            <Input
              placeholder="e.g., Wedding Collection"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="border-[var(--sf-divider)]"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--sf-text-secondary)" }}>
              Color
            </label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                    boxShadow: color === c ? `0 0 0 2px var(--sf-bg-base), 0 0 0 4px ${c}` : "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" style={{ color: "var(--sf-text-secondary)" }}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={!name.trim()}
            style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
