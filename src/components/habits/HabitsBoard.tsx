"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileFab } from "@/components/layout/MobileFab";
import { useBoardBase } from "@/hooks/useBoardBase";
import {
	useHabitLogs,
	useHabitLogsSubscription,
	useHabits,
	useHabitsSubscription,
} from "@/stores";
import { useTimeblocksSubscription } from "@/stores/hooks/use-timeblocks";
import { useDbStore } from "@/stores/db-store";
import { nanoid } from "nanoid";
import habitsSeed from "@/data/habits.json";
import type { Habit, HabitLog, Swimlane } from "@/lib/types";
import { seedHabitsSchema } from "@/lib/validation/seedData";
import { deleteHabit, putHabit, putHabitLog } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SwimlaneDialog } from "@/components/ui/swimlane-dialog";
import { HabitCalendarGrid } from "@/components/habits/HabitCalendarGrid";
import { HabitCalendarHeader } from "@/components/habits/HabitCalendarHeader";
import { HabitChainDialog } from "@/components/habits/HabitChainDialog";
import { HabitFormDialog } from "@/components/habits/HabitFormDialog";
import { HabitSidebarLaneCard } from "@/components/habits/HabitSidebarLaneCard";
import { useSyncedScrollPanels } from "@/hooks/useSyncedScrollPanels";
import { getWeekendBackground } from "@/lib/habits/colorUtils";
import { addDays, formatDateKey } from "@/lib/habits/dateUtils";
import { buildHabitChainData } from "@/lib/habits/stats";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LONG_PRESS_DELAY_MS, STORAGE_KEYS } from "@/lib/constants";
import { useSwimlaneSelectionStore } from "@/stores/swimlane-selection-store";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import { useEntitlements } from "@/stores/entitlements-store";
import { PLAN_LIMITS } from "@/lib/subscriptions";

const seedHabits = seedHabitsSchema.parse(habitsSeed);
const dayOptions = [
	{ label: "Mon", value: 1 },
	{ label: "Tue", value: 2 },
	{ label: "Wed", value: 3 },
	{ label: "Thu", value: 4 },
	{ label: "Fri", value: 5 },
	{ label: "Sat", value: 6 },
	{ label: "Sun", value: 0 },
];
const ALL_DAYS = dayOptions.map((day) => day.value);

