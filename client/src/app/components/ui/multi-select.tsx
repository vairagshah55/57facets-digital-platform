import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Checkbox } from "./checkbox";

/**
 * Compact multi-select dropdown: a trigger button that shows how many options
 * are selected, opening a checkbox list in a popover. Selection is an array of
 * string values controlled by the parent.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select",
  width,
  className = "",
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  width?: string;
  className?: string;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };

  const label =
    selected.length === 0 ? placeholder
    : selected.length === 1 ? selected[0]
    : `${placeholder} · ${selected.length}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${className}`}
          style={{
            width,
            backgroundColor: "var(--sf-bg-surface-1)",
            border: `1px solid ${selected.length > 0 ? "var(--sf-teal-border, rgba(48,184,191,0.4))" : "var(--sf-divider)"}`,
            color: selected.length > 0 ? "var(--sf-teal)" : "var(--sf-text-muted)",
          }}
        >
          <span className="truncate">{label}</span>
          {selected.length > 0 ? (
            <X
              className="w-3.5 h-3.5 shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1.5 w-56 max-h-72 overflow-y-auto">
        {options.length === 0 ? (
          <p className="text-xs px-2 py-1.5" style={{ color: "var(--sf-text-muted)" }}>No options</p>
        ) : (
          options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-[var(--sf-bg-surface-2)]"
            >
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span className="text-sm" style={{ color: "var(--sf-text-secondary)" }}>{opt}</span>
            </label>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
