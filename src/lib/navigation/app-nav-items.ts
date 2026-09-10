import {
	Kanban,
	CalendarCheck,
	CalendarClock,
	Flame,
	NotebookText,
	BookmarkCheck,
	PaintbrushVertical,
	Network,
	LayoutGrid,
	List,
	CalendarDays,
	Banknote,
	type LucideIcon,
} from "lucide-react";

export type AppNavSubItem = {
	id: string;
	label: string;
	icon: LucideIcon;
	href: string;
	matchPrefixes: string[];
};

export type AppNavItem = {
	id: string;
	label: string;
	icon: LucideIcon;
	href: string;
	matchPrefixes: string[];
	subItems?: AppNavSubItem[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
	{
		id: "tasks",
		label: "Tasks",
		icon: Kanban,
		href: "/tasks/kanban-view",
		matchPrefixes: ["/tasks"],
		subItems: [
			{
				id: "tasks-kanban",
				label: "Kanban",
				icon: LayoutGrid,
				href: "/tasks/kanban-view",
				matchPrefixes: ["/tasks/kanban-view"],
			},
			{
				id: "tasks-list",
				label: "List",
				icon: List,
				href: "/tasks/list-view",
				matchPrefixes: ["/tasks/list-view"],
			},
			{
				id: "tasks-calendar",
				label: "Calendar",
				icon: CalendarDays,
				href: "/tasks/calendar-view",
				matchPrefixes: ["/tasks/calendar-view"],
			},
			{
				id: "tasks-cash",
				label: "Cash Flow",
				icon: Banknote,
				href: "/tasks/cash-flow-view",
				matchPrefixes: ["/tasks/cash-flow-view"],
			},
		],
	},
	{
		id: "routines",
		label: "Routines",
		icon: CalendarCheck,
		href: "/routines",
		matchPrefixes: ["/routines"],
	},
	{
		id: "timeblocks",
		label: "Time Blocks",
		icon: CalendarClock,
		href: "/timeblocks",
		matchPrefixes: ["/timeblocks"],
	},
	{
		id: "habits",
		label: "Habits",
		icon: Flame,
		href: "/habits",
		matchPrefixes: ["/habits"],
	},
	{
		id: "notes",
		label: "Notes",
		icon: NotebookText,
		href: "/notes",
		matchPrefixes: ["/notes"],
	},
	{
		id: "bookmarks",
		label: "Bookmarks",
		icon: BookmarkCheck,
		href: "/bookmarks",
		matchPrefixes: ["/bookmarks"],
	},
	{
		id: "whiteboards",
		label: "Whiteboards",
		icon: PaintbrushVertical,
		href: "/whiteboards",
		matchPrefixes: ["/whiteboards"],
	},
	{
		id: "mindmaps",
		label: "Mindmaps",
		icon: Network,
		href: "/mindmaps",
		matchPrefixes: ["/mindmaps"],
	},
];
