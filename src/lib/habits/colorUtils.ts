export function hexToRgb(hex?: string | null) {
  if (!hex) return null;
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return `${r}, ${g}, ${b}`;
}

export function getCellColor(value: number, color?: string | null) {
  if (!value) return undefined;
  if (value < 0) return undefined;
  const rgb = hexToRgb(color) ?? "34, 197, 94";
  const alpha = value === 1 ? 0.25 : value === 2 ? 0.5 : value === 3 ? 0.8 : undefined;
  return alpha !== undefined ? `rgba(${rgb}, ${alpha})` : undefined;
}

export function getWeekendBackground(date: Date) {
  const day = date.getDay();
  if (day === 6) return "oklch(0.987 0.016 90)";
  if (day === 0) return "oklch(0.982 0.016 80)";
  return undefined;
}

export function getSkipBackground(date: Date, color?: string | null) {
  const base = getWeekendBackground(date) ?? "oklch(0.975 0 0)";
  const rgb = hexToRgb(color) ?? "34, 197, 94";
  const accent = `rgba(${rgb}, 0.25)`;
  return `linear-gradient(30deg, ${accent} 0%, ${accent} 50%, ${base} 50%, ${base} 100%)`;
}
