import { useState, useMemo, useCallback } from "react";
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

import ringsImg from "../../assets/Images/rings.jpg";
import necklaceImg from "../../assets/Images/necklace.jpg";
import earingsImg from "../../assets/Images/earings.jpg";
import bengalsImg from "../../assets/Images/bengals.jpg";
import img1 from "../../assets/Images/1.jpg";
import img3 from "../../assets/Images/3.jpg";
import img4 from "../../assets/Images/4.jpg";
import img5 from "../../assets/Images/5.jpg";
import img7 from "../../assets/Images/7.jpg";
import img8 from "../../assets/Images/8.jpg";
import img11 from "../../assets/Images/11.jpg";
import img12 from "../../assets/Images/12.jpg";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type WishlistProduct = {
  id: number;
  name: string;
  price: number;
  priceLabel: string;
  category: string;
  carat: number;
  availability: "in-stock" | "made-to-order" | "out-of-stock";
  image: string;
  addedAt: string;
};

type Folder = {
  id: string;
  name: string;
  color: string;
  productIds: number[];
};

/* ═══════════════════════════════════════════════════════
   MOCK DATA — replace with API
   ═══════════════════════════════════════════════════════ */

const INITIAL_PRODUCTS: WishlistProduct[] = [
  { id: 1, name: "Solitaire Diamond Ring", price: 125000, priceLabel: "₹1,25,000", category: "Rings", carat: 1.5, availability: "in-stock", image: img1, addedAt: "Mar 28, 2026" },
  { id: 2, name: "Emerald Drop Earrings", price: 85000, priceLabel: "₹85,000", category: "Earrings", carat: 0.8, availability: "in-stock", image: img3, addedAt: "Mar 27, 2026" },
  { id: 3, name: "Pearl Chain Necklace", price: 150000, priceLabel: "₹1,50,000", category: "Necklaces", carat: 2.0, availability: "made-to-order", image: img4, addedAt: "Mar 26, 2026" },
  { id: 4, name: "Sapphire Tennis Bracelet", price: 210000, priceLabel: "₹2,10,000", category: "Bracelets", carat: 3.5, availability: "in-stock", image: img5, addedAt: "Mar 25, 2026" },
  { id: 5, name: "Diamond Stud Set", price: 95000, priceLabel: "₹95,000", category: "Earrings", carat: 1.0, availability: "in-stock", image: img7, addedAt: "Mar 24, 2026" },
  { id: 6, name: "Gold Bangle Pair", price: 75000, priceLabel: "₹75,000", category: "Bangles", carat: 0.0, availability: "in-stock", image: img8, addedAt: "Mar 23, 2026" },
  { id: 7, name: "Ruby Pendant", price: 65000, priceLabel: "₹65,000", category: "Pendants", carat: 0.6, availability: "in-stock", image: img11, addedAt: "Mar 22, 2026" },
  { id: 8, name: "Platinum Band Ring", price: 180000, priceLabel: "₹1,80,000", category: "Rings", carat: 0.5, availability: "made-to-order", image: img12, addedAt: "Mar 21, 2026" },
];

const FOLDER_COLORS = [
  "var(--sf-teal)",
  "var(--sf-blue-primary)",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
];

