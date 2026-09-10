import { HOME_PAGE_ENABLED } from "@/lib/feature-flags";
import { STORAGE_KEYS } from "@/lib/constants";
import {
	isHiddenAppPath,
	isHiddenTaskViewPath,
	readNavVisibility,
	resolveTaskHref,
} from "@/lib/navigation/nav-visibility";

/** Sections that are valid landing destinations after login. */
const VALID_SECTION_PREFIXES = [
	"/tasks",
	"/habits",
	"/notes",
	"/bookmarks",
	"/mindmaps",
	"/whiteboards",
	"/routines",
	"/timeblocks",
	"/home",
];

function getLastVisitedPath(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.LAST_VISITED_PATH);
		if (!stored) return null;

		let candidate = stored;

		// New format: full URL (https://app.local/notes?noteId=...)
		if (/^https?:\/\//i.test(stored)) {
			const url = new URL(stored);
			if (url.origin !== window.location.origin) return null;
			candidate = `${url.pathname}${url.search}${url.hash}`;
		}

		const isValid = VALID_SECTION_PREFIXES.some((prefix) =>
			candidate.startsWith(prefix),
		);
		return isValid ? candidate : null;
	} catch {
		return null;
	}
}

/**
 * Returns the first in-app route users should see right after authentication.
 * Prefers the last visited section stored in localStorage; falls back to the
 * default home/tasks view when no valid history exists.
 *
 * @param isMobile - Whether the current viewport is mobile. When true and HOME_PAGE disabled,
 *                   returns /tasks/listView instead of /tasks/kanbanView.
 */
export function getPostLoginPath(isMobile: boolean = false): string {
	if (HOME_PAGE_ENABLED) {
		return "/home";
	}
	const { hiddenAppIds, hiddenTaskViewIds } = readNavVisibility();
	const lastVisited = getLastVisitedPath();
	if (
		lastVisited &&
		!isHiddenTaskViewPath(lastVisited, hiddenTaskViewIds) &&
		!isHiddenAppPath(lastVisited, hiddenAppIds)
	) {
		return lastVisited;
	}
	// Adaptive default: prefer the canonical view, fall back to the next
	// visible one when it has been hidden.
	const preferred = isMobile ? "/tasks/list-view" : "/tasks/kanban-view";
	return resolveTaskHref(preferred, hiddenTaskViewIds);
}
