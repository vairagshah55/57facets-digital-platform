import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Loader2, BarChart3, Calendar, Users,
  Eye, ShoppingCart, Activity, Heart, Sparkles, UserPlus, KeyRound,
  ShieldCheck, ChevronDown,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "../ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { adminReports, adminRetailers, type ReportColumn } from "../../../lib/adminApi";

/* ── Report catalog (UI metadata) ─────────────────── */

type FilterKey = "date" | "retailer" | "status" | "actor_type" | "otp_outcome";

type ReportMeta = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  filters: FilterKey[];
  requiredFilters?: FilterKey[];
  defaultRange?: "30d" | "90d" | "all";
};

const REPORTS: ReportMeta[] = [
  {
    key: "orders-by-date",
    label: "Orders by Date Range",
    description: "All orders in a selected period with full details.",
    icon: Calendar, color: "#3b82f6",
    filters: ["date", "status"], defaultRange: "30d",
  },
  {
    key: "orders-by-retailer",
    label: "Orders by Retailer",
    description: "Order history for a specific retailer account.",
    icon: Users, color: "#22c55e",
    filters: ["retailer", "date"], requiredFilters: ["retailer"], defaultRange: "all",
  },
  {
    key: "most-viewed-products",
    label: "Most Viewed Products",
    description: "Top products by unique retailer views.",
    icon: Eye, color: "#a855f7",
    filters: ["date"], defaultRange: "30d",
  },
  {
    key: "most-ordered-products",
    label: "Most Ordered Products",
    description: "Top products by order frequency and volume.",
    icon: ShoppingCart, color: "#f59e0b",
    filters: ["date"], defaultRange: "90d",
  },
  {
    key: "retailer-activity",
    label: "Retailer Activity Log",
    description: "Logins, shortlists, orders per retailer.",
    icon: Activity, color: "#06b6d4",
    filters: ["retailer", "date"], defaultRange: "30d",
  },
  {
    key: "shortlist-analysis",
    label: "Shortlist Analysis",
    description: "What retailers shortlisted but haven't ordered.",
    icon: Heart, color: "#ec4899",
    filters: [],
  },
  {
    key: "customisation-trends",
    label: "Customisation Trends",
    description: "Most requested gold colours, shapes, qualities.",
    icon: Sparkles, color: "#eab308",
    filters: ["date"], defaultRange: "90d",
  },
  {
    key: "new-vs-repeat-retailers",
    label: "New vs Repeat Retailers",
    description: "Active and loyal retailers by order count.",
    icon: UserPlus, color: "#14b8a6",
    filters: [],
  },
  {
    key: "otp-usage",
    label: "OTP Usage",
    description: "OTP generations, usage, expirations.",
    icon: KeyRound, color: "#8b5cf6",
    filters: ["date", "otp_outcome"], defaultRange: "30d",
  },
  {
    key: "audit-trail",
    label: "Audit Trail",
    description: "Full system audit log for a date range or retailer.",
    icon: ShieldCheck, color: "#f97316",
    filters: ["date", "actor_type", "retailer"], defaultRange: "30d",
  },
];

/* ── Helpers ──────────────────────────────────────── */

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function computeDefaultRange(range?: "30d" | "90d" | "all") {
  if (!range || range === "all") return { from: "", to: "" };
  const days = range === "30d" ? 30 : 90;
  const to   = new Date();
  const from = new Date(); from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
}

