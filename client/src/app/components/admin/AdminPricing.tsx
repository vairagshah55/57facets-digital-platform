import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { motion } from "framer-motion";
import {
  Gem, Coins, Sparkles, Hammer, Users, Calculator,
  Plus, Trash2, Save, Upload, Loader2, Check, X, Search, RefreshCw, Download,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { adminPricing, adminProducts } from "../../../lib/adminApi";

/* ═══════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════ */
type TabKey = "gold" | "diamond" | "stones" | "making" | "retailers" | "preview";
const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "gold",      label: "Gold Rates",   icon: Coins,      color: "#f59e0b" },
  { key: "diamond",   label: "Diamond Rates",icon: Gem,        color: "#a855f7" },
  { key: "stones",    label: "Stone Rates",  icon: Sparkles,   color: "#22c55e" },
  { key: "making",    label: "Making",       icon: Hammer,     color: "#3b82f6" },
  { key: "preview",   label: "SKU Price",    icon: Calculator, color: "#ec4899" },
];

const fmt = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

/* Which chart the rate tabs read/write: "" = Global default, else a retailer id.
   Unset cells in a retailer's chart fall back to Global. */
const ScopeContext = createContext<string>("");
const useScope = () => useContext(ScopeContext);
// Tabs that edit the rate chart (and therefore respect the scope selector).
const CHART_TABS: TabKey[] = ["gold", "diamond", "stones", "making"];

/* ═══════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════ */
export function AdminPricing() {
  const [tab, setTab] = useState<TabKey>("gold");
  const [importing, setImporting] = useState(false);
  const [scope, setScope] = useState("");           // "" = Global, else retailer id
  const [retailers, setRetailers] = useState<any[]>([]);

  useEffect(() => {
    adminPricing.retailers().then((d: any) => setRetailers(d || [])).catch(() => {});
  }, []);

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
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'Melodrama','Georgia',serif", color: "var(--sf-text-primary)" }}>
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
            <option value="">🌐 Global default (everyone)</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.price_factor ? ` (×${r.price_factor})` : ""}</option>
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
          {tab === "diamond" && <DiamondTab />}
          {tab === "stones" && <StonesTab />}
          {tab === "making" && <MakingTab />}
          {tab === "preview" && <PreviewTab />}
        </motion.div>
      </ScopeContext.Provider>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════ */