const INITIAL_FOLDERS: Folder[] = [
  { id: "f1", name: "Wedding Collection", color: FOLDER_COLORS[0], productIds: [1, 3, 4] },
  { id: "f2", name: "Daily Wear", color: FOLDER_COLORS[1], productIds: [5, 6] },
  { id: "f3", name: "Gift Ideas", color: FOLDER_COLORS[2], productIds: [2, 7] },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function RetailerWishlist() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "All Saved"
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

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

  // ── Actions ───────────────────────────────────────

  const removeProduct = useCallback(
    (id: number) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          productIds: f.productIds.filter((pid) => pid !== id),
        }))
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    []
  );

  const removeSelected = useCallback(() => {
    selectedIds.forEach((id) => removeProduct(id));
    setSelectionMode(false);
  }, [selectedIds, removeProduct]);

  const toggleSelect = useCallback((id: number) => {
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

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const id = "f" + Date.now();
    setFolders((prev) => [
      ...prev,
      { id, name: newFolderName.trim(), color: newFolderColor, productIds: [] },
    ]);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setCreateFolderOpen(false);
  }, [newFolderName, newFolderColor]);

  const renameFolder = useCallback(() => {
    if (!editingFolder || !newFolderName.trim()) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f
      )
    );
    setRenameFolderOpen(false);
    setEditingFolder(null);
    setNewFolderName("");
  }, [editingFolder, newFolderName, newFolderColor]);

  const deleteFolder = useCallback(
    (folderId: string) => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolder === folderId) setActiveFolder(null);
    },
    [activeFolder]
  );

  const moveSelectedToFolder = useCallback(
    (folderId: string) => {
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
    },
    [selectedIds]
  );

  const orderSelected = useCallback(() => {
    // TODO: integrate with order API
    alert(`Order request submitted for ${selectedIds.size} item(s)!`);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds]);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* ═══ LEFT: Folders Sidebar ═════════════════ */}
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

          {/* ═══ RIGHT: Products ═══════════════════════ */}
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

            {/* Selection toolbar */}
            <AnimatePresence>
              {selectionMode && selectedIds.size > 0 && (
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
                      borderColor: "var(--sf-teal)",
                    }}
                  >
                    <span className="text-xs font-medium mr-auto" style={{ color: "var(--sf-text-primary)" }}>
                      {selectedIds.size} selected
                    </span>
                    <Button
                      variant="ghost"
                      className="h-8 text-xs gap-1"
                      style={{ color: "var(--sf-text-secondary)" }}
                      onClick={selectAll}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 text-xs gap-1"
                      style={{ color: "var(--sf-text-secondary)" }}
                      onClick={() => setMoveToFolderOpen(true)}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Move to folder
                    </Button>
                    <Button
                      className="h-8 text-xs gap-1"
                      style={{ backgroundColor: "var(--sf-teal)", color: "var(--sf-bg-base)" }}
                      onClick={orderSelected}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Order ({selectedIds.size})
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 text-xs gap-1"
                      style={{ color: "var(--destructive)" }}
                      onClick={removeSelected}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </Button>
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
                    key={product.id}
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

      {/* ═══ Create Folder Dialog ═══════════════════ */}
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

      {/* ═══ Rename Folder Dialog ═══════════════════ */}
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

      {/* ═══ Move to Folder Dialog ═════════════════ */}
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
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => moveSelectedToFolder(f.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left hover:bg-[var(--sf-bg-surface-2)]"
                style={{
                  borderColor: "var(--sf-divider)",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                <span className="text-sm font-medium flex-1" style={{ color: "var(--sf-text-primary)" }}>
                  {f.name}
                </span>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
              </button>
            ))}
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
  const avail = availColors[product.availability];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.35 }}
      className="group rounded-xl border overflow-hidden relative"
      style={{
        backgroundColor: "var(--sf-bg-surface-1)",
        borderColor: selected ? "var(--sf-teal)" : "var(--sf-divider)",
        boxShadow: selected ? "0 0 0 1px var(--sf-teal)" : "none",
      }}
    >
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <button
          onClick={onToggleSelect}
          className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center border transition-colors"
          style={{
            backgroundColor: selected ? "var(--sf-teal)" : "rgba(8, 10, 13, 0.6)",
            borderColor: selected ? "var(--sf-teal)" : "var(--sf-divider)",
            color: "white",
            cursor: "pointer",
          }}
        >
          {selected && <Check className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Image */}
      <div
        className="aspect-[4/5] overflow-hidden cursor-pointer relative"
        onClick={selectionMode ? onToggleSelect : onView}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Quick actions overlay */}
        {!selectionMode && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ backgroundColor: "rgba(8,10,13,0.6)", color: "#ef4444", border: "none", cursor: "pointer" }}
            >
              <Heart className="w-4 h-4" fill="#ef4444" />
            </button>
          </div>
        )}
        {/* Availability badge */}
        <Badge
          className="absolute bottom-2 left-2 text-[10px]"
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
          className="text-sm font-medium truncate mb-1 cursor-pointer"
          style={{ color: "var(--sf-text-primary)" }}
          onClick={onView}
        >
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>
            {product.priceLabel}
          </p>
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1 px-2"
              style={{ color: "var(--sf-teal)" }}
              onClick={onOrder}
            >
              <ShoppingCart className="w-3 h-3" />
              Order
            </Button>
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--sf-text-muted)" }}>
          Added {product.addedAt}
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
