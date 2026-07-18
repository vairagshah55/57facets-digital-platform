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

// A chart row — variable column count (ring has 3, bracelet/bangle have 4).
type Row = string[];

// Official India ↔ US ring chart (per Legal Metrology Act, 2009).
// Each row: [Indian Ring Size, US Ring Size, Inside Circumference Range (mm)].
const RING_ROWS: Row[] = [
  ["5.0", "3.0", "44.3 - 45.1"],
  ["6.0", "3.5", "45.2 - 46.3"],
  ["7.0", "4.0", "46.4 - 47.7"],
  ["9.0", "4.5", "47.8 - 49.3"],
  ["10.0", "5.0", "49.4 - 50.3"],
  ["11.0", "5.5", "50.4 - 51.2"],
  ["12.0", "6.0", "51.3 - 52.1"],
  ["13.0", "6.5", "52.2 - 53.5"],
  ["15.0", "7.0", "53.6 - 55.3"],
  ["16.0", "7.5", "55.4 - 56.2"],
  ["17.0", "8.0", "56.3 - 57.2"],
  ["18.0", "8.5", "57.3 - 58.5"],
  ["20.0", "9.0", "58.6 - 60.3"],
  ["21.0", "9.5", "60.4 - 61.2"],
  ["22.0", "10.0", "61.3 - 62.2"],
  ["23.0", "10.5", "62.3 - 63.4"],
  ["25.0", "11.0", "63.5 - 65.1"],
  ["26.0", "11.5", "65.2 - 66.3"],
  ["27.0", "12.0", "66.4 - 67.2"],
  ["28.0", "12.5", "67.3 - 68.6"],
  ["30.0", "13.0", "68.7 - 70.1"],
];

// US → India conversion (shared by bracelet & bangle) — matches the master
// "US to India Bracelet/Bangle Conversion Chart" exactly.
const CONVERSION_ROWS: Row[] = [
  // US Length (Inches), US Length (cm), Indian Size, Inner Diameter (Inches)
  ["6.5 inches", "16.5 cm", "Small (S)", "2.2"],
  ["7.0 inches", "17.8 cm", "Medium (M)", "2.4"],
  ["7.5 inches", "19.0 cm", "Large (L)", "2.6"],
  ["8.0 inches", "20.3 cm", "Extra Large (XL)", "2.8"],
];

type ChartDef = {
  title: string;
  subtitle: string;
  sizeLabel: string; // e.g. "Ring Size (India)"
  noun: string; // e.g. "Ring"
  headers: string[];
  rows: Row[];
  tip: string;
  footnote?: string; // optional fine print shown under the table
  // Canonical size value used for selection (independent of column order).
  valueOf: (row: Row) => string;
  // From a row → the short chip text and the helper summary line.
  chip: (row: Row) => string;
  chipSub?: (row: Row) => string; // optional small 2nd line inside each chip
  summary: (row: Row) => string;
};

const CHARTS: Record<SizeKind, ChartDef> = {
  ring: {
    title: "Ring Size Chart",
    subtitle: "India ↔ US conversion",
    sizeLabel: "Ring Size (India)",
    noun: "Ring",
    headers: ["Indian Ring Size", "US Ring Size", "Inside Circumference Range (mm)"],
    rows: RING_ROWS,
    tip: "Wrap a thin strip of paper around your finger, mark where it overlaps, then measure that length in mm — that's the inside circumference. Match it to the range, then read across for your Indian & US size.",
    footnote: "The measurement of length is in millimeter as per the Legal Metrology Act, 2009. For convenience, its conversion to length value is also reflected.",
    valueOf: (r) => r[0],
    chip: (r) => `${r[2]} mm`, // show the Inside Circumference Range only
    summary: (r) => `India ${r[0].replace(/\.0$/, "")} · US ${r[1].replace(/\.0$/, "")} · ${r[2]} mm`,
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
            style={{ color: "var(--sf-text-primary)", fontFamily: "'General Sans', 'Inter', sans-serif" }}
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

          {chart.footnote && (
            <p className="text-[10px] leading-relaxed mt-3" style={{ color: "var(--sf-text-muted)" }}>
              <span style={{ color: "var(--sf-teal)" }}>*</span> {chart.footnote}
            </p>
          )}
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
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--sf-text-muted)" }}>
            {chart.sizeLabel}
          </span>
        </div>
        <SizeChartDialog
          chart={chart}
          trigger={
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] font-semibold transition-opacity hover:opacity-80"
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
      <div className="sf-teal-scroll flex gap-2.5 overflow-x-auto pt-2 pb-1.5 px-1 -mx-1">
        {chart.rows.map((row) => {
          const v = chart.valueOf(row);
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v, `${chart.noun} size ${v} — ${chart.summary(row)}`)}
              className="relative shrink-0 min-w-[44px] px-3 py-2 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5"
              style={{
                background: active ? "var(--sf-teal-glass)" : "var(--sf-glass-bg)",
                border: active ? "1.5px solid var(--sf-teal-border)" : "1px solid var(--sf-glass-border)",
                color: active ? "var(--sf-teal)" : "var(--sf-text-secondary)",
                boxShadow: active ? "0 0 0 3px var(--sf-teal-subtle), 0 4px 12px var(--sf-shadow-teal)" : "none",
                transform: active ? "translateY(-1px)" : "none",
              }}
            >
              <span className="text-[11px] font-bold leading-none">{chart.chip(row)}</span>
              {chart.chipSub && (
                <span
                  className="text-[9px] font-medium leading-none whitespace-nowrap"
                  style={{ color: active ? "var(--sf-teal)" : "var(--sf-text-muted)", opacity: active ? 0.85 : 0.7 }}
                >
                  {chart.chipSub(row)}
                </span>
              )}
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
      <p className="text-[13px] mt-3" style={{ color: "var(--sf-text-muted)" }}>
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
