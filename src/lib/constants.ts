export const DEFAULT_CURRENCY = "GBP";
export const DEFAULT_ARCHIVE_COLUMN_ID = "done";
export const LONG_PRESS_DELAY_MS = 500;

const MIGRATION_PREFIX = "buobu-migration";

export const STORAGE_KEYS = {
	DEVICE_ID: "buobu_device_id",
	USER: "buobu_user",
	THEME: "buobu-theme",
	DAILY_BRIEFING_DATE: "buobu.last-briefing-date",
	HABITS_FILTERS: "goals-habits-filters",
	SEED_BOARDS_COMPLETE: "buobu-seed-boards-complete",
	ENTITLEMENTS: "buobu_entitlements",
	PENDING_PROMO: "buobu_pending_promo",
	migration: (userId: string) => {
		const shortId = userId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
		return `${MIGRATION_PREFIX}-${shortId}`;
	},
	supabaseAuthToken: (projectRef: string) => `sb-${projectRef}-auth-token`,
	LAST_VISITED_PATH: "buobu_last_visited_path",
	NAV_VISIBILITY: "buobu-nav-visibility",
	DEFAULT_CURRENCY: "buobu-default-currency",
} as const;
