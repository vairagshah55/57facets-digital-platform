import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { motion } from "framer-motion";
import {
  Gem, Coins, Sparkles, Hammer, Users, Calculator, Landmark, ChevronDown,
  Plus, Trash2, Save, Upload, Loader2, Check, X, Search, RefreshCw, Download,
} from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { adminPricing, adminProducts } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════ */
type TabKey = "gold" | "diamond" | "stones" | "making" | "duty" | "retailers" | "preview";
const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "gold", label: "Gold Rates", icon: Coins, color: "#f59e0b" },
  { key: "diamond", label: "Diamond Rates", icon: Gem, color: "#a855f7" },
  { key: "stones", label: "Stone Rates", icon: Sparkles, color: "#22c55e" },
  { key: "making", label: "Making", icon: Hammer, color: "#3b82f6" },
  { key: "duty", label: "Duty", icon: Landmark, color: "#14b8a6" },
  { key: "preview", label: "SKU Price", icon: Calculator, color: "#ec4899" },
];

const fmt = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

/* Option label for the product pickers. Imported products often have a blank
   `name`, which rendered as a dangling "SKU — ", so fall back to whatever does
   identify the piece: category · type · sub-type · metal. */
const skuLabel = (p: any) => {
  const name = String(p.name ?? "").trim();
  const rest = name || [p.category, p.type_category, p.sub_category, p.metal_type]
    .map((x: any) => String(x ?? "").trim()).filter(Boolean).join(" · ");
  return rest ? `${p.sku} — ${rest}` : String(p.sku ?? "");
};

/* Which chart the rate tabs read/write: "" = Global default, else a retailer id.
   Unset cells in a retailer's chart fall back to Global. */
const ScopeContext = createContext<string>("");
const useScope = () => useContext(ScopeContext);
// Every rate tab now has its own country/scope controls inside the tab, so the
// shared root scope selector is no longer used.
const CHART_TABS: TabKey[] = [];

/* ═══════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════ */
export function AdminPricing() {
  const [tab, setTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem("sf_pricing_tab");
    return (saved && TABS.some((t) => t.key === saved)) ? (saved as TabKey) : "gold";
  });
  // Remember the active tab across reloads.
  useEffect(() => { localStorage.setItem("sf_pricing_tab", tab); }, [tab]);
  const [importing, setImporting] = useState(false);
  const [scope, setScope] = useState("");           // "" = Global, else retailer id
  const [retailers, setRetailers] = useState<any[]>([]);

  useEffect(() => {
    adminPricing.retailers().then((d: any) => setRetailers(d || [])).catch(() => { });
  }, []);

  // The scope-aware tabs (diamond, making) are retailer-only. When one is
  // active with no retailer chosen, default to the first retailer so the
  // dropdown isn't left blank.
  useEffect(() => {
    if (CHART_TABS.includes(tab) && !scope) {
      setScope(retailers[0]?.id ?? "");
    }
  }, [tab, scope, retailers]);

  const onImport = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const r = await adminPricing.importChart(file);
      toast.success(`Imported · ${r.diamondRates} diamond · ${r.stoneRates} stone · ${r.metalRates} metal rows`);
      // force tabs to refetch by bumping a key
      window.dispatchEvent(new CustomEvent("pricing:imported"));
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'General Sans', 'Inter', sans-serif", color: "var(--sf-text-primary)" }}>
            Pricing
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
            Master rate chart &amp; per-retailer pricing
          </p>
        </div>
        <label>
          <input type="file" accept=".xlsx" hidden disabled={importing}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          <span
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium cursor-pointer"
            style={{ border: "1px solid var(--sf-divider)", color: "var(--sf-text-secondary)", backgroundColor: "var(--sf-bg-surface-1)" }}>
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Import Rate Chart
          </span>
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? t.color : "var(--sf-bg-surface-1)",
                color: active ? "#fff" : "var(--sf-text-secondary)",
                border: "none", cursor: "pointer",
              }}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Chart scope selector — only for the rate-chart tabs */}
      {CHART_TABS.includes(tab) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Editing chart for:</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-9 text-sm rounded-lg px-2"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)", minWidth: 220 }}>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {scope && (
            <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
              Empty cells fall back to the Global chart.
            </span>
          )}
        </div>
      )}

      {/* Panels */}
      <ScopeContext.Provider value={scope}>
        <motion.div key={tab + ":" + scope} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "gold" && <GoldTab />}
          {tab === "diamond" && <DiamondTab retailers={retailers} />}
          {tab === "stones" && <StonesTab />}
          {tab === "making" && <MakingTab retailers={retailers} />}
          {tab === "duty" && <DutyTab retailers={retailers} />}
          {tab === "preview" && <PreviewTab />}
        </motion.div>
      </ScopeContext.Provider>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════ */
function Card({ children, title, sub, action, noClip }: any) {
  return (
    // noClip: let an absolutely-positioned child (the SKU dropdown) escape the
    // card instead of being clipped by overflow-hidden.
    <div className={`rounded-2xl border mb-5 ${noClip ? "" : "overflow-hidden"}`} style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--sf-divider)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>{title}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Cell({ value, onChange, type = "text", placeholder, options }: any) {
  const style = { backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" };
  if (options) {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 rounded-md text-xs border outline-none" style={style as any}>
        <option value="">—</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)}
      className="w-full h-8 px-2 rounded-md text-xs border outline-none" style={style as any} />
  );
}

function SkeletonRows({ cols = 4, n = 5 }: { cols?: number; n?: number }) {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="skeleton-shimmer h-8 rounded-md" style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SaveBtn({ onClick, saving, label = "Save" }: any) {
  return (
    <Button onClick={onClick} disabled={saving} size="sm" className="h-8 gap-1.5 text-xs"
      style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {label}
    </Button>
  );
}

function useImportRefresh(reload: () => void) {
  useEffect(() => {
    const h = () => reload();
    window.addEventListener("pricing:imported", h);
    return () => window.removeEventListener("pricing:imported", h);
  }, [reload]);
}

/* ═══════════════════════════════════════════════════════
   GOLD RATES
   ═══════════════════════════════════════════════════════ */
const GOLD_COUNTRIES = ["India", "United States"];
function GoldTab() {
  // Gold rates are per country (India / United States) — entered separately.
  const [country, setCountry] = useState("India");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isIndia = country === "India";
  const cur = isIndia ? "₹" : "$";

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.metalRates(country).then((d: any) => {
      const byType = new Map((d || []).map((r: any) => [r.gold_type, r.rate_per_gram]));
      setRows(["14KT", "18KT", "22KT", "24KT"].map((g) => ({ gold_type: g, rate_per_gram: byType.has(g) ? byType.get(g) : "" })));
    }).catch(() => { }).finally(() => setLoading(false));
  }, [country]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      await adminPricing.saveMetalRates(rows.map((r) => ({ gold_type: r.gold_type, rate_per_gram: Number(r.rate_per_gram) || 0 })), country);
      toast.success(`${country} gold rates updated`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r: any = await adminPricing.syncGold();
      toast.success(`Live gold synced · 24KT ₹${r.rates?.["24KT"]}/g`);
      load();
    } catch (e: any) { toast.error(e.message || "Sync failed"); } finally { setSyncing(false); }
  };

  return (
    <Card title="Gold rate per gram" sub="Entered separately per country (India ₹ · United States $) — no conversion"
      action={
        <div className="flex items-center gap-2">
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="h-8 text-xs rounded-lg px-2"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)" }}>
            {GOLD_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {isIndia && (
            <Button onClick={sync} disabled={syncing} size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
              style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync live
            </Button>
          )}
          <SaveBtn onClick={save} saving={saving} />
        </div>
      }>
      {loading ? <SkeletonRows cols={2} n={4} /> : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rows.map((r, i) => (
            <div key={r.gold_type} className="rounded-xl border p-3" style={{ borderColor: "var(--sf-divider)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-secondary)" }}>{r.gold_type}</p>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--sf-text-muted)" }}>{cur}</span>
                <input type="number" value={r.rate_per_gram ?? ""}
                  onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, rate_per_gram: e.target.value } : x))}
                  className="w-full h-9 pl-6 pr-2 rounded-md text-sm border outline-none"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--sf-text-muted)" }}>per gram</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   GENERIC EDITABLE TABLE (diamond / sieve / stone / making)
   ═══════════════════════════════════════════════════════ */
