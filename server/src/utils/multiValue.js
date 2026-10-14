// Some product fields can hold several values, stored comma-separated in one
// text column — type_category ("DIAMOND, GOLD") and sub_category
// ("LADIES, SOLITAIRE"). Normalise on write so the filters can split on ","
// reliably: trim each part, drop blanks, de-dupe case-insensitively, re-join
// with ", ". null/undefined pass through untouched so callers keep their
// "not provided" semantics.
function normalizeMultiValue(value) {
  if (value == null) return value;
  const seen = new Set();
  const parts = [];
  for (const raw of String(value).split(",")) {
    const s = raw.trim().replace(/ +/g, " ");
    if (!s || seen.has(s.toUpperCase())) continue;
    seen.add(s.toUpperCase());
    parts.push(s);
  }
  return parts.join(", ");
}

// SQL predicate: does the comma-separated `column` contain any of the
// (upper-cased) values bound at `paramRef`? Per-item, case-insensitive.
function multiValueMatchSql(column, paramRef) {
  return `EXISTS (SELECT 1 FROM unnest(string_to_array(${column}, ',')) AS mv
                  WHERE upper(trim(mv)) = ANY(${paramRef}))`;
}

// Parse a comma-separated filter query param into upper-cased values.
function parseMultiValueParam(param) {
  return String(param).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

module.exports = { normalizeMultiValue, multiValueMatchSql, parseMultiValueParam };
