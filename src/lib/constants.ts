export const DEFAULT_CURRENCY = "GBP";
export const DEFAULT_ARCHIVE_COLUMN_ID = "done";
export const LONG_PRESS_DELAY_MS = 500;

/**
 * Invite codes are ULIDs: 26 Crockford-base32 characters, sortable by issue
 * time, with I, L, O and U left out of the alphabet so a code cannot be misread
 * from a screen or an email.
 *
 * Codes issued before that change are 6-20 characters of A-Z/0-9 and are still
 * accepted, so the pattern covers both shapes.
 *
 * This lives here rather than in each caller because the register form and the
 * auth service have to accept exactly the same set. When they disagree the user
 * holding a valid code gets a validation error, and nothing in the tests catches
 * it -- the two regexes are only ever exercised against the shape they expect.
 */
export const INVITE_CODE_PATTERN = /^(?:[0-9A-HJKMNP-TV-Z]{26}|[A-Z0-9]{6,20})$/;
export const INVITE_CODE_MAX_LENGTH = 26;
export const INVITE_CODE_ERROR =
	"Invite code must be a 26-character code, or a legacy 6-20 character code (A-Z, 0-9)";

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
