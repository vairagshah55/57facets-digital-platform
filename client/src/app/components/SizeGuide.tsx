import { useMemo, useState } from "react";
import { Ruler, Info, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";

/* ═══════════════════════════════════════════════════════
   SIZE GUIDE — context-aware size selector + chart for the
   customization section of the product detail page. Renders
   the size system that matches the product category
   (ring / bracelet / bangle); the chosen size flows into the
   order. A "Size chart" link opens the full conversion table.
   ═══════════════════════════════════════════════════════ */

type SizeKind = "ring" | "bracelet" | "bangle";

// Map a product category string to a size-chart kind (null = no chart).
export function sizeKindForCategory(category: string | undefined | null): SizeKind | null {
  const c = (category || "").trim().toLowerCase();
  if (!c) return null;
  if (c.includes("bangle")) return "bangle";
  if (c.includes("bracelet")) return "bracelet";
  // "earrings" contains "ring" — match rings explicitly.
  if (c === "ring" || c === "rings" || c === "finger ring" || c === "finger rings") return "ring";
  return null;
}

// Each row is [col0, col1, col2, col3]; col0 is the primary "size" value.
const RING_ROWS: Array<[string, string, string, string]> = [
  // India, US, Diameter (mm), Circumference (mm)
  ["4", "3", "14.5", "45.5"],
  ["6", "4", "15.3", "48.0"],
  ["8", "5", "16.1", "50.6"],
  ["9", "5.5", "16.5", "51.8"],
  ["10", "6", "16.9", "53.1"],
  ["11", "6.5", "17.3", "54.4"],
  ["12", "7", "17.7", "55.6"],
  ["13", "7.5", "18.1", "56.9"],
  ["14", "8", "18.5", "58.1"],
  ["15", "8.5", "19.0", "59.5"],
  ["16", "9", "19.4", "60.8"],
  ["17", "9.5", "19.8", "62.1"],
  ["18", "10", "20.2", "63.3"],
  ["19", "10.5", "20.6", "64.6"],
  ["20", "11", "21.0", "65.9"],
  ["21", "11.5", "21.4", "67.2"],
  ["22", "12", "21.8", "68.5"],
  ["23", "12.5", "22.2", "69.7"],
  ["24", "13", "22.6", "71.0"],
  ["25", "13.5", "23.0", "72.3"],
  ["26", "14", "23.4", "73.5"],
];

// US → India conversion (shared by bracelet & bangle) — matches the master
// "US to India Bracelet/Bangle Conversion Chart" exactly.
const CONVERSION_ROWS: Array<[string, string, string, string]> = [
  // US Length (Inches), US Length (cm), Indian Size, Inner Diameter (Inches)
  ["6.5 inches", "16.5 cm", "Small (S)", "2.2"],
  ["7.0 inches", "17.8 cm", "Medium (M)", "2.4"],
  ["7.5 inches", "19.0 cm", "Large (L)", "2.6"],
  ["8.0 inches", "20.3 cm", "Extra Large (XL)", "2.8"],
];

type Row4 = [string, string, string, string];

type ChartDef = {
  title: string;
  subtitle: string;
  sizeLabel: string; // e.g. "Ring Size (India)"
  noun: string; // e.g. "Ring"
  headers: string[];
  rows: Row4[];
  tip: string;
  // Canonical size value used for selection (independent of column order).
  valueOf: (row: Row4) => string;
  // From a row → the short chip text and the helper summary line.
  chip: (row: Row4) => string;
  summary: (row: Row4) => string;
};

const CHARTS: Record<SizeKind, ChartDef> = {
  ring: {
    title: "Ring Size Chart",
    subtitle: "India ↔ US conversion",
    sizeLabel: "Ring Size (India)",
    noun: "Ring",
    headers: ["India", "US", "Diameter (mm)", "Circumference (mm)"],
    rows: RING_ROWS,
    tip: "Wrap a thin strip of paper around your finger, mark where it overlaps, then measure that length in mm — that's the circumference. Match it to the closest row.",
    valueOf: (r) => r[0],
    chip: (r) => r[0],
    summary: (r) => `US ${r[1]} · ${r[2]} mm dia`,
  },
  bracelet: {
    title: "Bracelet Size Chart",
    subtitle: "US to India conversion",
    sizeLabel: "Bracelet Size",
    noun: "Bracelet",
    headers: ["US Length (Inches)", "US Length (cm)", "Indian Size", "Inner Diameter (Inches)"],
    rows: CONVERSION_ROWS,
    tip: "Measure your wrist snugly with a tape, then add about 1.5–2 cm for comfort and match the total to the US length column.",
    // Select by inner diameter (2.2 / 2.4 / 2.6 / 2.8) — same as bangle.
    valueOf: (r) => r[3],
    chip: (r) => r[3],
    summary: (r) => `${r[2]} · ${r[0]} (${r[1]}) · ${r[3]}" inner dia`,
  },
  bangle: {
    title: "Bangle Size Chart",
    subtitle: "US to India conversion",
    sizeLabel: "Bangle Size",
    noun: "Bangle",
    headers: ["US Length (Inches)", "US Length (cm)", "Indian Size", "Inner Diameter (Inches)"],
    rows: CONVERSION_ROWS,
    tip: "Bring your thumb to your little finger and measure around the widest part of your hand, then match the inner diameter to the closest row.",
    // Select by Indian bangle size (inner diameter, e.g. 2.2 / 2.4 / 2.6 / 2.8).
    valueOf: (r) => r[3],
    chip: (r) => r[3],
    summary: (r) => `${r[2]} · ${r[0]} (${r[1]}) · ${r[3]}" inner dia`,
  },
};

/* ─── The conversion-table modal (opened by the "Size chart" link) ─── */
function SizeChartDialog({ chart, trigger }: { chart: ChartDef; trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{ backgroundColor: "var(--sf-bg-surface-1)", borderColor: "var(--sf-divider)" }}
      >
        <DialogHeader className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--sf-divider)" }}>
          <DialogTitle
            className="flex items-center gap-2 text-base"
            style={{ color: "var(--sf-text-primary)", fontFamily: "'Melodrama', 'Georgia', serif" }}
          >
            <Ruler className="w-4 h-4" style={{ color: "var(--sf-teal)" }} />
            {chart.title}
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
            {chart.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {chart.headers.map((h, i) => (
                  <th
                    key={h}
                    className={`py-2 font-semibold ${i === 0 ? "text-left" : "text-center"}`}
                    style={{
                      color: "var(--sf-text-secondary)",
                      borderBottom: "1px solid var(--sf-divider)",
                      position: "sticky",
                      top: 0,
                      background: "var(--sf-bg-surface-1)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`py-2.5 ${ci === 0 ? "text-left font-bold" : "text-center"}`}
                      style={{
                        color: ci === 0 ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                        borderBottom: "1px solid var(--sf-glass-border)",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="flex items-start gap-2 px-5 py-3.5"
          style={{ background: "var(--sf-bg-surface-2)", borderTop: "1px solid var(--sf-divider)" }}
        >
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--sf-teal)" }} />
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--sf-text-muted)" }}>
            <span className="font-semibold" style={{ color: "var(--sf-text-secondary)" }}>How to measure: </span>
            {chart.tip}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── The size selector row (chips + chart link) ─── */
export function SizeSelector({
  category,
  value,
  onChange,
}: {
  category: string;
  value: string;
  // Reports both the short size value and a human-readable summary (for the order).
  onChange: (value: string, summary: string) => void;
}) {
  const kind = useMemo(() => sizeKindForCategory(category), [category]);
  if (!kind) return null;
  const chart = CHARTS[kind];

  const selectedRow = chart.rows.find((r) => chart.valueOf(r) === value);

  return (
    <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sf-glass-border)" }}>
      {/* Header: label + chart link */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--sf-text-muted)" }}>
            {chart.sizeLabel}
          </span>
        </div>
        <SizeChartDialog
          chart={chart}
          trigger={
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}
            >
              <Ruler className="w-3 h-3" />
              Size chart
            </button>
          }
        />
      </div>

      {/* Chips — horizontally scrollable (ring has many sizes).
          pt/px give the floating check badge room so it isn't clipped. */}
      <div className="flex gap-2.5 overflow-x-auto pt-2 pb-1.5 px-1 -mx-1" style={{ scrollbarWidth: "thin" }}>
        {chart.rows.map((row) => {
          const v = chart.valueOf(row);
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v, `${chart.noun} size ${v} — ${chart.summary(row)}`)}
              className="relative shrink-0 min-w-[44px] px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-200"
              style={{
                background: active ? "var(--sf-teal-glass)" : "var(--sf-glass-bg)",
                border: active ? "1.5px solid var(--sf-teal-border)" : "1px solid var(--sf-glass-border)",
                color: active ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                boxShadow: active ? "0 0 0 3px var(--sf-teal-subtle), 0 4px 12px var(--sf-shadow-teal)" : "none",
                transform: active ? "translateY(-1px)" : "none",
              }}
            >
              {chart.chip(row)}
              {active && (
                <span
                  className="absolute flex items-center justify-center rounded-full"
                  style={{ top: -6, right: -6, width: 16, height: 16, background: "var(--sf-teal)" }}
                >
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper line for the selected size */}
      <p className="text-[11px] mt-3" style={{ color: "var(--sf-text-muted)" }}>
        {selectedRow ? (
          <>Selected: <span className="font-semibold" style={{ color: "var(--sf-text-secondary)" }}>{chart.summary(selectedRow)}</span></>
        ) : (
          <>Pick a size, or leave blank and we'll confirm with you.</>
        )}
      </p>
    </div>
  );
}

export default SizeSelector;
