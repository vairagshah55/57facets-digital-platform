import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Eye } from "lucide-react";
import { ProductDetail } from "../ProductDetail";
import { CartProvider } from "../../../context/CartContext";
import { adminPricing } from "../../../lib/adminApi";

/* Admin "view as retailer": renders the real retailer ProductDetail (read-only),
   with a dropdown to preview the exact price each retailer would see. */
export function AdminProductPreview() {
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState<any[]>([]);
  const [retailerId, setRetailerId] = useState("");

  useEffect(() => {
    adminPricing.retailers().then((d: any) => setRetailers(d || [])).catch(() => {});
  }, []);

  return (
    <div>
      {/* Preview toolbar */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 mb-2 rounded-xl"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}>
        <button onClick={() => navigate("/admin/products")}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ color: "var(--sf-text-secondary)", border: "1px solid var(--sf-divider)", background: "none", cursor: "pointer" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--sf-teal)" }}>
          <Eye className="w-3.5 h-3.5" /> Retailer preview
        </span>
        <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Price as:</span>
        <select value={retailerId} onChange={(e) => setRetailerId(e.target.value)}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-2)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)", minWidth: 220 }}>
          <option value="">Select a retailer…</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* The real retailer product page, read-only — requires a retailer selection. */}
      {retailerId ? (
        <div style={{ pointerEvents: "auto" }}>
          <CartProvider>
            <ProductDetail adminPreview previewRetailerId={retailerId} />
          </CartProvider>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center rounded-2xl py-20 px-6"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)" }}>
          <Eye className="w-7 h-7 mb-3" style={{ color: "var(--sf-text-muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Select a retailer to preview</p>
          <p className="text-xs mt-1" style={{ color: "var(--sf-text-muted)" }}>Choose a retailer above to see the product and its pricing as they would.</p>
        </div>
      )}
    </div>
  );
}
