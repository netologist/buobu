import {
	APP_NAV_ITEMS,
	type AppNavItem,
	type AppNavSubItem,
} from "./app-nav-items";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Adaptive navigation visibility.
 *
 * Users can hide top-level apps and individual task views from their
 * navigation. Hiding is *visibility only* — data is never deleted, and a
 * hidden app's deep-link URL still works. When the canonical default for a
 * section is hidden, we fall back to the next visible item ("adaptive
 * default") so navigation never dead-ends.
 *
 * Example: hide the Kanban task view → clicking "Tasks" lands on List (or the
 * next visible view) instead of a hidden route.
 */

export type NavVisibility = {
	hiddenAppIds: string[];
	hiddenTaskViewIds: string[];
};

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
	hiddenAppIds: [],
	hiddenTaskViewIds: [],
};

/** Apps that can never be hidden (they are the product spine). */
export const ALWAYS_VISIBLE_APP_IDS = new Set<string>(["tasks"]);

/** The Tasks nav item (owns the switchable task views). */
export function getTasksItem(): AppNavItem {
	const item = APP_NAV_ITEMS.find((i) => i.id === "tasks");
	if (!item) throw new Error("Tasks nav item not found");
	return item;
}

/** All task view sub-items, in canonical order. */
export function getTaskViews(): AppNavSubItem[] {
	return getTasksItem().subItems ?? [];
}

/** Task views that remain visible given the hidden set (canonical order). */
export function getVisibleTaskViews(
	hiddenTaskViewIds: string[],
): AppNavSubItem[] {
	const hidden = new Set(hiddenTaskViewIds);
	return getTaskViews().filter((v) => !hidden.has(v.id));
}

/** Can the user hide another task view? Always keep at least one visible. */
export function canHideTaskView(hiddenTaskViewIds: string[]): boolean {
	return getVisibleTaskViews(hiddenTaskViewIds).length > 1;
}

/**
 * Resolve the href for the Tasks section given a *preferred* default.
 *
 * Returns the preferred href when it is visible; otherwise the first visible
 * task view in canonical order. This is the adaptive default: hide Kanban and
 * "Tasks" lands on List (or the next visible) instead of dead-ending.
 */
export function resolveTaskHref(
	preferredHref: string,
	hiddenTaskViewIds: string[],
): string {
	const hidden = new Set(hiddenTaskViewIds);
	const preferredVisible = getTaskViews().some(
		(v) => v.href === preferredHref && !hidden.has(v.id),
	);
	if (preferredVisible) return preferredHref;
	const fallback = getVisibleTaskViews(hiddenTaskViewIds)[0];
	return fallback ? fallback.href : preferredHref;
}

/** Top-level apps that remain visible (Tasks is always kept). */
export function getVisibleApps(hiddenAppIds: string[]): AppNavItem[] {
	const hidden = new Set(hiddenAppIds);
	return APP_NAV_ITEMS.filter(
		(item) => ALWAYS_VISIBLE_APP_IDS.has(item.id) || !hidden.has(item.id),
	);
}

/** True if `pathname` is a hidden task view route. */
export function isHiddenTaskViewPath(
	pathname: string,
	hiddenTaskViewIds: string[],
): boolean {
	const hidden = new Set(hiddenTaskViewIds);
	return getTaskViews().some(
		(v) => hidden.has(v.id) && pathname.startsWith(v.href),
	);
}

/** True if `pathname` belongs to a hidden top-level app section (Tasks never hidden). */
export function isHiddenAppPath(
	pathname: string,
	hiddenAppIds: string[],
): boolean {
	const hidden = new Set(hiddenAppIds);
	return APP_NAV_ITEMS.some(
		(item) =>
			!ALWAYS_VISIBLE_APP_IDS.has(item.id) &&
			hidden.has(item.id) &&
			item.matchPrefixes.some((p) => pathname.startsWith(p)),
	);
}

/**
 * Read persisted visibility straight from localStorage (for non-reactive
 * contexts like the post-login redirect, which runs before React mounts).
 * Safe on SSR (returns defaults) and on corrupt/missing data.
 */
export function readNavVisibility(): NavVisibility {
	if (typeof window === "undefined") return DEFAULT_NAV_VISIBILITY;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEYS.NAV_VISIBILITY);
		if (!raw) return DEFAULT_NAV_VISIBILITY;
		// zustand persist shape: { state: {...}, version: n }
		const parsed = JSON.parse(raw) as {
			state?: Partial<NavVisibility>;
			version?: number;
		};
		const state = parsed.state ?? {};
		return {
			hiddenAppIds: Array.isArray(state.hiddenAppIds) ? state.hiddenAppIds : [],
			hiddenTaskViewIds: Array.isArray(state.hiddenTaskViewIds)
				? state.hiddenTaskViewIds
				: [],
		};
	} catch {
		return DEFAULT_NAV_VISIBILITY;
	}
}
