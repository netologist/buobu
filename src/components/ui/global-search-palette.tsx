"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
	Archive,
	CheckSquare,
	ListTodo,
	BookOpen,
	Brain,
	Bookmark,
	Clock3,
	Eye,
	Layout,
	Layers,
	Search,
	X,
} from "lucide-react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { useBoardStore } from "@/stores/board-store";
import {
	useTasks,
	useHabits,
	useNotes,
	useMindmaps,
	useBookmarks,
	useVisionItems,
} from "@/stores";
import { useArchiveViewStore } from "@/stores/archive-view-store";
import { cn } from "@/lib/utils";
import { useAllTimeblocks } from "@/stores/hooks/use-timeblocks";
import {
	SEARCH_CONTEXT_FLAG,
	SEARCH_CONTEXT_ITEM,
	SEARCH_CONTEXT_TYPE,
	buildSearchContextLabel,
	clearSearchScopedFilters,
	isSearchContextActive,
} from "@/lib/navigation/search-context";

interface SearchResult {
	id: string;
	title: string;
	type:
		| "board"
		| "swimlane"
		| "task"
		| "habit"
		| "note"
		| "mindmap"
		| "bookmark"
		| "visionItem"
		| "timeblock";
	archived: boolean;
	boardId?: string;
	swimlaneId?: string;
	subtitle?: string;
}

const TYPE_ICONS: Record<SearchResult["type"], React.ReactNode> = {
	board: <Layout className="h-3.5 w-3.5" />,
	swimlane: <Layers className="h-3.5 w-3.5" />,
	task: <CheckSquare className="h-3.5 w-3.5" />,
	habit: <ListTodo className="h-3.5 w-3.5" />,
	note: <BookOpen className="h-3.5 w-3.5" />,
	mindmap: <Brain className="h-3.5 w-3.5" />,
	bookmark: <Bookmark className="h-3.5 w-3.5" />,
	visionItem: <Eye className="h-3.5 w-3.5" />,
	timeblock: <Clock3 className="h-3.5 w-3.5" />,
};

const TYPE_ROUTES: Record<SearchResult["type"], string> = {
	board: "/tasks/kanban-view",
	swimlane: "/tasks/kanban-view",
	task: "/tasks/kanban-view",
	habit: "/habits",
	note: "/notes",
	mindmap: "/mindmaps",
	bookmark: "/bookmarks",
	visionItem: "/whiteboards",
	timeblock: "/timeblocks",
};

function buildSearchResultHref(result: SearchResult): string {
	const basePath = TYPE_ROUTES[result.type];
	const params = new URLSearchParams();
	params.set(SEARCH_CONTEXT_FLAG, "1");
	params.set(SEARCH_CONTEXT_TYPE, result.type);
	params.set(SEARCH_CONTEXT_ITEM, result.id);

	if (result.boardId) {
		params.set("boardId", result.boardId);
	}

	switch (result.type) {
		case "task":
			params.set("taskId", result.id);
			if (result.swimlaneId) {
				params.set("swimlaneId", result.swimlaneId);
			}
			break;
		case "swimlane":
			params.set("swimlaneId", result.id);
			break;
		case "habit":
			params.set("habitId", result.id);
			if (result.swimlaneId) {
				params.set("swimlane", result.swimlaneId);
				params.set("swimlaneId", result.swimlaneId);
			}
			break;
		case "note":
			params.set("noteId", result.id);
			break;
		case "mindmap":
			params.set("mindmapId", result.id);
			break;
		case "bookmark":
			params.set("bookmarkId", result.id);
			break;
		case "visionItem":
			params.set("whiteboardId", result.id);
			break;
		case "timeblock":
			params.set("timeblockId", result.id);
			if (result.swimlaneId) {
				params.set("swimlaneId", result.swimlaneId);
			}
			break;
		default:
			break;
	}

	const search = params.toString();
	return search ? `${basePath}?${search}` : basePath;
}

const GROUP_LABELS: Record<string, string> = {
	board: "Boards",
	swimlane: "Swimlanes",
	task: "Tasks",
	habit: "Habits",
	note: "Notes",
	mindmap: "Mindmaps",
	bookmark: "Bookmarks",
	visionItem: "Vision Items",
	timeblock: "Timeblocks",
};

