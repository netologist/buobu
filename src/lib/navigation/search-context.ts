export const SEARCH_CONTEXT_FLAG = "_gs";
export const SEARCH_CONTEXT_TYPE = "_gsType";
export const SEARCH_CONTEXT_ITEM = "_gsItem";

export const SEARCH_SCOPED_FILTER_KEYS = [
	"taskId",
	"habitId",
	"noteId",
	"mindmapId",
	"bookmarkId",
	"whiteboardId",
	"routineId",
	"timeblockId",
	"swimlane",
	"swimlaneId",
	SEARCH_CONTEXT_FLAG,
	SEARCH_CONTEXT_TYPE,
	SEARCH_CONTEXT_ITEM,
] as const;

export function isSearchContextActive(params: URLSearchParams): boolean {
	return params.get(SEARCH_CONTEXT_FLAG) === "1";
}

export function clearSearchScopedFilters(params: URLSearchParams): URLSearchParams {
	for (const key of SEARCH_SCOPED_FILTER_KEYS) {
		params.delete(key);
	}
	return params;
}

export function buildSearchContextLabel(params: URLSearchParams): string {
	const type = params.get(SEARCH_CONTEXT_TYPE) ?? "resource";
	const item = params.get(SEARCH_CONTEXT_ITEM);
	const swimlaneId = params.get("swimlaneId") ?? params.get("swimlane");
	const boardId = params.get("boardId");

	const parts: string[] = [`type=${type}`];
	if (item) {
		parts.push(`id=${item}`);
	}
	if (boardId) {
		parts.push(`board=${boardId}`);
	}
	if (swimlaneId) {
		parts.push(`swimlane=${swimlaneId}`);
	}

	return parts.join(" · ");
}