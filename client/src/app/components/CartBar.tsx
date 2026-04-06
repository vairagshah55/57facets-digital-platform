import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  X,
  Minus,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  Check,
  StickyNote,
  Diamond,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useCart } from "../../context/CartContext";
import { orders as ordersApi } from "../../lib/api";

const formatPrice = (p: number) => "₹" + p.toLocaleString("en-IN");

export function CartBar() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, updateNote, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  const handlePlaceOrder = useCallback(async () => {
    setPlacing(true);
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        carat: item.carat,
        metalType: item.metalType,
        goldColour: item.goldColour,
        diamondShape: item.diamondShape,
        diamondShade: item.diamondShade,
        diamondQuality: item.diamondQuality,
        colorStoneName: item.colorStoneName,
        colorStoneQuality: item.colorStoneQuality,
        note: item.note,
      }));
      await ordersApi.create(orderItems);
      setSuccess(true);
      clearCart();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        navigate("/retailer/orders");
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }, [items, clearCart, navigate]);

  if (totalItems === 0) return null;

  return (
    <>
      {/* ── Sticky bottom bar ─────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
        style={{ width: "min(480px, calc(100vw - 32px))" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, var(--sf-teal) 0%, #1a9fa6 100%)",
            boxShadow: `0 8px 32px var(--sf-shadow-teal), 0 2px 8px var(--sf-shadow-lg)`,
          }}
        >
          {/* Left: item count badge */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
              style={{ background: "rgba(0,0,0,0.22)", color: "#fff" }}
            >
              {totalItems}
            </div>
            <span className="text-[13px] font-semibold text-white">
              {totalItems === 1 ? "1 item" : `${totalItems} items`} added
            </span>
          </div>

          {/* Right: total + arrow */}
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-black text-white">{formatPrice(totalPrice)}</span>
            <div className="flex items-center gap-1 text-white/90">
              <span className="text-[12px] font-semibold">View Cart</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Cart drawer ────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "var(--sf-backdrop)", backdropFilter: "blur(4px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
              style={{
                backgroundColor: "var(--sf-bg-surface-1)",
                maxHeight: "85vh",
                boxShadow: `0 -8px 40px var(--sf-shadow-lg)`,
                border: `1px solid var(--sf-glass-border)`,
                borderBottom: "none",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--sf-glass-handle)" }} />
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: `1px solid var(--sf-divider)` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "var(--sf-teal-glass)",
                      border: `1px solid var(--sf-teal-border)`,
                    }}
                  >
                    <ShoppingCart className="w-4.5 h-4.5" style={{ color: "var(--sf-teal)", width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "var(--sf-text-primary)" }}>
                      Your Cart
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                      {totalItems} item{totalItems !== 1 ? "s" : ""} · {formatPrice(totalPrice)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: "var(--sf-glass-bg-hover)",
                    color: "var(--sf-text-muted)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "thin" }}>
                {items.map((item) => (
                  <div
                    key={item.cartId}
                    className="mb-3 rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--sf-glass-bg)",
                      border: `1px solid var(--sf-glass-border)`,
                    }}
                  >
                    {/* Item row */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      {/* Image / placeholder */}
                      <div
                        className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ background: "var(--sf-glass-pill)", border: `1px solid var(--sf-glass-border)` }}
                      >
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <Diamond className="w-6 h-6" style={{ color: "var(--sf-text-muted)" }} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-bold truncate leading-tight"
                          style={{ color: "var(--sf-text-primary)" }}
                        >
                          {item.productName}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                          SKU: {item.productSku}
                        </p>
                        {/* Customization pills */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.carat && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--sf-teal-subtle)", color: "var(--sf-teal)" }}>
                              {item.carat} ct
                            </span>
                          )}
                          {item.metalType && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--sf-gold-subtle)", color: "#D4A843" }}>
                              {item.metalType} {item.goldColour || ""}
                            </span>
                          )}
                          {item.diamondShape && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--sf-glass-bg-hover)", color: "var(--sf-text-muted)" }}>
                              {[item.diamondShape, item.diamondShade, item.diamondQuality].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {item.colorStoneName && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--sf-purple-subtle)", color: "#9B59B6" }}>
                              {item.colorStoneName} {item.colorStoneQuality || ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unit price */}
                      <div className="text-right shrink-0 ml-1">
                        <p className="text-[13px] font-bold" style={{ color: "var(--sf-text-primary)" }}>
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>
                          {formatPrice(item.unitPrice)} ea
                        </p>
                      </div>
                    </div>

                    {/* Controls row */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderTop: `1px solid var(--sf-glass-border)` }}
                    >
                      {/* Qty stepper */}
                      <div
                        className="flex items-center rounded-lg overflow-hidden"
                        style={{ border: `1px solid var(--sf-glass-border-strong)` }}
                      >
                        <button
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors"
                          style={{ color: "var(--sf-text-muted)", border: "none", background: "none", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sf-teal-subtle)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className="w-9 h-8 flex items-center justify-center text-[13px] font-bold border-x"
                          style={{ color: "var(--sf-text-primary)", borderColor: "var(--sf-glass-border-strong)" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors"
                          style={{ color: "var(--sf-text-muted)", border: "none", background: "none", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sf-teal-subtle)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Note toggle */}
                        <button
                          onClick={() => setNoteOpen(noteOpen === item.cartId ? null : item.cartId)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                          style={{
                            background: noteOpen === item.cartId || item.note ? "var(--sf-teal-subtle)" : "var(--sf-glass-pill)",
                            color: noteOpen === item.cartId || item.note ? "var(--sf-teal)" : "var(--sf-text-muted)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <StickyNote className="w-3 h-3" />
                          Note
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.cartId)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--sf-red-text)", border: "none", background: "var(--sf-glass-pill)", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sf-red-subtle)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--sf-glass-pill)"; }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note input */}
                    <AnimatePresence>
                      {noteOpen === item.cartId && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3" style={{ borderTop: `1px solid var(--sf-glass-border)` }}>
                            <textarea
                              placeholder="Add a note (engraving, size, special requests…)"
                              value={item.note || ""}
                              onChange={(e) => updateNote(item.cartId, e.target.value)}
                              rows={2}
                              className="w-full mt-2.5 px-3 py-2 rounded-xl text-[12px] resize-none outline-none"
                              style={{
                                background: "var(--sf-glass-pill)",
                                border: `1px solid var(--sf-glass-border-strong)`,
                                color: "var(--sf-text-primary)",
                                fontFamily: "inherit",
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Footer: summary + place order */}
              <div
                className="shrink-0 px-4 pt-3 pb-6"
                style={{ borderTop: `1px solid var(--sf-divider)`, background: "var(--sf-bg-surface-1)" }}
              >
                {/* Price summary */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div>
                    <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                      {totalItems} item{totalItems !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[20px] font-black leading-tight" style={{ color: "var(--sf-text-primary)" }}>
                      {formatPrice(totalPrice)}
                    </p>
                  </div>
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      color: "var(--sf-red-text)",
                      background: "var(--sf-red-subtle)",
                      border: `1px solid var(--sf-red-border)`,
                      cursor: "pointer",
                    }}
                  >
                    Clear cart
                  </button>
                </div>

                {/* Place Order button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || success}
                  className="w-full h-13 flex items-center justify-center gap-2.5 rounded-2xl text-[15px] font-bold transition-all"
                  style={{
                    height: 52,
                    background: success
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, var(--sf-teal) 0%, #1a9fa6 100%)",
                    color: "#fff",
                    border: "none",
                    cursor: placing || success ? "default" : "pointer",
                    boxShadow: success
                      ? "0 4px 20px rgba(34,197,94,0.4)"
                      : `0 4px 20px var(--sf-shadow-teal)`,
                    opacity: placing ? 0.8 : 1,
                  }}
                >
                  {placing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</>
                  ) : success ? (
                    <><Check className="w-5 h-5" /> Order Placed!</>
                  ) : (
                    <>Place Order · {formatPrice(totalPrice)} <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