function formatCell(col: ReportColumn, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (col.key.endsWith("_at") || col.key === "joined_at" || col.key === "expires_at") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
  }
  if (col.key === "total" || col.key === "revenue" || col.key === "total_spent") {
    return "₹" + Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  if (col.key === "is_used") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export function AdminReports() {
  const [activeKey, setActiveKey] = useState<string>(REPORTS[0].key);
  const active = useMemo(() => REPORTS.find((r) => r.key === activeKey)!, [activeKey]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [status,   setStatus]   = useState<string>("all");
  const [actorType,setActorType]= useState<string>("all");
  const [otpOutcome,setOtpOutcome]= useState<string>("all");
  const [retailerId,setRetailerId]= useState<string>("");
  const [retailerSearch, setRetailerSearch] = useState("");

  const [retailers, setRetailers] = useState<{ id: string; name: string; phone?: string; company?: string }[]>([]);

  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  // Reset filters when report changes
  useEffect(() => {
    const range = computeDefaultRange(active.defaultRange);
    setDateFrom(range.from);
    setDateTo(range.to);
    setStatus("all");
    setActorType("all");
    setOtpOutcome("all");
    if (!active.filters.includes("retailer")) setRetailerId("");
    setRows([]);
    setColumns([]);
    setHasRun(false);
    setError(null);
  }, [activeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load retailers once (for picker)
  useEffect(() => {
    adminRetailers.list({ limit: "500" })
      .then((d: any) => {
        const list = (d.retailers || []).map((r: any) => ({
          id: r.id, name: r.name, phone: r.phone,
          company: r.business_name || r.company_name,
        }));
        setRetailers(list);
      })
      .catch(() => {});
  }, []);

  const filteredRetailers = useMemo(() => {
    const q = retailerSearch.trim().toLowerCase();
    if (!q) return retailers.slice(0, 50);
    return retailers
      .filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [retailers, retailerSearch]);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (active.filters.includes("date")) {
      if (dateFrom) p.from = dateFrom;
      if (dateTo)   p.to   = dateTo + "T23:59:59";
    }
    if (active.filters.includes("retailer") && retailerId) p.retailer_id = retailerId;
    if (active.filters.includes("status") && status !== "all") p.status = status;
    if (active.filters.includes("actor_type") && actorType !== "all") p.actor_type = actorType;
    if (active.filters.includes("otp_outcome") && otpOutcome !== "all") p.outcome = otpOutcome;
    return p;
  }, [active, dateFrom, dateTo, retailerId, status, actorType, otpOutcome]);

  function missingRequired(): string | null {
    if (active.requiredFilters?.includes("retailer") && !retailerId) {
      return "Select a retailer to run this report.";
    }
    return null;
  }

  async function handleRun() {
    const missing = missingRequired();
    if (missing) { setError(missing); return; }
    setLoading(true); setError(null);
    try {
      const data = await adminReports.run(active.key, buildParams());
      setColumns(data.columns);
      setRows(data.rows);
      setHasRun(true);
    } catch (e: any) {
      setError(e.message || "Failed to run report");
    } finally { setLoading(false); }
  }

  async function handleExport() {
    const missing = missingRequired();
    if (missing) { setError(missing); return; }
    setExporting(true); setError(null);
    try {
      await adminReports.exportCsv(active.key, buildParams());
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally { setExporting(false); }
  }

  const selectedRetailer = retailers.find((r) => r.id === retailerId);
  const showFilter = (k: FilterKey) => active.filters.includes(k);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="mb-5"
      >
        <h1 className="text-xl font-semibold" style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}>
          Reports
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
          Export sales, activity, and audit data for analysis.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

        {/* ── Sidebar: report list ─────────────────── */}
        <aside
          className="rounded-2xl border p-2 self-start"
          style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2"
            style={{ color: "var(--sf-text-muted)" }}
          >
            Available Reports
          </p>
          <div className="space-y-0.5">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              const isActive = r.key === activeKey;
              return (
                <button
                  key={r.key}
                  onClick={() => setActiveKey(r.key)}
                  className="w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: isActive ? `${r.color}14` : "transparent",
                    border:          isActive ? `1px solid ${r.color}33` : "1px solid transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
                    style={{ backgroundColor: `${r.color}1f`, color: r.color }}
                  >
                    <Icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[12.5px] font-semibold leading-tight"
                      style={{ color: isActive ? "var(--sf-text-primary)" : "var(--sf-text-secondary)" }}
                    >
                      {r.label}
                    </p>
                    <p className="text-[10.5px] leading-snug mt-0.5" style={{ color: "var(--sf-text-muted)" }}>
                      {r.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Right pane ───────────────────────────── */}
        <section className="space-y-4 min-w-0">

          {/* Title strip */}
          <div
            className="rounded-2xl border p-4"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${active.color}1f`, color: active.color }}
              >
                <active.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold" style={{ color: "var(--sf-text-primary)" }}>
                  {active.label}
                </h2>
                <p className="text-[11px]" style={{ color: "var(--sf-text-muted)" }}>{active.description}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            className="rounded-2xl border p-4 space-y-3"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            <div className="flex flex-wrap items-end gap-3">

              {showFilter("date") && (
                <>
                  <FilterField label="From">
                    <Input
                      type="date" value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 text-xs"
                      style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                    />
                  </FilterField>
                  <FilterField label="To">
                    <Input
                      type="date" value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 text-xs"
                      style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
                    />
                  </FilterField>
                </>
              )}

              {showFilter("status") && (
                <FilterField label="Status">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 w-36 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {showFilter("actor_type") && (
                <FilterField label="Actor">
                  <Select value={actorType} onValueChange={setActorType}>
                    <SelectTrigger className="h-9 w-32 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {showFilter("otp_outcome") && (
                <FilterField label="Outcome">
                  <Select value={otpOutcome} onValueChange={setOtpOutcome}>
                    <SelectTrigger className="h-9 w-32 text-xs" style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}

              {showFilter("retailer") && (
                <FilterField label={active.requiredFilters?.includes("retailer") ? "Retailer *" : "Retailer"}>
                  <RetailerPicker
                    value={retailerId}
                    onChange={setRetailerId}
                    selectedLabel={selectedRetailer ? selectedRetailer.name + (selectedRetailer.company ? ` · ${selectedRetailer.company}` : "") : ""}
                    search={retailerSearch}
                    onSearch={setRetailerSearch}
                    items={filteredRetailers}
                    color={active.color}
                  />
                </FilterField>
              )}

              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm" onClick={handleRun} disabled={loading}
                  className="h-9 gap-1.5"
                  style={{ backgroundColor: active.color, color: "#fff", border: "none" }}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  Run report
                </Button>
                <Button
                  size="sm" variant="outline" onClick={handleExport} disabled={exporting || !hasRun}
                  className="h-9 gap-1.5"
                  style={{ borderColor: "var(--sf-divider)", color: "var(--sf-text-secondary)" }}
                >
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export CSV
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
            )}
          </div>

          {/* Results */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
          >
            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: active.color }} />
                <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Running report…</p>
              </div>
            ) : !hasRun ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <FileText className="w-8 h-8" style={{ color: "var(--sf-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>
                  Set filters above and click "Run report" to preview the data.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <FileText className="w-8 h-8" style={{ color: "var(--sf-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sf-text-muted)" }}>No matching records.</p>
              </div>
            ) : (
              <>
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--sf-divider)" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sf-text-muted)" }}>
                    {rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"}
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[calc(100vh-380px)]">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "var(--sf-divider)" }}>
                        {columns.map((c) => (
                          <TableHead
                            key={c.key}
                            className="text-[11px] font-semibold whitespace-nowrap"
                            style={{ color: "var(--sf-text-muted)" }}
                          >
                            {c.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={i} style={{ borderColor: "var(--sf-divider)" }}>
                          {columns.map((c) => (
                            <TableCell
                              key={c.key}
                              className="text-xs whitespace-nowrap"
                              style={{ color: "var(--sf-text-secondary)" }}
                            >
                              {formatCell(c, row[c.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Subcomponents ───────────────────────────────── */

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sf-text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function RetailerPicker({
  value, onChange, selectedLabel, search, onSearch, items, color,
}: {
  value: string;
  onChange: (id: string) => void;
  selectedLabel: string;
  search: string;
  onSearch: (s: string) => void;
  items: { id: string; name: string; phone?: string; company?: string }[];
  color: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 min-w-[220px] text-left flex items-center gap-1.5 rounded-md border px-3 text-xs"
        style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", color: "var(--sf-text-primary)" }}
      >
        <span className="flex-1 truncate">
          {selectedLabel || <span style={{ color: "var(--sf-text-muted)" }}>Select retailer…</span>}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sf-text-muted)" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 mt-1 w-[300px] rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--sf-bg-surface-2)", borderColor: "var(--sf-divider)", boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}
          >
            <Input
              autoFocus value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name, phone, company…"
              className="h-9 text-xs rounded-none border-0"
              style={{ backgroundColor: "var(--sf-bg-surface-3)", color: "var(--sf-text-primary)", borderBottom: "1px solid var(--sf-divider)" }}
            />
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-xs px-3 py-4 text-center" style={{ color: "var(--sf-text-muted)" }}>
                  No matches.
                </p>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onChange(r.id); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs"
                    style={{
                      backgroundColor: r.id === value ? `${color}1a` : "transparent",
                      color: "var(--sf-text-primary)",
                      borderBottom: "1px solid var(--sf-divider)",
                    }}
                    onMouseEnter={(e) => { if (r.id !== value) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { if (r.id !== value) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
                    <p className="font-semibold truncate">{r.name}</p>
                    <p className="text-[10.5px]" style={{ color: "var(--sf-text-muted)" }}>
                      {[r.company, r.phone].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