export function HabitsBoard() {
	const db = useDbStore((s) => s.db);
	const selectBoard = useSwimlaneSelectionStore((s) => s.selectBoard);
	useHabitsSubscription();
	useHabitLogsSubscription();
	useTimeblocksSubscription();
	const searchParams = useSearchParams();
	const swimlaneParam =
		searchParams.get("swimlane") ?? searchParams.get("swimlaneId");
	const habitIdParam = searchParams.get("habitId");
	const boardIdParam = searchParams.get("boardId");
	const isSearchContext = searchParams.get("_gs") === "1";
	const highlightedHabitId = isSearchContext ? habitIdParam : null;
	const highlightedSwimlaneId = isSearchContext ? swimlaneParam : null;

	const subscribedHabits = useHabits();
	const subscribedHabitLogs = useHabitLogs();

	const [habits, setHabits] = useState<Habit[]>([]);
	const { guard, blocked, dismissDialog } = useUpgradeGuard();
	const { isPlus } = useEntitlements();
	const {
		boards,
		swimlanes,
		activeBoards,
		activeSwimlanes,
		filteredSwimlanes,
		board,
		isAllSelected,
		labels: namingLabels,
		selectedSwimlaneIds,
		isArchivedSelectionMode,
		putSwimlane: storePutSwimlane,
		deleteSwimlane: storeDeleteSwimlane,
		filteredItems: selectionFilteredHabits,
		archivedSwimlaneIdSet,
	} = useBoardBase<Habit>({ items: habits });
	const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog[]>>({});
	const [swimlaneFilter, setSwimlaneFilter] = useState(swimlaneParam ?? "all");
	const [rangeAnchor, setRangeAnchor] = useState(() =>
		new Date().toISOString(),
	);
	const [addingSwimlaneId, setAddingSwimlaneId] = useState<string | null>(null);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
	const [isChainDialogOpen, setIsChainDialogOpen] = useState(false);
	const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
	const longPressTimer = useRef<NodeJS.Timeout | null>(null);
	const [isLongPress, setIsLongPress] = useState(false);
	const [hoveredCell, setHoveredCell] = useState<{
		habitId: string;
		dateKey: string;
	} | null>(null);
	const [clickedPreview, setClickedPreview] = useState<Record<string, number>>(
		{},
	);
	const [disablePreview, setDisablePreview] = useState<string | null>(null);

	// Responsive day count: fewer columns on mobile
	const [windowWidth, setWindowWidth] = useState(
		typeof window !== "undefined" ? window.innerWidth : 1024,
	);
	useEffect(() => {
		const onResize = () => setWindowWidth(window.innerWidth);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	const SHOW_DAYS = windowWidth < 640 ? 7 : windowWidth < 768 ? 10 : 19;

	const seededBoardsRef = useRef<Set<string>>(new Set());
	const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
	const [addingSwimlaneToBoard, setAddingSwimlaneToBoard] = useState<
		string | null
	>(null);
	const [deletingSwimlaneId, setDeletingSwimlaneId] = useState<string | null>(
		null,
	);
	const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

	const effectiveWeekStartDay = useMemo(() => {
		if (isAllSelected) return 1;
		return board?.weekStart ?? 1;
	}, [board?.weekStart, isAllSelected]);

	const rangeAnchorDate = useMemo(() => new Date(rangeAnchor), [rangeAnchor]);

	const timeRange = useMemo(() => {
		const end = new Date(rangeAnchorDate);
		end.setHours(0, 0, 0, 0);
		const start = addDays(end, SHOW_DAYS * -1);
		return { start, end: addDays(end, 1) };
	}, [rangeAnchorDate, SHOW_DAYS]);

	const dateColumns = useMemo(() => {
		const dates: Date[] = [];
		const cursor = new Date(timeRange.start);
		while (cursor < timeRange.end) {
			dates.push(new Date(cursor));
			cursor.setDate(cursor.getDate() + 1);
		}
		return dates;
	}, [timeRange]);

	const dateKeys = useMemo(() => dateColumns.map(formatDateKey), [dateColumns]);
	const todayKey = formatDateKey(new Date());

	const canGoPrev = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const minDate = addDays(today, -365 + SHOW_DAYS); // Limit to 1 year in the past
		const anchor = new Date(rangeAnchorDate);
		anchor.setHours(0, 0, 0, 0);
		return anchor > minDate;
	}, [rangeAnchorDate, SHOW_DAYS]);

	const canGoNext = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const anchor = new Date(rangeAnchorDate);
		anchor.setHours(0, 0, 0, 0);
		return anchor < today;
	}, [rangeAnchorDate]);

	useEffect(() => {
		let savedSwimlaneFilter: string | null = null;
		if (typeof window !== "undefined") {
			try {
				const savedFilters = localStorage.getItem(STORAGE_KEYS.HABITS_FILTERS);
				if (savedFilters) {
					const filters = JSON.parse(savedFilters);
					savedSwimlaneFilter = filters.swimlaneFilter;
				}
			} catch (error) {
				console.error("Failed to load filter preferences:", error);
			}
		}
		if (savedSwimlaneFilter) {
			setSwimlaneFilter(savedSwimlaneFilter);
		} else if (swimlaneParam) {
			setSwimlaneFilter(swimlaneParam);
		} else {
			setSwimlaneFilter("all");
		}
	}, [swimlaneParam]);

	useEffect(() => {
		if (boardIdParam) {
			selectBoard(boardIdParam);
		}
	}, [boardIdParam, selectBoard]);

	const handleAddSwimlane = useCallback(
		async (boardId: string, data: Partial<Swimlane>) => {
			await storePutSwimlane({ ...data, boardId });
		},
		[storePutSwimlane],
	);

	const handleEditSwimlane = useCallback(
		async (swimlane: Swimlane) => {
			await storePutSwimlane(swimlane);
		},
		[storePutSwimlane],
	);

	const handleDeleteSwimlane = useCallback(
		async (swimlaneId: string) => {
			await storeDeleteSwimlane(swimlaneId);
		},
		[storeDeleteSwimlane],
	);

	useEffect(() => {
		if (!board?.id) return;
		if (isAllSelected) {
			setHabits(subscribedHabits);
			return;
		}

		const boardHabits = subscribedHabits.filter(
			(habit) => habit.boardId === board.id,
		);
		if (boardHabits.length === 0) {
			const seed = seedHabits.filter((habit) => habit.boardId === board.id);
			if (seed.length > 0 && !seededBoardsRef.current.has(board.id)) {
				seededBoardsRef.current.add(board.id);
				void Promise.all(seed.map((habit) => putHabit(habit)));
			}
		} else {
			seededBoardsRef.current.add(board.id);
		}
		setHabits(boardHabits);
	}, [board?.id, isAllSelected, subscribedHabits]);

	useEffect(() => {
		// Clear clicked preview and disable preview when date range changes
		setClickedPreview({});
		setDisablePreview(null);
	}, [rangeAnchor]);

	useEffect(() => {
		if (!habitIdParam) return;
		const target = subscribedHabits.find((habit) => habit.id === habitIdParam);
		if (target) {
			setSelectedHabit(target);
			setIsChainDialogOpen(true);
		}
	}, [habitIdParam, subscribedHabits]);

	useEffect(() => {
		if (habits.length === 0) {
			setHabitLogs({});
			return;
		}
		const habitIds = new Set(habits.map((habit) => habit.id));
		const grouped = subscribedHabitLogs.reduce<Record<string, HabitLog[]>>(
			(acc, log) => {
				if (!habitIds.has(log.habitId)) return acc;
				const existing = acc[log.habitId] ?? [];
				existing.push(log);
				acc[log.habitId] = existing;
				return acc;
			},
			{},
		);
		setHabitLogs(grouped);
	}, [habits, subscribedHabitLogs]);

	const habitLogMap = useMemo(() => {
		const map: Record<string, Record<string, HabitLog>> = {};
		Object.entries(habitLogs).forEach(([habitId, logs]) => {
			map[habitId] = logs.reduce<Record<string, HabitLog>>((acc, log) => {
				acc[log.date] = log;
				return acc;
			}, {});
		});
		return map;
	}, [habitLogs]);

	const visibleSwimlanes = useMemo(() => {
		if (swimlaneFilter === "all") return filteredSwimlanes;
		return filteredSwimlanes.filter((lane) => lane.id === swimlaneFilter);
	}, [filteredSwimlanes, swimlaneFilter]);

	const habitsBySwimlane = useMemo(() => {
		const map: Record<string, Habit[]> = {};
		selectionFilteredHabits.forEach((habit) => {
			if (!map[habit.swimlaneId]) {
				map[habit.swimlaneId] = [];
			}
			map[habit.swimlaneId].push(habit);
		});
		Object.values(map).forEach((list) => {
			list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		});
		return map;
	}, [selectionFilteredHabits]);

	const visibleHabits = useMemo(() => {
		const list = visibleSwimlanes.flatMap(
			(lane) => habitsBySwimlane[lane.id] ?? [],
		);
		if (isArchivedSelectionMode) return list.filter((h) => h.archived === true);
		return list.filter((h) => !h.archived);
	}, [visibleSwimlanes, habitsBySwimlane, isArchivedSelectionMode]);

	const countsBySwimlane = useMemo(() => {
		const map: Record<string, number> = {};
		for (const h of habits) {
			const inArchivedSwimlane = archivedSwimlaneIdSet.has(h.swimlaneId);
			if (
				inArchivedSwimlane
					? h.archived === true
					: isArchivedSelectionMode
						? h.archived === true
						: !h.archived
			) {
				map[h.swimlaneId] = (map[h.swimlaneId] || 0) + 1;
			}
		}
		return map;
	}, [habits, isArchivedSelectionMode, archivedSwimlaneIdSet]);

	const {
		middlePanelRef,
		rightPanelRef,
		handleMiddleScroll,
		handleRightScroll: handleMainScroll,
	} = useSyncedScrollPanels({
		deps: [visibleSwimlanes, habits, habitLogs],
	});

	const dailyCompleted = useMemo(() => {
		return dateKeys.map((key) => {
			let count = 0;
			visibleHabits.forEach((habit) => {
				const value = habitLogMap[habit.id]?.[key]?.value ?? 0;
				if (value > 0) count += 1;
			});
			return count;
		});
	}, [dateKeys, visibleHabits, habitLogMap]);

	const chainData = useMemo(() => {
		if (!selectedHabit) return null;
		return buildHabitChainData(
			selectedHabit,
			habitLogs[selectedHabit.id] ?? [],
			effectiveWeekStartDay,
			ALL_DAYS,
		);
	}, [selectedHabit, habitLogs, effectiveWeekStartDay]);

	const isTimeblockOwnedHabit = useCallback(
		(habit: Habit) => habit.sourceType === "timeblock",
		[],
	);

	const setHabitValue = useCallback(
		async (habit: Habit, dateKey: string, date: Date, value: number) => {
			const current = habitLogMap[habit.id]?.[dateKey];
			const now = new Date().toISOString();
			const log: HabitLog = current
				? { ...current, value, updatedAt: now }
				: {
						id: nanoid(),
						habitId: habit.id,
						date: dateKey,
						value,
						createdAt: now,
						updatedAt: now,
					};
			setHabitLogs((prev) => {
				const list = prev[habit.id] ?? [];
				const next = current
					? list.map((item) => (item.id === log.id ? log : item))
					: [...list, log];
				return { ...prev, [habit.id]: next };
			});
			try {
				await putHabitLog(log);
			} catch (error) {
				console.error("Failed to save habit log", error);
			}
		},
		[habitLogMap],
	);

	const toggleHabitValue = useCallback(
		async (habit: Habit, dateKey: string, date: Date) => {
			if (isLongPress) {
				setIsLongPress(false);
				return;
			}

			// Clear stale long-press preview state so the real value drives the UI
			const cellKey = `${habit.id}-${dateKey}`;
			setClickedPreview((prev) => {
				if (!(cellKey in prev)) return prev;
				const next = { ...prev };
				delete next[cellKey];
				return next;
			});
			setDisablePreview((prev) => (prev === cellKey ? null : prev));

			const frequencyDays = habit.frequencyDays ?? ALL_DAYS;
			const scheduled = frequencyDays.includes(date.getDay());
			const current = habitLogMap[habit.id]?.[dateKey];
			const currentValue = current ? current.value : scheduled ? 0 : -1;

			// Skip is -1, so we only cycle through 0, 1, 2, 3
			let nextValue: number;
			if (currentValue < 0) {
				// Currently skipped, go to unmark
				nextValue = 0;
			} else {
				// Cycle: 0 → 1 → 2 → 3 → 0
				nextValue =
					currentValue === 0
						? 1
						: currentValue === 1
							? 2
							: currentValue === 2
								? 3
								: 0;
			}

			await setHabitValue(habit, dateKey, date, nextValue);
		},
		[habitLogMap, isLongPress, setHabitValue],
	);

	const handleMouseDown = useCallback(
		(habit: Habit, dateKey: string, date: Date) => {
			const cellKey = `${habit.id}-${dateKey}`;
			longPressTimer.current = setTimeout(() => {
				setIsLongPress(true);
				// Immediately show skip state in preview
				setClickedPreview((prev) => ({ ...prev, [cellKey]: -1 }));
				// Disable preview until mouse leaves
				setDisablePreview(cellKey);
				// Then trigger the actual update
				void setHabitValue(habit, dateKey, date, -1); // Skip
			}, LONG_PRESS_DELAY_MS);
		},
		[setHabitValue],
	);

	const handleMouseUp = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const submitNewHabit = useCallback(
		async (
			swimlane: Swimlane,
			values: {
				title: string;
				isBreak: boolean;
				archived: boolean;
				days: number[];
				timeblockId?: string | null;
			},
		) => {
			if (!board) return;
			const activeCount = habits.filter((h) => !h.archived).length;
			if (!guard("habits", activeCount)) return;
			const existing = habitsBySwimlane[swimlane.id] ?? [];
			const nextOrder = existing.length
				? Math.max(...existing.map((h) => h.order ?? 0)) + 1
				: 1;
			const now = new Date().toISOString();
			const habit: Habit = {
				id: nanoid(),
				boardId: board.id,
				swimlaneId: swimlane.id,
				title: values.title,
				color: swimlane.color ?? "#22C55E",
				order: nextOrder,
				breakHabit: values.isBreak,
				archived: values.archived,
				frequencyDays: values.days,
				timeblockId: values.timeblockId ?? null,
				createdAt: now,
				updatedAt: now,
			};
			setHabits((prev) => [...prev, habit]);
			setIsAddDialogOpen(false);
			setAddingSwimlaneId(null);
			try {
				await putHabit(habit);
			} catch (error) {
				console.error("Failed to save habit", error);
			}
		},
		[board, guard, habits, habitsBySwimlane],
	);

	const openAddHabitDialog = useCallback((swimlaneId: string) => {
		setAddingSwimlaneId(swimlaneId);
		setIsAddDialogOpen(true);
	}, []);

	const openChainDialog = useCallback((habit: Habit) => {
		setSelectedHabit(habit);
		setIsChainDialogOpen(true);
	}, []);

	const openEditDialog = useCallback(
		(habit: Habit) => {
			if (isTimeblockOwnedHabit(habit)) {
				window.alert(
					"This habit is managed by Time Blocks. Edit it from the Time Blocks page.",
				);
				return;
			}
			setEditingHabit(habit);
		},
		[isTimeblockOwnedHabit],
	);

	const submitEditHabit = useCallback(
		async (values: {
			title: string;
			isBreak: boolean;
			archived: boolean;
			days: number[];
			timeblockId?: string | null;
		}) => {
			if (!editingHabit) return;
			if (isTimeblockOwnedHabit(editingHabit)) return;
			const now = new Date().toISOString();
			const updated: Habit = {
				...editingHabit,
				title: values.title,
				breakHabit: values.isBreak,
				archived: values.archived,
				frequencyDays: values.days,
				timeblockId: values.timeblockId ?? null,
				updatedAt: now,
			};
			setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
			setEditingHabit(null);
			try {
				await putHabit(updated);
			} catch (error) {
				console.error("Failed to update habit", error);
			}
		},
		[editingHabit, isTimeblockOwnedHabit],
	);

	const handleArchiveHabit = useCallback(
		async (habit: Habit) => {
			if (isTimeblockOwnedHabit(habit)) {
				window.alert(
					"This habit is managed by Time Blocks. Archive it from the Time Blocks page.",
				);
				return;
			}
			setHabits((prev) => prev.filter((item) => item.id !== habit.id));
			if (editingHabit?.id === habit.id) {
				setEditingHabit(null);
			}
			try {
				await putHabit({
					...habit,
					archived: true,
					archivedAt: new Date().toISOString(),
				});
			} catch (error) {
				console.error("Failed to archive habit", error);
			}
		},
		[editingHabit?.id, isTimeblockOwnedHabit],
	);

	const handleDeleteHabit = useCallback(
		async (habit: Habit) => {
			if (isTimeblockOwnedHabit(habit)) {
				window.alert(
					"This habit is managed by Time Blocks. Delete it from the Time Blocks page.",
				);
				return;
			}
			if (editingHabit?.id === habit.id) {
				setEditingHabit(null);
			}
			setDeletingHabit(habit);
		},
		[editingHabit?.id, isTimeblockOwnedHabit],
	);

	const confirmDeleteHabit = useCallback(async () => {
		if (!deletingHabit) return;

		const habit = deletingHabit;
		setDeletingHabit(null);

		setHabits((prev) => prev.filter((item) => item.id !== habit.id));
		setHabitLogs((prev) => {
			const next = { ...prev };
			delete next[habit.id];
			return next;
		});

		if (editingHabit?.id === habit.id) {
			setEditingHabit(null);
		}

		try {
			await deleteHabit(habit.id);
		} catch (error) {
			console.error("Failed to delete habit", error);
		}
	}, [deletingHabit, editingHabit?.id]);
	if (!board) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				No board found.
			</div>
		);
	}

	const middlePanel = (
		<>
			<div className="shrink-0 border-b px-3 py-3 min-h-14">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
						{selectedSwimlaneIds.size === 0
							? (board?.name ?? "All Habits")
							: selectedSwimlaneIds.size === 1
								? (swimlanes.find((l) => selectedSwimlaneIds.has(l.id))?.name ??
									`Selected ${namingLabels.swimlane.toLowerCase()}`)
								: `${selectedSwimlaneIds.size} ${namingLabels.swimlanePlural}`}
					</span>
					<Badge variant="secondary" className="text-[10px]">
						{visibleSwimlanes.length}
					</Badge>
					{!isPlus && selectedSwimlaneIds.size === 0 && (
						<span className="text-[10px] tabular-nums text-muted-foreground">
							{habits.filter((h) => !h.archived).length} / {PLAN_LIMITS.habits}
						</span>
					)}
				</div>
			</div>
			<div
				ref={middlePanelRef}
				onScroll={handleMiddleScroll}
				className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
			>
				<div className="flex flex-col gap-4">
					{visibleSwimlanes.map((lane) => {
						const laneHabits = habitsBySwimlane[lane.id] ?? [];
						return (
							<HabitSidebarLaneCard
								key={lane.id}
								lane={lane}
								laneHabits={laneHabits}
								highlightedHabitId={highlightedHabitId}
								highlightedSwimlaneId={highlightedSwimlaneId}
								onOpenChainDialog={openChainDialog}
								onOpenEditDialog={openEditDialog}
								onArchiveHabit={handleArchiveHabit}
								onDeleteHabit={handleDeleteHabit}
								onOpenAddHabitDialog={openAddHabitDialog}
							/>
						);
					})}
					<div className="h-11 border-t pt-3" />
				</div>
			</div>
		</>
	);

	const isMobile = windowWidth < 640;
	const habitGridCols = isMobile
		? `28px repeat(${dateColumns.length}, minmax(22px, 1fr)) 28px`
		: `32px repeat(${dateColumns.length}, minmax(26px, 1fr)) 32px 48px 48px 48px`;

	const rightPanel = (
		<div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
			<HabitCalendarHeader
				dateColumns={dateColumns}
				todayKey={todayKey}
				gridTemplateColumns={habitGridCols}
				showStats={!isMobile}
				canGoPrev={canGoPrev}
				canGoNext={canGoNext}
				onPrev={() => {
					if (!canGoPrev) return;
					const anchor = new Date(rangeAnchorDate);
					anchor.setDate(anchor.getDate() - SHOW_DAYS);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const minDate = addDays(today, -365 + SHOW_DAYS);
					if (anchor < minDate) anchor.setTime(minDate.getTime());
					setRangeAnchor(anchor.toISOString());
				}}
				onNext={() => {
					const anchor = new Date(rangeAnchorDate);
					anchor.setDate(anchor.getDate() + SHOW_DAYS);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					if (anchor > today) anchor.setTime(today.getTime());
					setRangeAnchor(anchor.toISOString());
				}}
			/>
			<div
				ref={rightPanelRef}
				onScroll={handleMainScroll}
				className="flex-1 overflow-auto px-3 py-4"
			>
				<div className="flex flex-col gap-4">
					{visibleSwimlanes.map((lane) => {
						const laneHabits = habitsBySwimlane[lane.id] ?? [];
						return (
							<HabitCalendarGrid
								key={lane.id}
								lane={lane}
								laneHabits={laneHabits}
								allDays={ALL_DAYS}
								dateColumns={dateColumns}
								dateKeys={dateKeys}
								habitGridCols={habitGridCols}
								showStats={!isMobile}
								habitLogs={habitLogs}
								habitLogMap={habitLogMap}
								hoveredCell={hoveredCell}
								clickedPreview={clickedPreview}
								disablePreview={disablePreview}
								onToggleHabitValue={toggleHabitValue}
								onHandleMouseDown={handleMouseDown}
								onHandleMouseUp={handleMouseUp}
								onHandleMouseLeave={handleMouseLeave}
								onSetHoveredCell={setHoveredCell}
							/>
						);
					})}

					<div
						className="hidden md:grid grid-cols-(--habit-grid-cols) items-center gap-0 border-t pt-3 text-xs text-muted-foreground"
						style={{ "--habit-grid-cols": habitGridCols } as CSSProperties}
					>
						<div className="px-0 font-semibold">Total</div>
						{dailyCompleted.map((count, index) => {
							const weekendBg = getWeekendBackground(dateColumns[index]);
							return (
								<div
									key={`${dateKeys[index]}-total`}
									className="flex h-8 items-center justify-center border-l border-muted bg-(--weekend-bg)"
									style={
										weekendBg
											? ({ "--weekend-bg": weekendBg } as CSSProperties)
											: undefined
									}
								>
									{count}
								</div>
							);
						})}
						<div />
						<div />
						<div />
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<>
			<MobileFab
				aria-label="Add new habit"
				icon={
					<span className="text-2xl leading-none" aria-hidden>
						+
					</span>
				}
				onClick={() => {
					const lane = filteredSwimlanes[0];
					if (lane) openAddHabitDialog(lane.id);
				}}
			/>

			<AppLayout
				sidebarConfig={{
					boards: activeBoards,
					swimlanes: activeSwimlanes,
					allBoards: boards,
					allSwimlanes: swimlanes,
					swimlaneCounts: countsBySwimlane,
					allItemVisible: true,
					allItemLabel: "Habits",
					allItemCount: visibleHabits.length,
					isArchivedSelectionMode,
					onAddSwimlane: handleAddSwimlane,
					onEditSwimlane: handleEditSwimlane,
					onDeleteSwimlane: handleDeleteSwimlane,
					db,
				}}
				middlePanel={middlePanel}
				rightPanel={rightPanel}
				middlePanelClassName="w-72 overflow-hidden"
				rightPanelClassName="overflow-hidden bg-muted/30"
			/>

			<HabitFormDialog
				open={isAddDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsAddDialogOpen(false);
						setAddingSwimlaneId(null);
					}
				}}
				mode="add"
				weekStartDay={effectiveWeekStartDay}
				swimlaneId={addingSwimlaneId ?? undefined}
				onSave={(values) => {
					const lane = filteredSwimlanes.find(
						(item) => item.id === addingSwimlaneId,
					);
					if (lane) void submitNewHabit(lane, values);
				}}
			/>

			<HabitChainDialog
				open={isChainDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsChainDialogOpen(false);
						setSelectedHabit(null);
					}
				}}
				habit={selectedHabit}
				chainData={chainData}
			/>

			<HabitFormDialog
				open={!!editingHabit}
				onOpenChange={(open) => {
					if (!open) setEditingHabit(null);
				}}
				mode="edit"
				weekStartDay={effectiveWeekStartDay}
				swimlaneId={editingHabit?.swimlaneId}
				initialValues={
					editingHabit
						? {
								title: editingHabit.title,
								isBreak: editingHabit.breakHabit ?? false,
								archived: editingHabit.archived ?? false,
								days: editingHabit.frequencyDays ?? [],
								timeblockId: editingHabit.timeblockId ?? null,
							}
						: undefined
				}
				onSave={(values) => void submitEditHabit(values)}
				onDelete={
					editingHabit ? () => void handleDeleteHabit(editingHabit) : undefined
				}
			/>

			<SwimlaneDialog
				open={!!editingSwimlane || !!addingSwimlaneToBoard}
				onOpenChange={(open) => {
					if (!open) {
						setEditingSwimlane(null);
						setAddingSwimlaneToBoard(null);
					}
				}}
				swimlane={editingSwimlane}
				boardId={addingSwimlaneToBoard ?? editingSwimlane?.boardId}
				onSave={async (data) => {
					if (addingSwimlaneToBoard) {
						await handleAddSwimlane(addingSwimlaneToBoard, data);
						setAddingSwimlaneToBoard(null);
					} else if (editingSwimlane) {
						await handleEditSwimlane({ ...editingSwimlane, ...data });
						setEditingSwimlane(null);
					}
				}}
			/>

			<Dialog
				open={!!deletingSwimlaneId}
				onOpenChange={(open) => !open && setDeletingSwimlaneId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Swimlane</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this swimlane? This will also
							delete all associated habits and data.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeletingSwimlaneId(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (deletingSwimlaneId) {
									await handleDeleteSwimlane(deletingSwimlaneId);
									setDeletingSwimlaneId(null);
								}
							}}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmDialog
				open={!!deletingHabit}
				title="Delete habit"
				description={
					deletingHabit ? `Delete habit "${deletingHabit.title}"?` : undefined
				}
				confirmText="Delete"
				destructive
				onCancel={() => setDeletingHabit(null)}
				onConfirm={() => void confirmDeleteHabit()}
			/>
			{blocked && (
				<UpgradeDialog
					open
					onOpenChange={(open) => !open && dismissDialog()}
					feature={blocked.feature}
					current={blocked.current}
					limit={blocked.limit}
				/>
			)}
		</>
	);
}