function Card({ children, title, sub, action }: any) {
  return (
    <div className="rounded-2xl border overflow-hidden mb-5" style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}>
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
function GoldTab() {
  const scope = useScope();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.metalRates(scope).then((d: any) => {
      // Always show the 4 karat rows; pre-fill from fetched values (blank = inherits Global for a retailer).
      const byType = new Map((d || []).map((r: any) => [r.gold_type, r.rate_per_gram]));
      setRows(["14KT", "18KT", "22KT", "24KT"].map((g) => ({ gold_type: g, rate_per_gram: byType.has(g) ? byType.get(g) : "" })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      await adminPricing.saveMetalRates(rows.map((r) => ({ gold_type: r.gold_type, rate_per_gram: Number(r.rate_per_gram) || 0 })), scope);
      toast.success("Gold rates updated");
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
    <Card title="Gold rate per gram" sub="Tracks the daily gold price — used for the metal portion of every product"
      action={
        <div className="flex items-center gap-2">
          <Button onClick={sync} disabled={syncing} size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
            style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync live
          </Button>
          <SaveBtn onClick={save} saving={saving} />
        </div>
      }>
      {loading ? <SkeletonRows cols={2} n={4} /> : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rows.map((r, i) => (
            <div key={r.gold_type} className="rounded-xl border p-3" style={{ borderColor: "var(--sf-divider)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--sf-text-secondary)" }}>{r.gold_type}</p>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--sf-text-muted)" }}>₹</span>
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

function DiamondTab() {
  const scope = useScope();
  const [shape, setShape] = useState("ROUND");
  const [cells, setCells] = useState<Record<string, string>>({});      // full matrix across all shapes
  const [sievesByShape, setSievesByShape] = useState<Record<string, string[]>>({});
  const [sieves, setSieves] = useState<any[]>([]);                     // carat→sieve map table
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSieve, setNewSieve] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminPricing.diamondRates(scope), adminPricing.sieveMap(scope)])
      .then(([d, s]: any) => {
        const c: Record<string, string> = {};
        const bySh: Record<string, Set<string>> = {};
        for (const r of d) {
          c[cellKey(r.shape_group, r.sieve_size, r.shade, r.clarity)] = String(r.rate_per_carat);
          (bySh[r.shape_group] = bySh[r.shape_group] || new Set()).add(r.sieve_size);
        }
        for (const sm of s) (bySh[sm.shape_group] = bySh[sm.shape_group] || new Set()).add(sm.sieve_size);
        const sbs: Record<string, string[]> = {};
        for (const sg of SHAPE_GROUPS) {
          const set = bySh[sg] || new Set<string>();
          (DEFAULT_SIEVES[sg] || []).forEach((x) => set.add(x));
          sbs[sg] = Array.from(set).sort(sieveSort);
        }
        setCells(c); setSievesByShape(sbs); setSieves(s);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const rowSieves = sievesByShape[shape] || DEFAULT_SIEVES[shape] || [];
  const setCell = (sv: string, col: { shade: string; clarity: string }, v: string) =>
    setCells((p) => ({ ...p, [cellKey(shape, sv, col.shade, col.clarity)]: v }));

  const addSieve = () => {
    const sv = newSieve.trim();
    if (!sv) return;
    setSievesByShape((p) => ({ ...p, [shape]: Array.from(new Set([...(p[shape] || []), sv])).sort(sieveSort) }));
    setNewSieve("");
  };

  const saveRates = async () => {
    const rows = Object.entries(cells)
      .filter(([, v]) => v !== "" && v != null && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([k, v]) => { const [shape_group, sieve_size, shade, clarity] = k.split("|"); return { shape_group, sieve_size, shade, clarity, rate_per_carat: Number(v) }; });
    if (!rows.length) { toast.error("Enter at least one rate"); return; }
    setSaving(true);
    try { await adminPricing.saveDiamondRates(rows, scope); toast.success(`Saved ${rows.length} diamond rates`); load(); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const saveSieves = async () => {
    setSaving(true);
    try {
      await adminPricing.saveSieveMap(sieves.filter((s) => s.shape_group && s.carat_min !== "" && s.sieve_size), scope);
      toast.success("Sieve map saved"); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
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
      for (const [name, grid] of sheets) {
        const shape_group = groupForSheetName(name);
        if (!shape_group || !grid || grid.length < 2) continue;
        const header = grid[0].map((h) => String(h).replace(/\s+/g, "").toUpperCase());
        const gradeIdx = GRADE_COLUMNS.map((g) => header.indexOf(g.label.replace(/\s+/g, "").toUpperCase()));
        for (let r = 1; r < grid.length; r++) {
          const sieve_size = String(grid[r][0] || "").trim();
          if (!sieve_size) continue;
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
      if (!rows.length) { toast.error("No valid rates found — check the sheet names match the shape groups"); return; }
      setSaving(true);
      await adminPricing.saveDiamondRates(rows, scope);
      toast.success(`Imported ${rows.length} diamond rates`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card title="Carat → sieve map" sub="Maps a product's carat to a sieve bucket — the rows of the matrix below"
        action={<SaveBtn onClick={saveSieves} saving={saving} />}>
        {loading ? <SkeletonRows cols={4} n={3} /> : (
          <EditableTable rows={sieves} setRows={setSieves}
            addTemplate={{ shape_group: "ROUND", carat_min: "", carat_max: "", sieve_size: "" }}
            cols={[
              { key: "shape_group", label: "Shape group", options: SHAPE_GROUPS, width: 160 },
              { key: "carat_min", label: "Carat ≥", type: "number" },
              { key: "carat_max", label: "Carat <", type: "number" },
              { key: "sieve_size", label: "Sieve", placeholder: "-2 / +2 …" },
            ]} />
        )}
      </Card>

      <Card title="Diamond rate matrix (₹ / carat)" sub="Rows = sieve size · columns = shade-clarity grade. Type rates straight into the cells."
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
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--sf-divider)" }}>
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
                        style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>{sv}</td>
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
              <input value={newSieve} onChange={(e) => setNewSieve(e.target.value)} placeholder="add sieve (e.g. -5)"
                className="w-36 h-8 px-2 rounded-md text-xs border outline-none"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }} />
              <button onClick={addSieve}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ color: "var(--sf-teal)", backgroundColor: "var(--sf-bg-surface-2)", border: "none", cursor: "pointer" }}>
                <Plus className="w-3.5 h-3.5" /> Add sieve row
              </button>
              <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>
                Empty cells are skipped. Editing {shape}.
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
  const scope = useScope();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.stoneRates(scope).then((d: any) => setRows(d)).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      await adminPricing.saveStoneRates(rows.filter((r) => r.category && r.stone_name)
        .map((r) => ({ ...r, rate: Number(r.rate) || 0, unit: r.unit || "carat" })), scope);
      toast.success("Stone rates saved"); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Card title="Stone rates" sub="Price = rate × carat × pcs (unit: carat) · rate × pcs (unit: piece)"
      action={<SaveBtn onClick={save} saving={saving} />}>
      {loading ? <SkeletonRows cols={6} n={6} /> : (
        <EditableTable rows={rows} setRows={setRows}
          addTemplate={{ category: "Precious Stones", stone_name: "", rate: "", unit: "carat", pcs: "" }}
          cols={[
            { key: "category", label: "Category", options: STONE_CATS, width: 170 },
            { key: "stone_name", label: "Stone name", width: 150 },
            { key: "pcs", label: "Number of Pieces", type: "number", width: 130 },
            { key: "rate", label: "Rate (/ct)", type: "number", width: 90 },
            { key: "_price", label: "Price", width: 100,
              compute: (r: any) => {
                const isCarat = (r.unit || "carat") === "carat";
                const ct = Number(r.carat) || 1;   // default 1 when not picked
                const pcs = Number(r.pcs) || 1;    // default 1 when blank
                // carat unit → rate × carat × pcs ; piece unit → rate × pcs
                const v = (Number(r.rate) || 0) * (isCarat ? ct : 1) * pcs;
                return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
              } },
            { key: "unit", label: "Unit", options: ["carat", "piece"], width: 90 },
          ]} />
      )}
    </Card>
  );
}

/* ── MAKING ──────────────────────────────────────────── */
function MakingTab() {
  const scope = useScope();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fixed making rows for every gold type (+ a 'default' fallback) — for everyone.
  const MAKING_SCOPES = ["default", "14KT", "18KT", "22KT", "24KT"];

  const load = useCallback(() => {
    setLoading(true);
    adminPricing.makingCharges(scope).then((d: any) => {
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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);
  useEffect(() => { load(); }, [load]);
  useImportRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      // Only persist rows that actually have a value (blanks inherit Global / default).
      await adminPricing.saveMakingCharges(
        rows.filter((r) => r.scope && r.mode && r.value !== "" && r.value != null)
          .map((r) => ({ scope: r.scope, mode: r.mode, value: Number(r.value) || 0 })), scope);
      toast.success("Making charges saved"); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Card title="Making / labour charges" sub="Making = value (₹/g) × product's gross/net weight (g)"
      action={<SaveBtn onClick={save} saving={saving} />}>
      {loading ? <SkeletonRows cols={3} n={5} /> : (
        <EditableTable rows={rows} setRows={setRows}
          addTemplate={{ scope: "", mode: "gross", value: "" }}
          cols={[
            { key: "scope", label: "Scope", placeholder: "14KT / Ring", width: 200 },
            { key: "mode", label: "Weight", options: ["gross", "net"] },
            { key: "value", label: "Value (₹/g)", type: "number", width: 140 },
          ]} />
      )}
    </Card>
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
    adminPricing.retailers().then((d: any) => setRows(d)).catch(() => {}).finally(() => setLoading(false));
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
    adminPricing.overrides(retailer.id).then((d: any) => setOverrides(d)).catch(() => {});
  }, [retailer.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { adminProducts.list({ limit: "200" }).then((d: any) => setProducts(d.products || [])).catch(() => {}); }, []);

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
            <select value={pid} onChange={(e) => setPid(e.target.value)}
              className="w-full h-9 px-2 rounded-md text-sm border outline-none"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }}>
              <option value="">Select a product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
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
   PRICE PREVIEW
   ═══════════════════════════════════════════════════════ */
function PreviewTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [pid, setPid] = useState("");
  const [rid, setRid] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    adminProducts.list({ limit: "200" }).then((d: any) => setProducts(d.products || [])).catch(() => {});
    adminPricing.retailers().then((d: any) => setRetailers(d)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(s)) : products;
  }, [products, q]);

  useEffect(() => {
    if (!pid) { setResult(null); return; }
    setLoading(true);
    adminPricing.preview(pid, rid || undefined).then((d: any) => setResult(d)).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false));
  }, [pid, rid]);

  const d = result?.breakdown?.detail;
  const makingInfo = (m: any) =>
    m.mode === "percent" ? `${m.value}% of metal`
    : m.mode === "gross" ? `${fmt(m.value)}/g × gross wt`
    : m.mode === "net"   ? `${fmt(m.value)}/g × net wt`
    : `flat ${fmt(m.value)}`;
  const lines = d ? [
    { label: "Metal", cost: d.gold.cost, info: `${d.gold.gold_type || "—"} · ${fmt(d.gold.rate_per_gram)}/g × ${d.gold.weight || 0}g` },
    { label: "Diamond", cost: d.diamond.cost, info: d.diamond.matched ? `${d.diamond.shape_group} · ${d.diamond.sieve} · ${d.diamond.shade}-${d.diamond.clarity} · rate ${fmt(d.diamond.rate_per_carat)}` : "no rate matched" },
    { label: "Stone", cost: d.stone.cost, info: d.stone.matched ? `${d.stone.name} · ${fmt(d.stone.rate)}/${d.stone.unit}${d.stone.unit === "carat" && d.stone.carat ? ` × ${d.stone.carat}ct` : ""}${d.stone.pcs ? ` × ${d.stone.pcs}pcs` : ""}` : "no stone / no rate" },
    { label: "Making", cost: d.making.cost, info: makingInfo(d.making) },
  ] : [];

  // Dynamic per-section total (metal + diamond + stone + making). With no retailer
  // this IS the price — never the static stored base_price. A retailer applies its
  // own factors / overrides, so trust the server's computed price in that case.
  const dynamicTotal = d ? d.gold.cost + d.diamond.cost + d.stone.cost + d.making.cost : 0;
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
  // Show every product column from the DB (minus internal / non-display keys).
  const HIDE_KEYS = new Set(["id", "category_id", "diamonds", "created_at", "updated_at", "search_vector"]);
  const labelize = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMfg\b/, "Mfg").replace(/\bSku\b/, "SKU");
  const fmtVal = (v: any) => {
    if (v === true) return "Yes";
    if (v === false) return "No";
    return dash(v);
  };
  const productRows: [string, any][] = p
    ? Object.keys(p).filter((k) => !HIDE_KEYS.has(k)).map((k) => [labelize(k), fmtVal(p[k])])
    : [];
  const diamonds: any[] = p?.diamonds || [];
  const retailerRows = ri ? [
    ["Retailer", ri.name], ["Company", dash(ri.company_name)],
    ["Price factor", `×${dash(ri.price_factor)}`], ["Flat markup", fmt(Number(ri.flat_markup || 0))],
    ["Gold factor", `×${dash(ri.gold_factor)}`], ["Diamond factor", `×${dash(ri.diamond_factor)}`],
    ["Stone factor", `×${dash(ri.stone_factor)}`], ["Making factor", `×${dash(ri.making_factor)}`],
  ] as [string, any][] : [];

  // ── Step-by-step calculation (every operand spelled out) ──────────
  const isOverride = result?.source === "override";
  const fnum = (v: any, d2 = 1) => (v == null || v === "" ? d2 : Number(v));
  const gf = fnum(ri?.gold_factor), df = fnum(ri?.diamond_factor), sf = fnum(ri?.stone_factor), mf = fnum(ri?.making_factor);
  const pf = fnum(ri?.price_factor), fm = fnum(ri?.flat_markup, 0);
  const hasFactors = !!ri && (gf !== 1 || df !== 1 || sf !== 1 || mf !== 1);
  const factoredBase = d ? d.gold.cost * gf + d.diamond.cost * df + d.stone.cost * sf + d.making.cost * mf : 0;
  const calcSteps = d && !isOverride ? [
    { k: "Gold", eq: `${fmt(d.gold.rate_per_gram)}/g × ${d.gold.weight || 0} g`, res: d.gold.cost },
    { k: "Diamond", eq: d.diamond.matched ? `rate ${fmt(d.diamond.rate_per_carat)} (flat, no carat)` : "no rate matched", res: d.diamond.cost },
    { k: "Stone", eq: d.stone.matched ? `${fmt(d.stone.rate)}${d.stone.unit === "carat" && d.stone.carat ? ` × ${d.stone.carat} ct` : ""}${d.stone.pcs ? ` × ${d.stone.pcs} pcs` : ""}` : "no rate matched", res: d.stone.cost },
    { k: "Making", eq:
        d.making.mode === "percent" ? `${d.making.value}% × ${fmt(d.gold.cost)} (metal)`
        : d.making.mode === "gross" ? `${fmt(d.making.value)}/g × ${p?.gross_weight || 0} g (gross)`
        : d.making.mode === "net"   ? `${fmt(d.making.value)}/g × ${p?.net_weight || 0} g (net)`
        : `flat`, res: d.making.cost },
  ] : [];
  const subtotalEq = d ? `${fmt(d.gold.cost)} + ${fmt(d.diamond.cost)} + ${fmt(d.stone.cost)} + ${fmt(d.making.cost)}` : "";

  return (
    <Card title="SKU price breakdown" sub="Pick a product SKU to see per-section details and price (metal / diamond / stone / making)">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Product SKU</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
              <Input placeholder="Search SKU / name to filter…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9 text-sm mb-2"
                style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }} />
            </div>
            <select value={pid} onChange={(e) => setPid(e.target.value)}
              className="w-full h-9 px-2 rounded-md text-sm border outline-none"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }}>
              <option value="">Select a product…</option>
              {filtered.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--sf-text-muted)" }}>Retailer</label>
            <select value={rid} onChange={(e) => setRid(e.target.value)}
              className="w-full h-9 px-2 mt-1 rounded-md text-sm border outline-none"
              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)", borderColor: "var(--sf-divider)" }}>
              <option value="">No retailer (base computed)</option>
              {retailers.map((r) => <option key={r.id} value={r.id}>{r.name} (×{r.price_factor})</option>)}
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
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
            {lines.map((ln) => (
              <div key={ln.label} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
                <div>
                  <p className="text-sm" style={{ color: "var(--sf-text-primary)" }}>{ln.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{ln.info}</p>
                </div>
                <span className="text-sm font-medium" style={{ color: ln.cost > 0 ? "var(--sf-text-primary)" : "var(--sf-text-muted)" }}>{fmt(ln.cost)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "var(--sf-bg-surface-2)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>Final price</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(48,184,191,0.15)", color: "var(--sf-teal)" }}>{shownSource}</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--sf-teal)" }}>{fmt(shownPrice)}</span>
            </div>
          </div>

          {!isOverride && d && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              <div className="px-4 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>
                Step-by-step calculation
              </div>
              {calcSteps.map((s) => (
                <div key={s.k} className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{s.k}</span>
                  <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>{s.eq} = <b style={{ color: "var(--sf-text-primary)" }}>{fmt(s.res)}</b></span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>Subtotal</span>
                <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>{subtotalEq} = <b style={{ color: "var(--sf-text-primary)" }}>{fmt(dynamicTotal)}</b></span>
              </div>
              {hasFactors && (
                <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>× section factors</span>
                  <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>
                    {fmt(d.gold.cost)}×{gf} + {fmt(d.diamond.cost)}×{df} + {fmt(d.stone.cost)}×{sf} + {fmt(d.making.cost)}×{mf} = <b style={{ color: "var(--sf-text-primary)" }}>{fmt(factoredBase)}</b>
                  </span>
                </div>
              )}
              {ri && (pf !== 1 || fm !== 0 || hasFactors) && (
                <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={{ borderTop: "1px solid var(--sf-divider)" }}>
                  <span className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>× price factor + markup</span>
                  <span className="text-[11px] text-right" style={{ color: "var(--sf-text-secondary)" }}>
                    {fmt(hasFactors ? factoredBase : dynamicTotal)} × {pf} + {fmt(fm)} = <b style={{ color: "var(--sf-teal)" }}>{fmt(shownPrice)}</b>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ri && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--sf-divider)" }}>
                <div className="px-4 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>
                  Retailer pricing (master)
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
                <div className="px-4 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>
                  Product details (DB)
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
              <div className="px-4 py-2 text-xs font-semibold" style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}>
                Diamonds ({diamonds.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={{ color: "var(--sf-text-primary)" }}>
                  <thead>
                    <tr style={{ color: "var(--sf-text-muted)" }}>
                      {["Type", "Shape", "Size", "Shade", "Clarity", "Cert", "Carat", "Pcs", "Stone", "Stone qual"].map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-medium whitespace-nowrap" style={{ borderTop: "1px solid var(--sf-divider)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diamonds.map((dm, i) => (
                      <tr key={i}>
                        {[dm.diamond_type, dm.diamond_shape, dm.diamond_size, dm.diamond_color, dm.diamond_clarity, dm.diamond_certification, dm.carat, dm.diamond_pcs, dm.stone_name, dm.stone_quality].map((v, j) => (
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
          <p className="text-xs text-center py-10" style={{ color: "var(--sf-text-muted)" }}>Select a product to preview its price.</p>
        )}
      </div>
    </Card>
  );
}