function EditableTable({ cols, rows, setRows, addTemplate }: any) {
  const update = (i: number, key: string, v: any) => setRows((p: any[]) => p.map((r, j) => j === i ? { ...r, [key]: v } : r));
  const remove = (i: number) => setRows((p: any[]) => p.filter((_, j) => j !== i));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--sf-divider)" }}>
            {cols.map((c: any) => (
              <th key={c.key} className="text-left text-xs font-semibold px-3 py-2 whitespace-nowrap" style={{ color: "var(--sf-text-muted)" }}>{c.label}</th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-xs" style={{ color: "var(--sf-text-muted)" }}>No rows yet — add one below.</td></tr>
          ) : rows.map((r: any, i: number) => (
            <tr key={r.id || i} style={{ borderBottom: "1px solid var(--sf-divider)" }}>
              {cols.map((c: any) => (
                <td key={c.key} className="px-3 py-1.5" style={{ minWidth: c.width || 90 }}>
                  {c.compute ? (
                    <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>{c.compute(r)}</span>
                  ) : c.suffix ? (
                    <div className="flex items-center gap-1.5">
                      <Cell value={r[c.key]} type={c.type} options={c.options} placeholder={c.placeholder}
                        onChange={(v: any) => update(i, c.key, v)} />
                      <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--sf-text-muted)" }}>{c.suffix(r)}</span>
                    </div>
                  ) : (
                    <Cell value={r[c.key]} type={c.type} options={c.options} placeholder={c.placeholder}
                      onChange={(v: any) => update(i, c.key, v)} />
                  )}
                </td>
              ))}
              <td className="px-2">
                <button onClick={() => remove(i)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3">
        <button onClick={() => setRows((p: any[]) => [...p, { ...addTemplate }])}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ color: "var(--sf-teal)", backgroundColor: "var(--sf-bg-surface-2)", border: "none", cursor: "pointer" }}>
          <Plus className="w-3.5 h-3.5" /> Add row
        </button>
      </div>
    </div>
  );
}

/* ── DIAMOND: carat→sieve map + Excel-style rate matrix ──────────── */
const SHAPE_GROUPS = ["ROUND", "MARQUISE/BAGUETTE", "PEAR/PRINCESS"];

// The 20 grade columns from the master rate chart (label → shade + clarity).
const GRADE_COLUMNS: { label: string; shade: string; clarity: string }[] = [
  { label: "EF-VVS", shade: "EF", clarity: "VVS" },
  { label: "EF/VVS-VS", shade: "EF", clarity: "VVS-VS" },
  { label: "EF-VS", shade: "EF", clarity: "VS" },
  { label: "FG-VVS", shade: "FG", clarity: "VVS" },
  { label: "FG/VVS-VS", shade: "FG", clarity: "VVS-VS" },
  { label: "FG-VS", shade: "FG", clarity: "VS" },
  { label: "FG-SI", shade: "FG", clarity: "SI" },
  { label: "GH-VVS", shade: "GH", clarity: "VVS" },
  { label: "GH/VVS-VS", shade: "GH", clarity: "VVS-VS" },
  { label: "GH-VS", shade: "GH", clarity: "VS" },
  { label: "GH/VS/SI", shade: "GH", clarity: "VS-SI" },
  { label: "GH-SI", shade: "GH", clarity: "SI" },
  { label: "HI-VS/SI", shade: "HI", clarity: "VS-SI" },
  { label: "HI-VS", shade: "HI", clarity: "VS" },
  { label: "HI-SI", shade: "HI", clarity: "SI" },
  { label: "HI-I1", shade: "HI", clarity: "I1" },
  { label: "IJ-VS", shade: "IJ", clarity: "VS" },
  { label: "IJ-VS/SI", shade: "IJ", clarity: "VS-SI" },
  { label: "IJ-SI", shade: "IJ", clarity: "SI" },
  { label: "IJ-I1", shade: "IJ", clarity: "I1" },
];

const DEFAULT_SIEVES: Record<string, string[]> = {
  "ROUND": ["-2", "+2", "-3", "-11", "+11"],
  "MARQUISE/BAGUETTE": ["-7", "+7"],
  "PEAR/PRINCESS": ["-7", "+7"],
};

const cellKey = (sg: string, sv: string, sh: string, cl: string) => `${sg}|${sv}|${sh}|${cl}`;
/* A BLANK sieve label is the "any size" row: the rate used for diamonds entered
   without a sieve (solitaires, loose stones) and for sieves the chart doesn't
   price. It's a real row — it just has no label — so give it a visible name. */
const ANY_SIZE_LABEL = "Any size";
const sieveName = (sv: string) => (sv === "" ? `"${ANY_SIZE_LABEL}" row` : `sieve "${sv}"`);
// Sort sieves by magnitude, '-' before '+' (matches the chart order: -2,+2,-3,-11,+11).
const sieveSort = (a: string, b: string) => {
  const na = Math.abs(parseInt(a, 10)) || 0, nb = Math.abs(parseInt(b, 10)) || 0;
  if (na !== nb) return na - nb;
  return a.startsWith("-") ? -1 : 1;
};

/* ── Diamond-matrix XLSX helpers (one sheet per shape group) ─────────
   Excel sheet names can't contain / \ ? * [ ] : — so "MARQUISE/BAGUETTE"
   is written as "MARQUISE-BAGUETTE" and mapped back on import. */
