"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	CheckSquare,
	Target,
	StickyNote,
	Clock,
	Banknote,
	type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { resolveTaskHref } from "@/lib/navigation/nav-visibility";
import { useNavVisibilityStore } from "@/stores/nav-visibility-store";

type MobileTab = {
	label: string;
	href: string;
	matchPrefixes: readonly string[];
	icon: LucideIcon;
	/** Hide this tab when the given top-level app is hidden. */
	appId?: string;
	/** Hide this tab when the given task view is hidden. */
	taskViewId?: string;
	/** When set, the href is adaptive (resolved against visible task views). */
	preferredTaskHref?: string;
};

const TABS: MobileTab[] = [
	{
		label: "Tasks",
		href: "/tasks/list-view",
		matchPrefixes: ["/tasks/list-view", "/tasks/kanban-view"],
		icon: CheckSquare,
		preferredTaskHref: "/tasks/list-view",
	},
	{
		label: "Habits",
		href: "/habits",
		matchPrefixes: ["/habits"],
		icon: Target,
		appId: "habits",
	},
	{
		label: "Notes",
		href: "/notes",
		matchPrefixes: ["/notes"],
		icon: StickyNote,
		appId: "notes",
	},
	{
		label: "Calendar",
		href: "/timeblocks",
		matchPrefixes: ["/timeblocks"],
		icon: Clock,
		appId: "timeblocks",
	},
	{
		label: "Cash",
		href: "/tasks/cash-flow-view",
		matchPrefixes: ["/tasks/cash-flow-view"],
		icon: Banknote,
		taskViewId: "tasks-cash",
	},
];

function isActive(pathname: string, prefixes: readonly string[]): boolean {
	return prefixes.some((p) => pathname.startsWith(p));
}

/**
 * Fixed bottom navigation bar — visible only on mobile (< md).
 * Renders the core resource tabs with 44px+ touch targets, filtered by the
 * user's navigation visibility preferences. Respects iOS safe-area-inset-bottom.
 */
export function MobileBottomNav() {
	const pathname = usePathname();
	const hiddenAppIds = useNavVisibilityStore((s) => s.hiddenAppIds);
	const hiddenTaskViewIds = useNavVisibilityStore((s) => s.hiddenTaskViewIds);

	const visibleTabs = TABS.filter((tab) => {
		if (tab.appId && hiddenAppIds.includes(tab.appId)) return false;
		if (tab.taskViewId && hiddenTaskViewIds.includes(tab.taskViewId))
			return false;
		return true;
	});

	return (
		<nav
			aria-label="Main navigation"
			className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<div className="flex h-16 items-stretch">
				{visibleTabs.map((tab) => {
					const active = isActive(pathname, tab.matchPrefixes);
					const href = tab.preferredTaskHref
						? resolveTaskHref(tab.preferredTaskHref, hiddenTaskViewIds)
						: tab.href;
					return (
						<Link
							key={tab.label}
							href={href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
								"min-h-[44px] min-w-[44px]",
								active
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{/* Active indicator bar */}
							{active && (
								<span
									aria-hidden
									className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-foreground"
								/>
							)}
							<tab.icon
								className={cn("h-5 w-5 shrink-0", active && "stroke-[2.2]")}
							/>
							<span>{tab.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}

/** Pathname prefixes that belong to the 5 core mobile resources. */
export const MOBILE_CORE_PATHS = [
	"/tasks/list-view",
	"/tasks/kanban-view",
	"/tasks/cash-flow-view",
	"/habits",
	"/notes",
	"/timeblocks",
] as const;