export function GlobalSearchPalette({
	className,
}: {
	className?: string;
} = {}) {
	const [query, setQuery] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [includeArchived, setIncludeArchived] = useState(false);
	const [onlyArchived, setOnlyArchived] = useState(false);

	const pathname = usePathname();
	const searchParams = useSearchParams();

	const getTypeFromPathname = useCallback(
		(path: string): SearchResult["type"] | null => {
			if (path.startsWith("/tasks")) return "task";
			if (path.startsWith("/habits")) return "habit";
			if (path.startsWith("/notes")) return "note";
			if (path.startsWith("/bookmarks")) return "bookmark";
			if (path.startsWith("/mindmaps")) return "mindmap";
			return null;
		},
		[],
	);

	const [typeFilter, setTypeFilter] = useState<SearchResult["type"] | null>(
		() => getTypeFromPathname(pathname),
	);

	// Auto-update filter when navigating to a new page
	useEffect(() => {
		setTypeFilter(getTypeFromPathname(pathname));
	}, [pathname, getTypeFromPathname]);

	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	const boards = useBoardStore((s) => s.boards);
	const swimlanes = useBoardStore((s) => s.swimlanes);
	const enter = useArchiveViewStore((s) => s.enter);

	const tasks = useTasks();
	const habits = useHabits();
	const notes = useNotes();
	const mindmaps = useMindmaps();
	const bookmarks = useBookmarks();
	const visionItems = useVisionItems();
	const timeblocks = useAllTimeblocks();
	const searchContextActive = isSearchContextActive(
		new URLSearchParams(searchParams.toString()),
	);
	const searchContextLabel = buildSearchContextLabel(
		new URLSearchParams(searchParams.toString()),
	);

	// ⌘K: focus input on desktop, open dialog on mobile
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (window.innerWidth >= 768) {
					inputRef.current?.focus();
					setDropdownOpen(true);
				} else {
					setMobileOpen((p) => !p);
				}
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Close dropdown on outside click
	useEffect(() => {
		if (!dropdownOpen) return;
		function onMouseDown(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", onMouseDown);
		return () => document.removeEventListener("mousedown", onMouseDown);
	}, [dropdownOpen]);

	const boardMap = useMemo(
		() => new Map(boards.map((b) => [b.id, b])),
		[boards],
	);
	const swimlaneMap = useMemo(
		() => new Map(swimlanes.map((s) => [s.id, s])),
		[swimlanes],
	);

	const getParentLabel = useCallback(
		(boardId?: string, swimlaneId?: string) => {
			const parts: string[] = [];
			if (boardId) {
				const b = boardMap.get(boardId);
				if (b) parts.push(b.name);
			}
			if (swimlaneId) {
				const s = swimlaneMap.get(swimlaneId);
				if (s) parts.push(s.name);
			}
			return parts.join(" / ");
		},
		[boardMap, swimlaneMap],
	);

	const allResults = useMemo<SearchResult[]>(() => {
		const results: SearchResult[] = [];
		for (const board of boards) {
			if (onlyArchived ? !board.archived : !includeArchived && board.archived)
				continue;
			results.push({
				id: board.id,
				title: board.name,
				type: "board",
				archived: board.archived === true,
				boardId: board.id,
			});
		}
		for (const sw of swimlanes) {
			if (onlyArchived ? !sw.archived : !includeArchived && sw.archived)
				continue;
			results.push({
				id: sw.id,
				title: sw.name,
				type: "swimlane",
				archived: sw.archived === true,
				boardId: sw.boardId,
				swimlaneId: sw.id,
				subtitle: getParentLabel(sw.boardId),
			});
		}
		for (const task of tasks) {
			if (onlyArchived ? !task.archived : !includeArchived && task.archived)
				continue;
			results.push({
				id: task.id,
				title: task.title,
				type: "task",
				archived: task.archived === true,
				boardId: task.boardId,
				swimlaneId: task.swimlaneId,
				subtitle: getParentLabel(task.boardId, task.swimlaneId),
			});
		}
		for (const habit of habits) {
			if (onlyArchived ? !habit.archived : !includeArchived && habit.archived)
				continue;
			results.push({
				id: habit.id,
				title: habit.title,
				type: "habit",
				archived: habit.archived === true,
				boardId: habit.boardId,
				swimlaneId: habit.swimlaneId,
				subtitle: getParentLabel(habit.boardId, habit.swimlaneId),
			});
		}
		for (const note of notes) {
			if (onlyArchived ? !note.archived : !includeArchived && note.archived)
				continue;
			results.push({
				id: note.id,
				title: note.title,
				type: "note",
				archived: note.archived === true,
				boardId: note.boardId,
				swimlaneId: note.swimlaneId,
				subtitle: getParentLabel(note.boardId, note.swimlaneId),
			});
		}
		for (const mindmap of mindmaps) {
			if (
				onlyArchived ? !mindmap.archived : !includeArchived && mindmap.archived
			)
				continue;
			results.push({
				id: mindmap.id,
				title: mindmap.title,
				type: "mindmap",
				archived: mindmap.archived === true,
				boardId: mindmap.boardId,
				swimlaneId: mindmap.swimlaneId,
				subtitle: getParentLabel(mindmap.boardId, mindmap.swimlaneId),
			});
		}
		for (const bm of bookmarks) {
			if (onlyArchived ? !bm.archived : !includeArchived && bm.archived)
				continue;
			results.push({
				id: bm.id,
				title: bm.title || bm.url,
				type: "bookmark",
				archived: bm.archived === true,
			});
		}
		for (const vi of visionItems) {
			if (onlyArchived ? !vi.archived : !includeArchived && vi.archived)
				continue;
			results.push({
				id: vi.id,
				title: vi.title,
				type: "visionItem",
				archived: vi.archived === true,
			});
		}
		for (const tb of timeblocks) {
			if (onlyArchived ? !tb.archived : !includeArchived && tb.archived)
				continue;
			results.push({
				id: tb.id,
				title: tb.title,
				type: "timeblock",
				archived: tb.archived === true,
				boardId: tb.boardId,
				swimlaneId: tb.swimlaneId,
				subtitle: getParentLabel(tb.boardId, tb.swimlaneId),
			});
		}
		return results;
	}, [
		boards,
		swimlanes,
		tasks,
		habits,
		notes,
		mindmaps,
		bookmarks,
		visionItems,
		timeblocks,
		includeArchived,
		onlyArchived,
		getParentLabel,
	]);

	const clearContextFilters = useCallback(() => {
		const params = clearSearchScopedFilters(
			new URLSearchParams(searchParams.toString()),
		);
		const search = params.toString();
		router.replace(search ? `${pathname}?${search}` : pathname);
	}, [pathname, router, searchParams]);

	// Filter by query + optional resource-type filter
	const filteredResults = useMemo<SearchResult[]>(() => {
		if (!query.trim()) return [];
		const q = query.toLowerCase();
		return allResults.filter((r) => {
			if (typeFilter && r.type !== typeFilter) return false;
			return (
				r.title.toLowerCase().includes(q) ||
				(r.subtitle?.toLowerCase().includes(q) ?? false)
			);
		});
	}, [allResults, query, typeFilter]);

	const grouped = useMemo(() => {
		const groups = new Map<string, SearchResult[]>();
		for (const r of filteredResults) {
			if (!groups.has(r.type)) groups.set(r.type, []);
			groups.get(r.type)!.push(r);
		}
		return groups;
	}, [filteredResults]);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			setDropdownOpen(false);
			setQuery("");
			inputRef.current?.blur();
			const href = buildSearchResultHref(result);
			if (result.archived) {
				enter({
					boardId: result.boardId ?? "",
					swimlaneId: result.swimlaneId,
					entityType: result.type,
					entityId: result.id,
				});
			}
			router.push(href);
		},
		[enter, router],
	);

	// Also used in mobile CommandDialog
	const handleMobileSelect = useCallback(
		(result: SearchResult) => {
			setMobileOpen(false);
			const href = buildSearchResultHref(result);
			if (result.archived) {
				enter({
					boardId: result.boardId ?? "",
					swimlaneId: result.swimlaneId,
					entityType: result.type,
					entityId: result.id,
				});
			}
			router.push(href);
		},
		[enter, router],
	);

	const showDropdown = dropdownOpen;

	return (
		<>
			{/* ── Mobile: icon button → CommandDialog ── */}
			<button
				type="button"
				className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/95 shadow-xs md:hidden"
				onClick={() => setMobileOpen(true)}
				aria-label="Open search"
			>
				<Search className="h-4 w-4 text-muted-foreground" />
			</button>

			{/* ── Desktop: inline search input + dropdown ── */}
			<div
				ref={containerRef}
				className={cn("relative hidden md:block", className)}
			>
				{searchContextActive && (
					<div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
						<span className="truncate">Search filter: {searchContextLabel}</span>
						<button
							type="button"
							onClick={clearContextFilters}
							className="rounded border border-amber-300 px-1.5 py-0.5 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
						>
							Reset
						</button>
					</div>
				)}

				{/* Trigger input */}
				<div
					className={cn(
						"flex h-8 items-center gap-2 rounded-full border bg-background/95 px-3 shadow-xs transition-colors",
						showDropdown
							? "border-ring/60 ring-2 ring-ring/20"
							: "border-border/60 hover:border-border",
					)}
				>
					<Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					{/* Resource-type filter chip */}
					{typeFilter && (
						<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/80 pl-2 pr-1 py-0.5 text-[11px]">
							<span className="text-muted-foreground">type:</span>
							<span className="font-medium text-primary">
								{GROUP_LABELS[typeFilter]}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setTypeFilter(null);
								}}
								aria-label="Remove type filter"
								className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
							>
								<X className="h-2.5 w-2.5" />
							</button>
						</span>
					)}
					<input
						ref={inputRef}
						type="text"
						placeholder="Search..."
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setDropdownOpen(true);
						}}
						onFocus={() => setDropdownOpen(true)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setDropdownOpen(false);
								setQuery("");
								inputRef.current?.blur();
							}
						}}
						className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
					/>
					<kbd className="pointer-events-none ml-auto shrink-0 rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						⌘K
					</kbd>
				</div>

				{/* Inline dropdown */}
				{showDropdown && (
					<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
						{/* Archive filter pills */}
						<div className="flex items-center gap-1.5 border-b px-3 py-2">
							<button
								type="button"
								onClick={() => {
									setIncludeArchived((p) => !p);
									setOnlyArchived(false);
								}}
								className={cn(
									"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
									includeArchived && !onlyArchived
										? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-200"
										: "border-border text-muted-foreground hover:bg-muted",
								)}
							>
								<Archive className="h-2.5 w-2.5" />
								Include archived
							</button>
							<button
								type="button"
								onClick={() => {
									setOnlyArchived((p) => !p);
									setIncludeArchived(false);
								}}
								className={cn(
									"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
									onlyArchived
										? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-200"
										: "border-border text-muted-foreground hover:bg-muted",
								)}
							>
								<Archive className="h-2.5 w-2.5" />
								Only archived
							</button>
						</div>

						{/* Results */}
						<div className="max-h-72 overflow-y-auto">
							{!query.trim() ? (
								<p className="py-8 text-center text-xs text-muted-foreground">
									Start typing to search tasks, notes, habits…
								</p>
							) : filteredResults.length === 0 ? (
								<p className="py-8 text-center text-xs text-muted-foreground">
									No results for &ldquo;{query}&rdquo;
								</p>
							) : (
								Array.from(grouped.entries()).map(([type, items], idx) => (
									<div key={type}>
										{idx > 0 && (
											<div className="mx-3 my-0.5 h-px bg-border/50" />
										)}
										<div className="px-2 pb-1 pt-2">
											<p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
												{GROUP_LABELS[type] ?? type}
											</p>
											{items.map((item) => (
												<button
													key={`${item.type}-${item.id}`}
													type="button"
													onClick={() => handleSelect(item)}
													className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
												>
													<span className="shrink-0 text-muted-foreground">
														{TYPE_ICONS[item.type]}
													</span>
													<span className="min-w-0 flex-1 truncate text-left text-xs">
														{item.title}
													</span>
													{item.subtitle && (
														<span className="shrink-0 truncate text-[11px] text-muted-foreground/70 max-w-32">
															{item.subtitle}
														</span>
													)}
													{item.archived && (
														<span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
															<Archive className="h-2.5 w-2.5" />
															Archived
														</span>
													)}
												</button>
											))}
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>

			{/* ── Mobile CommandDialog ── */}
			<CommandDialog
				open={mobileOpen}
				onOpenChange={setMobileOpen}
				title="Search all resources"
			>
				<CommandInput placeholder="Search tasks, notes, habits, bookmarks..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					{Array.from(
						(() => {
							const groups = new Map<string, SearchResult[]>();
							for (const r of allResults) {
								if (!groups.has(r.type)) groups.set(r.type, []);
								groups.get(r.type)!.push(r);
							}
							return groups;
						})().entries(),
					).map(([type, items], idx) => (
						<div key={type}>
							{idx > 0 && <CommandSeparator />}
							<CommandGroup heading={GROUP_LABELS[type] ?? type}>
								{items.map((item) => (
									<CommandItem
										key={`${item.type}-${item.id}`}
										value={`${item.title} ${item.subtitle ?? ""} ${item.type}`}
										onSelect={() => handleMobileSelect(item)}
									>
										<span className="text-muted-foreground">
											{TYPE_ICONS[item.type]}
										</span>
										<span className="flex-1 truncate">{item.title}</span>
										{item.subtitle && (
											<span className="text-xs text-muted-foreground truncate max-w-40">
												{item.subtitle}
											</span>
										)}
										{item.archived && (
											<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
												<Archive className="h-2.5 w-2.5" />
												Archived
											</span>
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</div>
					))}
				</CommandList>
			</CommandDialog>
		</>
	);
}