const sheetNameForGroup = (sg: string) => sg.replace(/\//g, "-").slice(0, 31);
const groupForSheetName = (name: string) =>
  SHAPE_GROUPS.find((sg) => sheetNameForGroup(sg).toUpperCase() === String(name).trim().toUpperCase()) || null;

const xmlEsc = (s: any) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function colLetter(n: number) { let s = ""; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// Build a multi-sheet .xlsx from [{ name, rows: (string|number)[][] }].
async function buildXlsx(sheets: { name: string; rows: (string | number)[][] }[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const overrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  zip.file("[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`);
  zip.file("_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  const sheetTags = sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  zip.file("xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetTags}</sheets></workbook>`);
  const wbRels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  zip.file("xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>`);
  sheets.forEach((s, i) => {
    const rowsXml = s.rows.map((row, r) => {
      const cells = row.map((val, c) => {
        const ref = colLetter(c) + (r + 1);
        return typeof val === "number"
          ? `<c r="${ref}"><v>${val}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(val)}</t></is></c>`;
      }).join("");
      return `<row r="${r + 1}">${cells}</row>`;
    }).join("");
    zip.file(`xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`);
  });
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// Parse a .xlsx File into Map<sheetName, string[][]>.
async function readWorkbook(file: File): Promise<Map<string, string[][]>> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const read = async (n: string) => { const f = zip.file(n); return f ? await f.async("string") : ""; };
  const dec = (s: string) => String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const textRuns = (xml: string) => dec((xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((p) => p.replace(/<t[^>]*>([\s\S]*?)<\/t>/, "$1")).join(""));
  const colToIdx = (letters: string) => { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

  const shared: string[] = [];
  const ss = await read("xl/sharedStrings.xml");
  if (ss) for (const si of ss.match(/<si\b[^>]*?(?:\/>|>[\s\S]*?<\/si>)/g) || []) shared.push(textRuns(si));

  const wb = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  const ridToTarget: Record<string, string> = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) ridToTarget[m[1]] = m[2].replace(/^\/?xl\//, "");

  const parseSheet = (xml: string): string[][] => {
    const rows: string[][] = [];
    if (!xml) return rows;
    for (const rowXml of xml.match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || []) {
      const cells: string[] = [];
      let maxIdx = -1;
      for (const cXml of rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
        const refM = /\br="([A-Z]+)\d+"/.exec(cXml);
        const idx = refM ? colToIdx(refM[1]) : cells.length;
        const typeM = /\bt="([^"]+)"/.exec(cXml);
        const type = typeM ? typeM[1] : "n";
        let value = "";
        if (type === "inlineStr") {
          const isM = /<is>([\s\S]*?)<\/is>/.exec(cXml);
          if (isM) value = textRuns(isM[1]);
        } else {
          const vM = /<v>([\s\S]*?)<\/v>/.exec(cXml);
          const raw = vM ? vM[1] : "";
          value = type === "s" ? (shared[parseInt(raw, 10)] || "") : dec(raw);
        }
        cells[idx] = value;
        if (idx > maxIdx) maxIdx = idx;
      }
      for (let i = 0; i <= maxIdx; i++) if (cells[i] === undefined) cells[i] = "";
      rows.push(cells);
    }
    return rows;
  };

  const out = new Map<string, string[][]>();
  for (const m of wb.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = ridToTarget[m[2]];
    if (target) out.set(dec(m[1]).trim(), parseSheet(await read("xl/" + target)));
  }
  return out;
}

function DiamondTab({ retailers }: { retailers: any[] }) {
  // Country picks the base rate set (India ₹ / United States $); scope picks a
  // retailer of that country for per-retailer overrides ("" = the country base).
  const [country, setCountry] = useState("India");
  const [scope, setScope] = useState("");
  const cur = country === "India" ? "₹" : "$";
  const countryRetailers = useMemo(
    () => (retailers || []).filter((r) => (r.country || "India") === country),
    [retailers, country]
  );
  const [shape, setShape] = useState("ROUND");
  const [cells, setCells] = useState<Record<string, string>>({});      // full matrix across all shapes
  const [sievesByShape, setSievesByShape] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSieve, setNewSieve] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminPricing.diamondRates(scope, country),
      adminPricing.sieveMap(scope),
      // Sieve list is supplementary — never let its failure blank the matrix.
      adminPricing.diamondSieves().catch(() => []),
    ])
      .then(([d, s, ds]: any) => {
        const c: Record<string, string> = {};
        const bySh: Record<string, Set<string>> = {};
        for (const r of d) {
          c[cellKey(r.shape_group, r.sieve_size, r.shade, r.clarity)] = String(r.rate_per_carat);
          (bySh[r.shape_group] = bySh[r.shape_group] || new Set()).add(r.sieve_size);
        }
        for (const sm of s) (bySh[sm.shape_group] = bySh[sm.shape_group] || new Set()).add(sm.sieve_size);
        // Persisted sieve rows (survive even with no rates entered yet).
        for (const ks of (ds || [])) (bySh[ks.shape_group] = bySh[ks.shape_group] || new Set()).add(ks.sieve_size);
        const sbs: Record<string, string[]> = {};
        for (const sg of SHAPE_GROUPS) {
          const set = bySh[sg] || new Set<string>();
          (DEFAULT_SIEVES[sg] || []).forEach((x) => set.add(x));
          sbs[sg] = Array.from(set).sort(sieveSort);
        }
        setCells(c); setSievesByShape(sbs);
      }).catch(() => { }).finally(() => setLoading(false));
  }, [scope, country]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const rowSieves = sievesByShape[shape] || DEFAULT_SIEVES[shape] || [];
  const setCell = (sv: string, col: { shade: string; clarity: string }, v: string) =>
    setCells((p) => ({ ...p, [cellKey(shape, sv, col.shade, col.clarity)]: v }));

  const addSieve = async () => {
    const sv = newSieve.trim();
    // Any text (and blank — the "any size" row) is allowed; only block an exact duplicate.
    if ((sievesByShape[shape] || []).includes(sv)) { toast.error(`That ${sieveName(sv)} already exists for ${shape}`); return; }
    // Optimistic UI, then persist so the row survives a reload (even with no rates).
    setSievesByShape((p) => ({ ...p, [shape]: Array.from(new Set([...(p[shape] || []), sv])).sort(sieveSort) }));
    setNewSieve("");
    try {
      await adminPricing.addDiamondSieve(shape, sv);
      toast.success(`Added ${sieveName(sv)} to ${shape}`);
    } catch (e: any) {
      toast.error(e.message || "Could not save sieve");
      // Roll back the optimistic add on failure.
      setSievesByShape((p) => ({ ...p, [shape]: (p[shape] || []).filter((x) => x !== sv) }));
    }
  };

  const removeSieve = async (sv: string) => {
    if (!confirm(`Delete ${sieveName(sv)} from ${shape}? This also removes its rates.`)) return;
    const prev = sievesByShape[shape] || [];
    setSievesByShape((p) => ({ ...p, [shape]: (p[shape] || []).filter((x) => x !== sv) }));
    try {
      await adminPricing.removeDiamondSieve(shape, sv);
      toast.success(`Removed ${sieveName(sv)}`);
    } catch (e: any) {
      toast.error(e.message || "Could not remove sieve");
      setSievesByShape((p) => ({ ...p, [shape]: prev }));
    }
  };

  const saveRates = async () => {
    const rows = Object.entries(cells)
      .filter(([, v]) => v !== "" && v != null && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([k, v]) => { const [shape_group, sieve_size, shade, clarity] = k.split("|"); return { shape_group, sieve_size, shade, clarity, rate_per_carat: Number(v) }; });
    if (!rows.length) { toast.error("Enter at least one rate"); return; }
    setSaving(true);
    try { await adminPricing.saveDiamondRates(rows, scope, country); toast.success(`Saved ${rows.length} diamond rates`); load(); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  // ── Download the matrix as a 3-sheet .xlsx (one sheet per shape group),
  //    every cell pre-filled — doubles as the import template.
  const downloadSample = async () => {
    const sampleRate = (gi: number) => 6000 - gi * 250; // top grade highest, steps down
    const sheets = SHAPE_GROUPS.map((sg) => {
      const svs = sievesByShape[sg] || DEFAULT_SIEVES[sg] || [];
      const header: (string | number)[] = ["sieve", ...GRADE_COLUMNS.map((g) => g.label)];
      const rows: (string | number)[][] = [header];
      for (const sv of svs) {
        rows.push([sv, ...GRADE_COLUMNS.map((g, gi) => {
          const cur = cells[cellKey(sg, sv, g.shade, g.clarity)];
          return cur != null && cur !== "" ? Number(cur) : sampleRate(gi);
        })]);
      }
      return { name: sheetNameForGroup(sg), rows };
    });
    const blob = await buildXlsx(sheets);
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "diamond-rate-matrix.xlsx" });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Import a filled .xlsx (sheet name = shape group, col0 = sieve, grade columns)
  //    and save the rates.
  const importFile = async (file: File) => {
    try {
      const sheets = await readWorkbook(file);
      const rows: any[] = [];
      // Every sieve label found per shape — so new/blank/rate-less sieves still import as rows.
      const sievesFound = new Map<string, Set<string>>();
      for (const [name, grid] of sheets) {
        const shape_group = groupForSheetName(name);
        if (!shape_group || !grid || grid.length < 2) continue;
        const header = grid[0].map((h) => String(h).replace(/\s+/g, "").toUpperCase());
        const gradeIdx = GRADE_COLUMNS.map((g) => header.indexOf(g.label.replace(/\s+/g, "").toUpperCase()));
        for (let r = 1; r < grid.length; r++) {
          const sieve_size = String(grid[r][0] ?? "").trim();
          // Does this row carry any rate cell at all?
          const hasCell = GRADE_COLUMNS.some((_, gi) => {
            const ci = gradeIdx[gi];
            return ci !== -1 && String(grid[r][ci] ?? "").trim() !== "";
          });
          // Skip only a truly empty row (no sieve label AND no cells).
          if (sieve_size === "" && !hasCell) continue;
          if (!sievesFound.has(shape_group)) sievesFound.set(shape_group, new Set());
          sievesFound.get(shape_group)!.add(sieve_size);
          GRADE_COLUMNS.forEach((g, gi) => {
            const ci = gradeIdx[gi];
            if (ci === -1) return;
            const raw = String(grid[r][ci] ?? "").trim();
            if (raw === "") return;
            const rate = Number(raw);
            if (!isFinite(rate) || rate < 0) return;
            rows.push({ shape_group, sieve_size, shade: g.shade, clarity: g.clarity, rate_per_carat: rate });
          });
        }
      }
      const totalSieves = Array.from(sievesFound.values()).reduce((n, s) => n + s.size, 0);
      if (!rows.length && !totalSieves) { toast.error("Nothing to import — check the sheet names match the shape groups"); return; }
      setSaving(true);
      if (rows.length) await adminPricing.saveDiamondRates(rows, scope, country);
      // Register every sieve found (new, blank, or rate-less) so it appears as a row.
      const sieveCalls: Promise<any>[] = [];
      for (const [sg, set] of sievesFound) for (const sv of set) sieveCalls.push(adminPricing.addDiamondSieve(sg, sv));
      if (sieveCalls.length) await Promise.allSettled(sieveCalls);
      toast.success(`Imported ${rows.length} rates · ${totalSieves} sieve${totalSieves === 1 ? "" : "s"}`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Country (base rate set) + retailer-override scope */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Country:</span>
        <select value={country} onChange={(e) => { setCountry(e.target.value); setScope(""); }}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)" }}>
          {["India", "United States"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs font-medium ml-2" style={{ color: "var(--sf-text-muted)" }}>Editing:</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)", minWidth: 200 }}>
          <option value="">{country} base rate</option>
          {countryRetailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {scope && (
          <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
            Empty cells fall back to the {country} base.
          </span>
        )}
      </div>

      <Card title={`Diamond rate matrix (${cur} / carat)`} sub="Rows = sieve size · columns = shade-clarity grade. Type rates straight into the cells."
        action={
          <div className="flex items-center gap-2">
            <button onClick={downloadSample}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
              style={{ border: "1px solid var(--sf-divider)", color: "var(--sf-text-secondary)", backgroundColor: "var(--sf-bg-surface-2)" }}>
              <Download className="w-3.5 h-3.5" /> Sample
            </button>
            <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium cursor-pointer"
              style={{ border: "1px solid var(--sf-divider)", color: "var(--sf-text-secondary)", backgroundColor: "var(--sf-bg-surface-2)" }}>
              <input type="file" accept=".xlsx" hidden disabled={saving}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Import
            </label>
            <SaveBtn onClick={saveRates} saving={saving} />
          </div>
        }>
        {loading ? <SkeletonRows cols={8} n={5} /> : (
          <div className="p-4 space-y-3">
            {/* Shape group selector */}
            <div className="flex items-center gap-2">
              {SHAPE_GROUPS.map((sg) => (
                <button key={sg} onClick={() => setShape(sg)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: shape === sg ? "#a855f7" : "var(--sf-bg-surface-2)",
                    color: shape === sg ? "#fff" : "var(--sf-text-secondary)",
                    border: "none", cursor: "pointer",
                  }}>{sg}</button>
              ))}
            </div>

            {/* The grid */}
            <div className="sf-teal-scroll overflow-x-auto rounded-xl border" style={{ borderColor: "var(--sf-divider)" }}>
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 px-2 py-2 text-left font-semibold"
                      style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)", minWidth: 64 }}>
                      Sieve
                    </th>
                    {GRADE_COLUMNS.map((c) => (
                      <th key={c.label} className="px-1.5 py-2 font-semibold whitespace-nowrap text-center"
                        style={{ color: "var(--sf-text-muted)", minWidth: 70 }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowSieves.map((sv) => (
                    <tr key={sv} style={{ borderTop: "1px solid var(--sf-divider)" }}>
                      <td className="sticky left-0 z-10 px-2 py-1 font-medium"
                        style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>
                        <div className="flex items-center gap-1.5 group/sieve">
                          {/* The blank row prices diamonds that carry no sieve — name it so
                              it doesn't read as an empty/broken row. */}
                          <span
                            title={sv === "" ? "Used when a diamond has no sieve size (solitaires, loose stones)" : undefined}
                            style={sv === "" ? { fontStyle: "italic", color: "var(--sf-text-muted)", whiteSpace: "nowrap" } : undefined}>
                            {sv === "" ? ANY_SIZE_LABEL : sv}
                          </span>
                          <button onClick={() => removeSieve(sv)} title="Delete sieve row"
                            className="opacity-0 group-hover/sieve:opacity-100 transition-opacity"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", lineHeight: 0 }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      {GRADE_COLUMNS.map((col) => (
                        <td key={col.label} className="p-0.5">
                          <input type="number"
                            value={cells[cellKey(shape, sv, col.shade, col.clarity)] ?? ""}
                            onChange={(e) => setCell(sv, col, e.target.value)}
                            className="w-16 h-8 px-1 text-center rounded-md border outline-none"
                            style={{ backgroundColor: "var(--sf-bg-surface-1)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add a sieve row */}
            <div className="flex items-center gap-2">
              <input value={newSieve} onChange={(e) => setNewSieve(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSieve(); } }}
                placeholder={`add sieve row (blank = ${ANY_SIZE_LABEL})`}
                className="w-44 h-8 px-2 rounded-md text-xs border outline-none"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }} />
              <button onClick={addSieve}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ color: "var(--sf-teal)", backgroundColor: "var(--sf-bg-surface-2)", border: "none", cursor: "pointer" }}>
                <Plus className="w-3.5 h-3.5" /> Add sieve row
              </button>
              <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                Empty cells are skipped. Leave the box empty to add the “{ANY_SIZE_LABEL}” row —
                its rates price diamonds entered without a sieve. Editing {shape}.
              </span>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

/* ── STONES ──────────────────────────────────────────── */
const STONE_CATS = ["Precious Stones", "Semi Precious Stones", "Synthetic Stones", "Pearl", "Kundan", "Beads"];
function StonesTab() {
  // Stone rates are per country (India ₹ / United States $) — entered separately.
  const [country, setCountry] = useState("India");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.stoneRates(country).then((d: any) => setRows(d)).catch(() => { }).finally(() => setLoading(false));
  }, [country]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      await adminPricing.saveStoneRates(rows.filter((r) => r.category && r.stone_name)
        .map((r) => ({ ...r, rate: Number(r.rate) || 0, unit: r.unit || "carat" })), country);
      toast.success(`${country} stone rates saved`); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const cur = country === "India" ? "₹" : "$";
  return (
    <Card title="Stone rates" sub={`Per country (${cur}). Unit picks the rate: carat → Rate(/ct) × carat · piece → Rate(/pc) × pcs`}
      action={
        <div className="flex items-center gap-2">
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="h-8 text-xs rounded-lg px-2"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)" }}>
            {["India", "United States"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <SaveBtn onClick={save} saving={saving} />
        </div>
      }>
      {loading ? <SkeletonRows cols={6} n={6} /> : (
        <EditableTable rows={rows} setRows={setRows}
          addTemplate={{ category: "Precious Stones", stone_name: "", rate: "", rate_pc: "", unit: "carat" }}
          cols={[
            { key: "category", label: "Category", options: STONE_CATS, width: 170 },
            { key: "stone_name", label: "Stone name", width: 150 },
            // Both rates are stored independently; Unit selects which one prices.
            { key: "rate", label: "Rate (/ct)", type: "number", width: 110 },
            { key: "rate_pc", label: "Rate (/pc)", type: "number", width: 110 },
            { key: "unit", label: "Unit", options: ["carat", "piece"], width: 100 },
          ]} />
      )}
    </Card>
  );
}

/* ── MAKING ──────────────────────────────────────────── */
function MakingTab({ retailers }: { retailers: any[] }) {
  // Country picks the base making set; scope picks a retailer of that country
  // for per-retailer overrides ("" = the country base).
  const [country, setCountry] = useState("India");
  const [scope, setScope] = useState("");
  const countryRetailers = useMemo(
    () => (retailers || []).filter((r) => (r.country || "India") === country),
    [retailers, country]
  );
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fixed making rows for every gold type (+ a 'default' fallback) — for everyone.
  const MAKING_SCOPES = ["default", "14KT", "18KT", "22KT", "24KT"];

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.makingCharges(scope, country).then((d: any) => {
      const data = d || [];
      const byScope = new Map(data.map((r: any) => [r.scope, r]));
      // Always-present rows for everyone, pre-filled from saved values.
      const seeded = MAKING_SCOPES.map((s) => {
        const ex: any = byScope.get(s);
        return { scope: s, mode: ex?.mode || "gross", value: ex && ex.value != null ? ex.value : "" };
      });
      // Any extra custom scopes the admin already added (e.g. a category).
      const extra = data
        .filter((r: any) => !MAKING_SCOPES.includes(r.scope))
        .map((r: any) => ({ scope: r.scope, mode: r.mode || "gross", value: r.value != null ? r.value : "" }));
      setRows([...seeded, ...extra]);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [scope, country]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      // Only persist rows that actually have a value (blanks inherit Global / default).
      await adminPricing.saveMakingCharges(
        rows.filter((r) => r.scope && r.mode && r.value !== "" && r.value != null)
          .map((r) => ({ scope: r.scope, mode: r.mode, value: Number(r.value) || 0 })), scope, country);
      toast.success("Making charges saved"); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const cur = country === "India" ? "₹" : "$";
  return (
    <>
      {/* Country (base) + retailer-override scope */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Country:</span>
        <select value={country} onChange={(e) => { setCountry(e.target.value); setScope(""); }}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)" }}>
          {["India", "United States"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs font-medium ml-2" style={{ color: "var(--sf-text-muted)" }}>Editing:</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)", minWidth: 200 }}>
          <option value="">{country} base rate</option>
          {countryRetailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {scope && (
          <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
            Empty cells fall back to the {country} base.
          </span>
        )}
      </div>

      <Card title="Making / labour charges" sub={`Making = value (${cur}/g) × product's gross/net weight (g)`}
        action={<SaveBtn onClick={save} saving={saving} />}>
        {loading ? <SkeletonRows cols={3} n={5} /> : (
          <EditableTable rows={rows} setRows={setRows}
            addTemplate={{ scope: "", mode: "gross", value: "" }}
            cols={[
              { key: "scope", label: "Scope", placeholder: "14KT / Ring", width: 200 },
              { key: "mode", label: "Weight", options: ["gross", "net"] },
              { key: "value", label: `Value (${cur}/g)`, type: "number", width: 140 },
            ]} />
        )}
      </Card>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   DUTY — import/customs %, charged on the product's TOTAL value
   ═══════════════════════════════════════════════════════ */
function DutyTab({ retailers }: { retailers: any[] }) {
  // Country picks the base duty; scope picks a retailer of that country whose
  // rate differs from it ("" = the country base).
  const [country, setCountry] = useState("India");
  const [scope, setScope] = useState("");
  const countryRetailers = useMemo(
    () => (retailers || []).filter((r) => (r.country || "India") === country),
    [retailers, country]
  );
  const [percent, setPercent] = useState<string>("");
  const [basePercent, setBasePercent] = useState(0);
  const [inherited, setInherited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Has the admin typed in the box since it was loaded? An untouched inherited
  // value is only being SHOWN — saving it would pin a copy that stops tracking
  // the country rate, so save is a no-op until they actually change it.
  const [touched, setTouched] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.dutyCharge(scope, country).then((d: any) => {
      const base = Number(d?.base_percent) || 0;
      // A retailer with no override still has an effective rate — the country's.
      // Show that number rather than an empty box, so the duty in force is visible.
      setPercent(d?.percent == null ? String(base) : String(d.percent));
      setBasePercent(base);
      setInherited(!!d?.inherited);
      setTouched(false);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [scope, country]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    const v = percent.trim();
    // Showing the inherited rate must not silently turn it into an override.
    if (scope && inherited && !touched) {
      toast.info(`Still inheriting ${country}'s ${basePercent}% — change the value to give this retailer its own rate.`);
      return;
    }
    if (!scope && v === "") { toast.error("Enter a duty % (use 0 for none)"); return; }
    if (v !== "" && (!isFinite(Number(v)) || Number(v) < 0)) { toast.error("Duty % must be a number ≥ 0"); return; }
    setSaving(true);
    try {
      await adminPricing.saveDutyCharge(v, scope, country);
      toast.success(v === "" ? `Cleared — inherits ${country}'s ${basePercent}%` : `Duty saved: ${Number(v)}%`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const cur = country === "India" ? "₹" : "$";
  // Live worked example, in the money the selected country actually uses.
  const eg = 207;
  const pct = Number(percent === "" ? basePercent : percent) || 0;
  const money = (n: number) => cur + n.toLocaleString(country === "India" ? "en-IN" : "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* Country (base) + retailer-override scope */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Country:</span>
        <select value={country} onChange={(e) => { setCountry(e.target.value); setScope(""); }}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)" }}>
          {["India", "United States"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs font-medium ml-2" style={{ color: "var(--sf-text-muted)" }}>Editing:</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}
          className="h-9 text-sm rounded-lg px-2"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", border: "1px solid var(--sf-divider)", color: "var(--sf-text-primary)", minWidth: 200 }}>
          <option value="">{country} base duty</option>
          {countryRetailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {scope && (
          <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
            Leave blank to inherit {country}'s {basePercent}%.
          </span>
        )}
      </div>

      <Card title="Import / customs duty"
        sub="Duty = % × the product's total value (metal + diamond + stone + making)"
        action={<SaveBtn onClick={save} saving={saving} />}>
        {loading ? <SkeletonRows cols={2} n={2} /> : (
          <div className="p-4 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>
                  Duty %{scope && !(inherited && !touched) ? " (blank = inherit)" : ""}
                </label>
                <div className="relative mt-1">
                  <input type="number" min="0" step="0.001" value={percent}
                    onChange={(e) => { setPercent(e.target.value); setTouched(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
                    placeholder={scope ? String(basePercent) : "0"}
                    className="w-40 h-9 pl-3 pr-7 rounded-md text-sm border outline-none"
                    style={{
                      backgroundColor: "var(--sf-bg-surface-2)",
                      // Inherited-and-untouched reads as muted/italic: the number is
                      // the rate in force, but it is not this retailer's own value.
                      color: scope && inherited && !touched ? "var(--sf-text-muted)" : "var(--sf-text-primary)",
                      fontStyle: scope && inherited && !touched ? "italic" : "normal",
                      borderColor: "var(--sf-divider)",
                    }} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--sf-text-muted)" }}>%</span>
                </div>
              </div>
              {scope && inherited && !touched && (
                <span className="text-[11px] pb-2.5" style={{ color: "var(--sf-text-muted)" }}>
                  Inherited from the {country} base — type a different % to give{" "}
                  {countryRetailers.find((r) => r.id === scope)?.name || "this retailer"} its own rate.
                </span>
              )}
              {scope && !inherited && (
                <span className="text-[11px] pb-2.5" style={{ color: "var(--sf-text-muted)" }}>
                  Own rate (the {country} base is {basePercent}%). Clear the box and save to go back to inheriting.
                </span>
              )}
            </div>

            {/* Worked example — the same sum the pricing engine does. */}
            <div className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--sf-divider)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                Example
              </div>
              {[
                ["Product total value", money(eg)],
                [`Duty @ ${pct}%${scope && inherited && !touched ? ` (inherited)` : ""}`, money(eg * pct / 100)],
                ["Price with duty", money(eg + eg * pct / 100)],
              ].map(([k, v], i) => (
                <div key={k} className="flex items-center justify-between px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{k}</span>
                  <span className="text-[11px] font-semibold"
                    style={{ color: i === 2 ? "var(--sf-teal)" : "var(--sf-text-primary)" }}>{v}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
              0% means no duty is added. Duty applies to the computed price only — a
              fixed per-product price set for a retailer already includes everything.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   RETAILERS — factors + overrides
   ═══════════════════════════════════════════════════════ */
function RetailersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState<any | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.retailers().then((d: any) => setRows(d)).catch(() => { }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (id: string, key: string, v: any) => setRows((p) => p.map((r) => r.id === id ? { ...r, [key]: v } : r));
  const blank = (v: any) => v === "" || v == null ? null : Number(v);

  const saveRow = async (r: any) => {
    setSavingId(r.id);
    try {
      await adminPricing.saveFactors(r.id, {
        price_factor: Number(r.price_factor) || 1,
        flat_markup: Number(r.flat_markup) || 0,
        diamond_factor: blank(r.diamond_factor),
        gold_factor: blank(r.gold_factor),
        stone_factor: blank(r.stone_factor),
        making_factor: blank(r.making_factor),
      });
      toast.success(`${r.name} pricing saved`);
    } catch (e: any) { toast.error(e.message); } finally { setSavingId(null); }
  };

  return (
    <Card title="Retailer pricing" sub="price_factor multiplies every product · component factors are optional fine-tuning">
      {loading ? <SkeletonRows cols={6} n={6} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                {["Retailer", "Price ×", "Flat ₹", "Gold ×", "Diamond ×", "Stone ×", "Making ×", "Overrides", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold px-3 py-2 whitespace-nowrap" style={{ color: "var(--sf-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                  <td className="px-3 py-2 min-w-[160px]">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{r.name}</p>
                    {r.company_name && <p className="text-[10px] truncate" style={{ color: "var(--sf-text-muted)" }}>{r.company_name}</p>}
                  </td>
                  {["price_factor", "flat_markup", "gold_factor", "diamond_factor", "stone_factor", "making_factor"].map((k) => (
                    <td key={k} className="px-2 py-1.5" style={{ width: 84 }}>
                      <Cell type="number" value={r[k]} placeholder={k.includes("factor") && k !== "price_factor" ? "—" : ""}
                        onChange={(v: any) => set(r.id, k, v)} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => setOverrideFor(r)} className="text-xs font-medium px-2 py-1 rounded-md"
                      style={{ color: "var(--sf-teal)", backgroundColor: "var(--sf-bg-surface-2)", border: "none", cursor: "pointer" }}>
                      {Number(r.override_count) > 0 ? `${r.override_count} set` : "Manage"}
                    </button>
                  </td>
                  <td className="px-2">
                    <SaveBtn onClick={() => saveRow(r)} saving={savingId === r.id} label="" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {overrideFor && <OverrideDrawer retailer={overrideFor} onClose={() => { setOverrideFor(null); load(); }} />}
    </Card>
  );
}

function OverrideDrawer({ retailer, onClose }: { retailer: any; onClose: () => void }) {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pid, setPid] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminPricing.overrides(retailer.id).then((d: any) => setOverrides(d)).catch(() => { });
  }, [retailer.id]);
  useEffect(() => { load(); }, [load]);
  // Whole catalogue, slim — a limit of 200 left every product past the 200th
  // unselectable here, so those SKUs could never be given an override.
  useEffect(() => {
    adminProducts.list({ limit: "5000", slim: "true", sort: "sku", order: "asc" })
      .then((d: any) => setProducts(d.products || [])).catch(() => { });
  }, []);

  const add = async () => {
    if (!pid || price === "") return;
    setBusy(true);
    try { await adminPricing.saveOverride(retailer.id, pid, Number(price)); setPid(""); setPrice(""); load(); toast.success("Override saved"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const del = async (productId: string) => {
    try { await adminPricing.deleteOverride(retailer.id, productId); load(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: "var(--sf-backdrop)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ x: 420 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md h-full overflow-y-auto" style={{ backgroundColor: "var(--sf-bg-surface-1)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
          style={{ borderColor: "var(--sf-divider)", backgroundColor: "var(--sf-bg-surface-1)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Price overrides</p>
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>{retailer.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--sf-text-muted)", background: "none", border: "none", cursor: "pointer" }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--sf-divider)" }}>
            <SkuCombo products={products} total={products.length} value={pid} onChange={setPid} />
            <div className="flex gap-2">
              <input type="number" placeholder="Fixed price ₹" value={price} onChange={(e) => setPrice(e.target.value)}
                className="flex-1 h-9 px-2 rounded-md text-sm border outline-none"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }} />
              <Button onClick={add} disabled={busy || !pid || price === ""} size="sm" className="h-9 gap-1 text-xs" style={{ backgroundColor: "var(--sf-teal)", color: "#fff" }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
              </Button>
            </div>
          </div>

          {overrides.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "var(--sf-text-muted)" }}>No overrides — this retailer uses computed prices.</p>
          ) : overrides.map((o) => (
            <div key={o.product_id} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ borderColor: "var(--sf-divider)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{o.name}</p>
                <p className="text-[10px]" style={{ color: "var(--sf-text-muted)" }}>{o.sku}</p>
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--sf-teal)" }}>{fmt(o.price)}</span>
              <button onClick={() => del(o.product_id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SKU COMBO — searchable product dropdown
   ----------------------------------------------------------------
   A native <select> is unusable at 364 SKUs (no typing, no matching
   on category/metal), so this is a type-ahead: search and list are
   the same control. Filtering and sorting live here, over the FULL
   catalogue the caller loaded.
   ═══════════════════════════════════════════════════════ */
function SkuCombo({ products, total, loading, value, onChange }: {
  products: any[]; total: number; loading?: boolean; value: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [sortKey, setSortKey] = useState<"sku" | "name" | "category" | "created_at">("sku");
  const [asc, setAsc] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => products.find((p) => p.id === value) || null, [products, value]);

  const filtered = useMemo(() => {
    // Multi-term, any order, across every identifying field — so "18kt gents"
    // or "ring 0123" both work.
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = terms.length
      ? products.filter((p) => {
        const hay = `${p.sku ?? ""} ${p.name ?? ""} ${p.category ?? ""} ${p.type_category ?? ""} ${p.sub_category ?? ""} ${p.mfg_code ?? ""} ${p.metal_type ?? ""}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      : products.slice();
    const cmp = (a: any, b: any) => {
      if (sortKey === "created_at") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      // Numeric-aware so SKU 9 sorts before 10. Ties — every row, when names
      // are blank — fall back to SKU so the order stays stable.
      const col = (x: any) => String(x[sortKey] ?? "").trim();
      const c = col(a).localeCompare(col(b), undefined, { numeric: true, sensitivity: "base" });
      return c !== 0 ? c : String(a.sku ?? "").localeCompare(String(b.sku ?? ""), undefined, { numeric: true, sensitivity: "base" });
    };
    hit.sort((a, b) => (asc ? cmp(a, b) : -cmp(a, b)));
    return hit;
  }, [products, q, sortKey, asc]);

  // Close on an outside click, reverting whatever was half-typed.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    (listRef.current.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (p: any) => { onChange(p.id); setQ(""); setOpen(false); inputRef.current?.blur(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((i) => Math.min(Math.max(i + (e.key === "ArrowDown" ? 1 : -1), 0), filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[active]) pick(filtered[active]);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false); setQ("");
    }
  };

  const shown = open ? q : (selected ? skuLabel(selected) : "");
  const countText = loading ? "loading…"
    : q.trim() ? `${filtered.length} of ${total} SKUs`
      : `${total} SKU${total === 1 ? "" : "s"}`;

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Product SKU</label>
        <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{countText}</span>
      </div>

      <div className="relative mt-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--sf-text-muted)" }} />
        <input
          ref={inputRef}
          value={shown}
          onChange={(e) => { setQ(e.target.value); setActive(0); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder={loading ? "Loading products…"
            : open && selected ? skuLabel(selected)
              : "Search SKU, category, metal…"}
          className="w-full h-9 pl-8 pr-14 rounded-md text-sm border outline-none"
          style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: open ? "var(--sf-teal)" : "var(--sf-divider)" }} />
        {(value || q) && (
          <button onMouseDown={(e) => { e.preventDefault(); onChange(""); setQ(""); setActive(0); }}
            title="Clear" className="absolute right-7 top-1/2 -translate-y-1/2"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sf-text-muted)", lineHeight: 0 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); inputRef.current?.focus(); }}
          title="Browse all SKUs" className="absolute right-2 top-1/2 -translate-y-1/2"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sf-text-muted)", lineHeight: 0 }}>
          <ChevronDown className="w-4 h-4" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
      </div>

      {/* Sort field + direction */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>Sort</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}
          className="h-7 px-1.5 rounded-md text-[11px] border outline-none"
          style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }}>
          <option value="sku">SKU</option>
          <option value="name">Name</option>
          <option value="category">Category</option>
          <option value="created_at">Date added</option>
        </select>
        <button onClick={() => setAsc((v) => !v)}
          title={asc ? "Ascending — click for descending" : "Descending — click for ascending"}
          className="h-7 px-2 rounded-md text-[11px] font-medium"
          style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-secondary)", border: "1px solid var(--sf-divider)", cursor: "pointer" }}>
          {asc ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>

      {open && (
        <div ref={listRef}
          className="absolute z-30 left-0 right-0 mt-1 rounded-lg border overflow-y-auto sf-teal-scroll"
          style={{ top: "100%", maxHeight: 280, backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)", boxShadow: "0 12px 32px rgba(0,0,0,.45)" }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs" style={{ color: "var(--sf-text-muted)" }}>
              {loading ? "Loading…" : `No SKU matches “${q.trim()}”`}
            </div>
          ) : filtered.map((p, i) => (
            <div key={p.id}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className="px-3 py-1.5 cursor-pointer"
              style={{
                backgroundColor: i === active ? "var(--sf-bg-surface-2)" : "transparent",
                borderLeft: p.id === value ? "2px solid var(--sf-teal)" : "2px solid transparent",
              }}>
              <span className="text-[12px] font-medium" style={{ color: "var(--sf-text-primary)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{p.sku}</span>
              <span className="text-[11px] ml-2" style={{ color: "var(--sf-text-muted)" }}>
                {String(p.name ?? "").trim()
                  || [p.category, p.type_category, p.sub_category, p.metal_type].map((x: any) => String(x ?? "").trim()).filter(Boolean).join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRICE PREVIEW
   ═══════════════════════════════════════════════════════ */
function PreviewTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [pid, setPid] = useState("");
  const [rid, setRid] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    // `slim` drops the per-row diamond/image/count sub-queries (the dropdown
    // needs sku + name only), so the FULL catalogue loads in one cheap call.
    // The old limit of 200 silently hid every product past the 200th — they
    // were missing from the list AND unsearchable, since search filters what
    // was fetched.
    setLoadingList(true);
    adminProducts.list({ limit: "5000", slim: "true", sort: "sku", order: "asc" })
      .then((d: any) => { setProducts(d.products || []); setTotal(Number(d.total) || (d.products || []).length); })
      .catch(() => { })
      .finally(() => setLoadingList(false));
    adminPricing.retailers().then((d: any) => setRetailers(d)).catch(() => { });
  }, []);


  useEffect(() => {
    // Require BOTH a product SKU and a retailer before showing pricing.
    if (!pid || !rid) { setResult(null); return; }
    setLoading(true);
    adminPricing.preview(pid, rid).then((d: any) => setResult(d)).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false));
  }, [pid, rid]);

  // Show prices in the selected retailer's country currency (₹ India / $ US).
  // This local `fmt` shadows the module one, so every price below switches.
  const previewCountry = (retailers.find((r) => r.id === rid)?.country) || "India";
  const isIN = previewCountry === "India";
  const fmt = (n: any) => (isIN ? "₹" : "$") + (Number(n) || 0).toLocaleString(isIN ? "en-IN" : "en-US");

  const d = result?.breakdown?.detail;
  const makingInfo = (m: any) =>
    m.mode === "percent" ? `${m.value}% of metal`
      : (m.mode === "gross" || m.mode === "net") ? `${fmt(m.value)}/g × ${Number(result?.product?.net_weight) || 0} g (net wt)`
        : `flat ${fmt(m.value)}`;
  const diaL: any[] = d?.diamond?.lines || [];
  const stnL: any[] = d?.stone?.lines || [];
  const stoneInfo = (l: any) => l.unit === "carat"
    ? `${l.name} · ${fmt(l.rate)} × ${l.carat || 1}ct`
    : `${l.name} · ${fmt(l.rate)} × ${l.pcs || 1}pcs`;
  // Grade/sieve can be missing (ungraded diamond) — never render "null".
  const diaGrade = (sh: any, cl: any) => (sh && cl) ? `${sh}-${cl}` : (sh || cl || "ungraded");
  // "any" = priced off the chart's blank / "Any size" sieve row.
  const diaSieve = (sv: any) => sv === "any" ? "any size · " : (sv && sv !== "~") ? `${sv} · ` : "";
  // One row per diamond / stone when there are several, else a single summary row.
  const diamondLineRows = !d ? [] : diaL.length > 1
    ? diaL.map((l, i) => ({ label: `Diamond #${i + 1}`, cost: l.cost, info: l.matched ? `${diaSieve(l.sieve)}${diaGrade(l.shade, l.clarity)} · ${fmt(l.rate_per_carat)} × ${l.carat || 1}ct` : "no rate matched" }))
    : [{ label: "Diamond", cost: d.diamond.cost, info: d.diamond.matched ? `${d.diamond.shape_group} · ${diaSieve(d.diamond.sieve)}${diaGrade(d.diamond.shade, d.diamond.clarity)} · ${fmt(d.diamond.rate_per_carat)} × ${d.diamond.carat || 1}ct` : "no rate matched" }];
  const stoneLineRows = !d ? [] : stnL.length > 1
    ? stnL.map((l, i) => ({ label: `Stone #${i + 1}`, cost: l.cost, info: l.matched ? stoneInfo(l) : "no rate matched" }))
    : [{ label: "Stone", cost: d.stone.cost, info: d.stone.matched ? stoneInfo(d.stone) : "no stone / no rate" }];
  const lines = d ? [
    { label: "Metal", cost: d.gold.cost, info: `${d.gold.gold_type || "—"} · ${fmt(d.gold.rate_per_gram)}/g × ${d.gold.weight || 0}g` },
    ...diamondLineRows,
    ...stoneLineRows,
    { label: "Making", cost: d.making.cost, info: makingInfo(d.making) },
    ...(d.duty && d.duty.percent > 0
      ? [{ label: "Duty", cost: d.duty.cost, info: `${d.duty.percent}% of ${fmt(d.duty.base)} (total value)` }]
      : []),
  ] : [];

  // Dynamic per-section total (metal + diamond + stone + making). With no retailer
  // this IS the price — never the static stored base_price. A retailer applies its
  // own factors / overrides, so trust the server's computed price in that case.
  const dynamicTotal = d ? d.gold.cost + d.diamond.cost + d.stone.cost + d.making.cost + (d.duty?.cost || 0) : 0;
  const shownPrice = rid ? result?.price : dynamicTotal;
  const shownSource = rid ? result?.source : "dynamic";

  // Product details (from DB) and selected retailer's pricing values (master table).
  const p = result?.product;
  const ri = result?.retailer_info;
  const dash = (v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "object") {
      try { const s = JSON.stringify(v); return s === "{}" || s === "[]" ? "—" : s; } catch { return "—"; }
    }
    return v;
  };
  // Curated, pricing-relevant product fields only — diamonds & stones have their
  // own tables below, and legacy/bridged columns are intentionally hidden.
  const wt = (v: any) => (v != null && v !== "" ? `${Number(v)} g` : "—");
  const productRows: [string, any][] = p ? [
    ["SKU", dash(p.sku)],
    ["Name", dash(p.name)],
    ["Category", dash(p.category)],
    ["Mfg code", dash(p.mfg_code)],
    ["Metal", dash(p.metal_type)],
    ["Gold colour", dash(p.gold_colour)],
    ["Net weight", wt(p.net_weight)],
    ["Gross weight", wt(p.gross_weight)],
    ["Availability", dash(p.availability)],
  ] : [];
  const diamonds: any[] = p?.diamonds || [];
  const stones: any[] = p?.stones || [];
  const retailerRows = ri ? [
    ["Retailer", ri.name], ["Company", dash(ri.company_name)],
  ] as [string, any][] : [];

  // ── Step-by-step calculation (every operand spelled out) ──────────
  // Price comes straight from the rate chart (master + retailer scope). There is
  // no factor/markup multiplier layer.
  const isOverride = result?.source === "override";
  // Diamond steps: one row per diamond when the product has several, else a single line.
  const diaLines: any[] = d?.diamond?.lines || [];
  const diamondSteps = !d ? [] : diaLines.length > 1
    ? diaLines.map((l, i) => ({
      k: `Diamond #${i + 1}`,
      eq: l.matched ? `${diaSieve(l.sieve)}${diaGrade(l.shade, l.clarity)} · ${fmt(l.rate_per_carat)} × ${l.carat || 1} ct` : "no rate matched",
      res: l.cost,
    }))
    : [{ k: "Diamond", eq: d.diamond.matched ? `${fmt(d.diamond.rate_per_carat)} × ${d.diamond.carat || 1} ct` : "no rate matched", res: d.diamond.cost }];
  // Per-carat: rate × carat. Per-piece: rate × pcs. (Only the unit's quantity.)
  const stoneEq = (l: any) => l.unit === "carat"
    ? `${fmt(l.rate)} × ${l.carat || 1} ct`
    : `${fmt(l.rate)} × ${l.pcs || 1} pcs`;
  const stnLines: any[] = d?.stone?.lines || [];
  const stoneSteps = !d ? [] : stnLines.length > 1
    ? stnLines.map((l, i) => ({
      k: `Stone #${i + 1}`,
      eq: l.matched ? `${l.name} · ${stoneEq(l)}` : "no rate matched",
      res: l.cost,
    }))
    : [{ k: "Stone", eq: d.stone.matched ? stoneEq(d.stone) : "no rate matched", res: d.stone.cost }];
  const calcSteps = d && !isOverride ? [
    { k: "Gold", eq: `${fmt(d.gold.rate_per_gram)}/g × ${d.gold.weight || 0} g`, res: d.gold.cost },
    ...diamondSteps,
    ...stoneSteps,
    {
      k: "Making", eq:
        d.making.mode === "percent" ? `${d.making.value}% × ${fmt(d.gold.cost)} (metal)`
          : (d.making.mode === "gross" || d.making.mode === "net") ? `${fmt(d.making.value)}/g × ${p?.net_weight || 0} g (net)`
            : `flat`, res: d.making.cost
    },
    ...(d.duty && d.duty.percent > 0
      ? [{ k: "Duty", eq: `${d.duty.percent}% × ${fmt(d.duty.base)} (total value)`, res: d.duty.cost }]
      : []),
  ] : [];
  const subtotalEq = d
    ? `${fmt(d.gold.cost)} + ${fmt(d.diamond.cost)} + ${fmt(d.stone.cost)} + ${fmt(d.making.cost)}`
      + (d.duty && d.duty.percent > 0 ? ` + ${fmt(d.duty.cost)} duty` : "")
    : "";

  return (
    <Card title="SKU Price" sub="Pick a product SKU and retailer to see the full price breakdown" noClip>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <SkuCombo products={products} total={total} loading={loadingList} value={pid} onChange={setPid} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Retailer</label>
            <select value={rid} onChange={(e) => setRid(e.target.value)}
              className="w-full h-9 px-2 mt-1 rounded-md text-sm border outline-none"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }}>
              <option value="">Select a retailer…</option>
              {retailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--sf-teal)" }} /></div>
        ) : result ? (
          <>
            {ri && result.source === "override" && (
              <div className="rounded-xl px-4 py-2.5 text-xs" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                This retailer has a fixed price override for this SKU — the section breakdown below is the base computation and is not used for the final price.
              </div>
            )}

            {/* ── Price hero ─────────────────────────────── */}
            <div className="rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg, var(--sf-teal-glass), var(--sf-bg-surface-2))", border: "1px solid var(--sf-teal-border)" }}>
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--sf-text-muted)" }}>Final price</p>
                  <p className="text-3xl font-bold leading-tight mt-1" style={{ color: "var(--sf-teal)" }}>{fmt(shownPrice)}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[12px] font-medium truncate" style={{ color: "var(--sf-text-primary)" }}>{p?.sku || "—"}{p?.name ? ` · ${p.name}` : ""}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: "rgba(48,184,191,0.15)", color: "var(--sf-teal)" }}>{shownSource}</span>
                  </div>
                </div>
                {ri && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--sf-text-muted)" }}>Retailer</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--sf-text-primary)" }}>{ri.name}</p>
                    {ri.company_name && <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{ri.company_name}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* ── Cost breakdown ─────────────────────────── */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
              <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                Cost breakdown
              </div>
              {lines.map((ln) => {
                const dot = ln.label.startsWith("Diamond") ? "#5DADE2" : ln.label.startsWith("Stone") ? "#A569BD" : ln.label.startsWith("Making") ? "#3b82f6" : ln.label.startsWith("Duty") ? "#14b8a6" : "#f59e0b";
                return (
                  <div key={ln.label} className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-tight" style={{ color: "var(--sf-text-primary)" }}>{ln.label}</p>
                        <p className="text-[11px] truncate leading-tight mt-0.5" style={{ color: "var(--sf-text-muted)" }}>{ln.info}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap" style={{ color: ln.cost > 0 ? "var(--sf-text-primary)" : "var(--sf-text-muted)" }}>{fmt(ln.cost)}</span>
                  </div>
                );
              })}
            </div>

            {!isOverride && d && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                  Step-by-step calculation
                </div>
                {calcSteps.map((s) => (
                  <div key={s.k} className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                    <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{s.k}</span>
                    <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>{s.eq} = <b style={{ color: "var(--sf-text-primary)" }}>{fmt(s.res)}</b></span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--sf-text-primary)" }}>Total</span>
                  <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>{subtotalEq} = <b style={{ color: "var(--sf-teal)" }}>{fmt(dynamicTotal)}</b></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ri && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                  <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                    Retailer
                  </div>
                  {retailerRows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                      <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{k}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {p && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                  <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                    Product details
                  </div>
                  {productRows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                      <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{k}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--sf-text-primary)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {diamonds.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                  Diamonds ({diamonds.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]" style={{ color: "var(--sf-text-primary)" }}>
                    <thead>
                      <tr style={{ color: "var(--sf-text-muted)" }}>
                        {["Type", "Shape", "Size", "Shade", "Clarity", "Cert", "Carat", "Pcs"].map((h) => (
                          <th key={h} className="px-3 py-1.5 text-left font-medium whitespace-nowrap" style={{ borderTop: "1px solid var(--sf-divider)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diamonds.map((dm, i) => (
                        <tr key={i}>
                          {[dm.diamond_type, dm.diamond_shape, dm.diamond_size, dm.diamond_color, dm.diamond_clarity, dm.diamond_certification, dm.carat, dm.diamond_pcs].map((v, j) => (
                            <td key={j} className="px-3 py-1.5 whitespace-nowrap" style={{ borderTop: "1px solid var(--sf-divider)" }}>{dash(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stones.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-muted)" }}>
                  Stones ({stones.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]" style={{ color: "var(--sf-text-primary)" }}>
                    <thead>
                      <tr style={{ color: "var(--sf-text-muted)" }}>
                        {["Stone name", "Quality", "Carat", "Pcs"].map((h) => (
                          <th key={h} className="px-3 py-1.5 text-left font-medium whitespace-nowrap" style={{ borderTop: "1px solid var(--sf-divider)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stones.map((st, i) => (
                        <tr key={i}>
                          {[st.stone_name, st.quality, st.carat, st.pcs].map((v, j) => (
                            <td key={j} className="px-3 py-1.5 whitespace-nowrap" style={{ borderTop: "1px solid var(--sf-divider)" }}>{dash(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-center py-10" style={{ color: "var(--sf-text-muted)" }}>
            {!pid ? "Select a product SKU and a retailer to view pricing."
              : !rid ? "Select a retailer to view pricing for this SKU."
                : "Select a product SKU and a retailer to view pricing."}
          </p>
        )}
      </div>
    </Card>
  );
}
