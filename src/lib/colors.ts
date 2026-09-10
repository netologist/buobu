/**
 * Perceptual color utilities for picking a color that is visually distinct
 * from a set of already-used colors.
 *
 * See: docs/adr/015-distinct-swimlane-color-selection.md
 *
 * Algorithm: greedy max-min dispersion over the hue circle.
 *   - Convert each used color to CIELAB and measure distance with Delta-E76
 *     (Euclidean in Lab space — a decent perceptual metric, dependency-free).
 *   - Sweep candidate hues at fixed saturation/lightness, convert each to
 *     Lab, and keep the hue whose *nearest* used color is *farthest* away.
 *   - Fixed S/L keeps generated colors aesthetically consistent and readable.
 *
 * This is the classic "maximin" facility-dispersion heuristic applied to
 * color, restricted to a pleasant 1-D hue gamut so the result is always a
 * usable swimlane/accent color.
 */

/** Current single-swimlane default (kept for backward compatibility). */
export const DEFAULT_SWIMLANE_COLOR = "#6366F1";

/** Fixed saturation/lightness for generated colors (vivid, readable). */
const DISTINCT_SATURATION = 0.62;
const DISTINCT_LIGHTNESS = 0.55;
/** Hue sampling resolution in degrees (1° → 360 candidates, sub-millisecond). */
const HUE_STEP = 1;

type Lab = { L: number; a: number; b: number };

// ── sRGB → CIELAB (D65) ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
	const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
	if (!m) return null;
	let h = m[1];
	if (h.length === 3) {
		h = h
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const n = Number.parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelToLinear(c: number): number {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

const D65 = { Xn: 0.95047, Yn: 1.0, Zn: 1.08883 };

function labF(t: number): number {
	const δ = 6 / 29;
	return t > δ ** 3 ? Math.cbrt(t) : t / (3 * δ * δ) + 4 / 29;
}

function rgbToLab(r: number, g: number, b: number): Lab {
	const rl = channelToLinear(r);
	const gl = channelToLinear(g);
	const bl = channelToLinear(b);
	// linear sRGB → XYZ (D65)
	const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
	const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
	const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;
	const fx = labF(x / D65.Xn);
	const fy = labF(y / D65.Yn);
	const fz = labF(z / D65.Zn);
	return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Convert a hex color to CIELAB, or null if the string is invalid. */
export function hexToLab(hex: string): Lab | null {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	return rgbToLab(rgb[0], rgb[1], rgb[2]);
}

/** CIE76 Delta-E: Euclidean distance in CIELAB (perceptual color difference). */
export function deltaE76(a: Lab, b: Lab): number {
	return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

/** Perceptual distance between two hex colors, or null if either is invalid. */
export function colorDistanceHex(a: string, b: string): number | null {
	const la = hexToLab(a);
	const lb = hexToLab(b);
	if (!la || !lb) return null;
	return deltaE76(la, lb);
}

// ── HSL → sRGB ────────────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;
	if (hp < 1) {
		r1 = c;
		g1 = x;
	} else if (hp < 2) {
		r1 = x;
		g1 = c;
	} else if (hp < 3) {
		g1 = c;
		b1 = x;
	} else if (hp < 4) {
		g1 = x;
		b1 = c;
	} else if (hp < 5) {
		r1 = x;
		b1 = c;
	} else {
		r1 = c;
		b1 = x;
	}
	const m = l - c / 2;
	return [
		Math.round((r1 + m) * 255),
		Math.round((g1 + m) * 255),
		Math.round((b1 + m) * 255),
	];
}

function rgbToHex(r: number, g: number, b: number): string {
	const to = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n)))
			.toString(16)
			.padStart(2, "0");
	return `#${to(r)}${to(g)}${to(b)}`;
}

function hslToLab(h: number, s: number, l: number): Lab {
	const [r, g, b] = hslToRgb(h, s, l);
	return rgbToLab(r, g, b);
}

// ── Dispersion picker ─────────────────────────────────────────────────────────

/**
 * Pick a hex color that is maximally perceptually distinct from `usedColors`
 * (greedy max-min Delta-E over the hue circle at fixed S/L).
 *
 * - Invalid/blank entries in `usedColors` are ignored.
 * - When `usedColors` is empty (or all invalid), the default swimlane color
 *   is returned for backward compatibility.
 * - Deterministic: identical input always yields identical output.
 */
export function pickDistinctColor(
	usedColors: ReadonlyArray<string> = [],
): string {
	const usedLabs = usedColors
		.map((c) => hexToLab(c))
		.filter((lab): lab is Lab => lab !== null);

	if (usedLabs.length === 0) return DEFAULT_SWIMLANE_COLOR;

	let bestHue = 0;
	let bestScore = -1;

	for (let h = 0; h < 360; h += HUE_STEP) {
		const candidate = hslToLab(h, DISTINCT_SATURATION, DISTINCT_LIGHTNESS);
		// Min perceptual distance from this candidate to any used color.
		let nearest = Infinity;
		for (const used of usedLabs) {
			const d = deltaE76(candidate, used);
			if (d < nearest) nearest = d;
		}
		// Maximize that minimum distance (farthest-from-nearest). On ties the
		// first (lowest) hue wins, keeping the result deterministic.
		if (nearest > bestScore) {
			bestScore = nearest;
			bestHue = h;
		}
	}

	const [r, g, b] = hslToRgb(bestHue, DISTINCT_SATURATION, DISTINCT_LIGHTNESS);
	return rgbToHex(r, g, b);
}
