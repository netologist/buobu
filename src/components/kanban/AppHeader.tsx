"use client";

import Link from "next/link";

import { useState, useCallback, useEffect } from "react";
import {
	Archive,
	FileDown,
	FileUp,
	Layers,
	LogOut,
	Settings,
	KeyRound,
	Sparkles,
	UserCog,
	UserRound,
	PanelLeftClose,
	PanelLeftOpen,
} from "lucide-react";

import { AppHeaderStorageIndicator } from "@/components/kanban/AppHeaderStorageIndicator";
import { useEntitlements } from "@/stores/entitlements-store";
import {
	BILLING_ENABLED,
	HOME_PAGE_ENABLED,
	LOCAL_MODE,
	STORAGE_INDICATOR_ENABLED,
} from "@/lib/feature-flags";
import { AppHeaderSyncStatusIndicator } from "@/components/kanban/AppHeaderSyncStatusIndicator";
import { AppHeaderThemeToggle } from "@/components/kanban/AppHeaderThemeToggle";

import { AppLogo } from "@/components/ui/app-logo";
import { GlobalSearchPalette } from "@/components/ui/global-search-palette";
import { Switch } from "@/components/ui/switch";
import { useArchiveFilterStore } from "@/stores/archive-filter-store";
import { Button } from "@/components/ui/button";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useDbStore } from "@/stores/db-store";
import { useSyncStore } from "@/stores/sync-store";
import { useSwimlaneSelectionDerived } from "@/stores/swimlane-selection-store";
import { getSwimlaneById } from "@/lib/db";
import { useBoardStore } from "@/stores/board-store";
import { BoardModal } from "@/components/ui/board-modal";
import { SwimlaneDialog } from "@/components/ui/swimlane-dialog";
import type { Swimlane } from "@/lib/types";
import { getSyncSummary } from "@/lib/formatters/syncFormatter";
import { cn } from "@/lib/utils";
import { ExportModal } from "@/components/import-export/ExportModal";
import { ImportModal } from "@/components/import-export/ImportModal";
import {
	AccountSettingsModal,
	type SettingsTab,
} from "@/components/auth/AccountSettingsModal";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppsBarStore } from "@/stores/apps-bar-store";

export function AppHeader({
	actions,
	children,

	mobileMiddlePanelToggle,
	onMobileMiddlePanelToggle,
}: {
	actions?: React.ReactNode;
	children?: React.ReactNode;
	boardName?: string;
	mobileMiddlePanelToggle?: React.ReactNode;
	onMobileMiddlePanelToggle?: () => void;
}) {
	const { isOpen: isAppsBarOpen, toggle: toggleAppsBar } = useAppsBarStore();
	const { user, isAuthenticated, logout, isLoading } = useAuthContext();
	const db = useDbStore((s) => s.db);

	const { primaryBoardId, selectedSwimlaneIds, isAllSelected } =
		useSwimlaneSelectionDerived();
	const singleSelectedSwimlaneId =
		selectedSwimlaneIds.size === 1 ? [...selectedSwimlaneIds][0] : null;

	const allBoards = useBoardStore((s) => s.boards);
	const allSwimlanes = useBoardStore((s) => s.swimlanes);

	const mobileContextLabel = (() => {
		if (singleSelectedSwimlaneId) {
			const sw = allSwimlanes.find((s) => s.id === singleSelectedSwimlaneId);
			if (sw) return sw.name;
		}
		if (primaryBoardId) {
			const board = allBoards.find((b) => b.id === primaryBoardId);
			if (board) return board.name;
		}
		if (isAllSelected) return "All Boards";
		return "Workspace";
	})();

	const [showExportModal, setShowExportModal] = useState(false);
	const [showImportModal, setShowImportModal] = useState(false);
	const [showAccountSettings, setShowAccountSettings] = useState(false);
	const [accountSettingsTab, setAccountSettingsTab] =
		useState<SettingsTab>("profile");
	const [showBoardSettings, setShowBoardSettings] = useState(false);
	const [swimlaneSettingsOpen, setSwimlaneSettingsOpen] = useState(false);
	const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
	const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>(
		undefined,
	);

	const handleOpenSwimlaneSettings = useCallback(async () => {
		if (!singleSelectedSwimlaneId) return;
		const swimlane = await getSwimlaneById(singleSelectedSwimlaneId);
		if (swimlane) {
			setEditingSwimlane(swimlane);
			setSwimlaneSettingsOpen(true);
		}
	}, [singleSelectedSwimlaneId]);
	const syncStatus = useSyncStore((s) => s.status);
	const syncLastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
	const syncErrorMessage = useSyncStore((s) => s.errorMessage);
	const setOffline = useSyncStore((s) => s.setOffline);
	const setOnline = useSyncStore((s) => s.setOnline);
	const showArchivedItems = useArchiveFilterStore((s) => s.showArchivedItems);
	const setShowArchivedItems = useArchiveFilterStore(
		(s) => s.setShowArchivedItems,
	);
	const isArchivedLocked = useArchiveFilterStore((s) => s.isLockedBySelection);

	const { isPlus } = useEntitlements();
	const showPlusBadge = BILLING_ENABLED && isPlus;
	const homeHref = isAuthenticated && HOME_PAGE_ENABLED ? "/home" : "/";

	const handleAvatarUpdated = useCallback((url: string) => {
		setLocalAvatarUrl(url);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleOnline = () => setOnline();
		const handleOffline = () => setOffline();

		if (window.navigator.onLine) {
			setOnline();
		} else {
			setOffline();
		}

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [setOffline, setOnline]);

	const displayAvatarUrl = localAvatarUrl ?? user?.avatarUrl;
	const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";
	const syncSummary = getSyncSummary(
		syncStatus,
		syncLastSyncedAt,
		syncErrorMessage,
	);

	return (
		<div className="border-b bg-muted/40">
			<div className="w-full py-0">
				<div className="md:hidden">
					<div className="flex h-[50px] items-center justify-between gap-3 px-4">
						<div className="flex min-w-0 items-center gap-1.5">
							{mobileMiddlePanelToggle}
							{/* Swimlane / board name — tap to open drawer */}
							<button
								type="button"
								onClick={onMobileMiddlePanelToggle}
								className="min-w-0 max-w-[160px] truncate text-sm font-semibold leading-none text-foreground"
								title={mobileContextLabel}
							>
								{mobileContextLabel}
							</button>
						</div>

						<div className="flex shrink-0 items-center gap-1.5">
							{isAuthenticated && !isLoading && (
								<>
									<GlobalSearchPalette />
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className={cn(
													"h-8 w-8 rounded-full",
													LOCAL_MODE
														? "border border-border/60 bg-background/95 shadow-xs"
														: "p-0",
												)}
												title={LOCAL_MODE ? "Settings" : user?.email}
											>
												{LOCAL_MODE ? (
													<UserRound className="h-4 w-4 text-muted-foreground" />
												) : (
													<div className="relative">
														<Avatar
															className={cn(
																"h-8 w-8",
																showPlusBadge &&
																	"ring-2 ring-amber-400 ring-offset-1 ring-offset-background dark:ring-amber-500",
															)}
														>
															{displayAvatarUrl && (
																<AvatarImage
																	src={displayAvatarUrl}
																	alt="Avatar"
																/>
															)}
															<AvatarFallback className="text-xs">
																{initials}
															</AvatarFallback>
														</Avatar>
														{showPlusBadge && (
															<span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-background dark:bg-amber-500">
																<Sparkles className="h-2 w-2 text-white" />
															</span>
														)}
													</div>
												)}
											</Button>
										</DropdownMenuTrigger>

										<DropdownMenuContent align="end" className="w-56">
											<DropdownMenuLabel className="font-normal">
												<div className="flex items-center gap-2">
													{LOCAL_MODE ? (
														<UserRound className="h-8 w-8 shrink-0 rounded-full border border-border/60 p-1.5 text-muted-foreground" />
													) : (
														<Avatar className="h-8 w-8 shrink-0">
															{displayAvatarUrl && (
																<AvatarImage
																	src={displayAvatarUrl}
																	alt="Avatar"
																/>
															)}
															<AvatarFallback className="text-xs">
																{initials}
															</AvatarFallback>
														</Avatar>
													)}
													<div className="min-w-0">
														<div className="flex items-center gap-1.5">
															<p className="truncate text-sm font-medium leading-none">
																{LOCAL_MODE ? "Local Mode" : user?.email}
															</p>
															{showPlusBadge && (
																<span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
																	<Sparkles className="h-2 w-2" />
																	Plus
																</span>
															)}
														</div>
														<p className="mt-0.5 text-xs text-muted-foreground">
															{syncSummary}
														</p>
													</div>
												</div>
											</DropdownMenuLabel>

											<DropdownMenuSeparator />

											{!LOCAL_MODE && (
												<DropdownMenuItem
													onSelect={() => {
														setAccountSettingsTab("profile");
														setShowAccountSettings(true);
													}}
												>
													<UserCog className="mr-2 h-4 w-4" />
													Account Settings
												</DropdownMenuItem>
											)}
											{!LOCAL_MODE && (
												<DropdownMenuItem
													onSelect={() => {
														setAccountSettingsTab("mcp");
														setShowAccountSettings(true);
													}}
												>
													<KeyRound className="mr-2 h-4 w-4" />
													MCP Settings
												</DropdownMenuItem>
											)}

											<DropdownMenuSeparator />

											{primaryBoardId && (
												<DropdownMenuItem
													onSelect={() => setShowBoardSettings(true)}
												>
													<Settings className="mr-2 h-4 w-4" />
													Board Settings
												</DropdownMenuItem>
											)}
											{singleSelectedSwimlaneId && (
												<DropdownMenuItem
													onSelect={() => {
														void handleOpenSwimlaneSettings();
													}}
												>
													<Layers className="mr-2 h-4 w-4" />
													Swimlane Settings
												</DropdownMenuItem>
											)}

											<DropdownMenuSeparator />

											<DropdownMenuItem asChild>
												<Link href="/archive">
													<Archive className="mr-2 h-4 w-4" />
													Archive
												</Link>
											</DropdownMenuItem>

											<DropdownMenuSeparator />

											<DropdownMenuItem
												onSelect={() => setShowExportModal(true)}
												disabled={!db}
											>
												<FileDown className="mr-2 h-4 w-4" />
												Export Data
											</DropdownMenuItem>
											<DropdownMenuItem
												onSelect={() => setShowImportModal(true)}
												disabled={!db}
											>
												<FileUp className="mr-2 h-4 w-4" />
												Import Data
											</DropdownMenuItem>

											<DropdownMenuSeparator />

											{!LOCAL_MODE && (
												<DropdownMenuItem
													onSelect={() => logout()}
													className="text-destructive focus:text-destructive"
												>
													<LogOut className="mr-2 h-4 w-4" />
													Log out
												</DropdownMenuItem>
											)}

											<div className="px-2 py-1.5 text-[10px] text-muted-foreground/50 font-mono tracking-tight select-none">
												v.{process.env.NEXT_PUBLIC_BUILD_VERSION || "unknown"} ·{" "}
												{process.env.NEXT_PUBLIC_BUILD_TIME
													? new Date(
															process.env.NEXT_PUBLIC_BUILD_TIME,
														).toLocaleDateString("en-GB")
													: "N/A"}
											</div>
										</DropdownMenuContent>
									</DropdownMenu>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="relative hidden md:flex h-[50px] items-center px-1">
					{/* Left: toggle + logo — absolutely positioned so center is true */}
					{/* Left: logo icon (hover → toggle) + wordmark text */}
					<div className="flex shrink-0 items-center gap-1.5 z-10">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={toggleAppsBar}
										aria-label={
											isAppsBarOpen ? "Collapse apps bar" : "Expand apps bar"
										}
										className="group relative flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent"
									>
										{/* App logo icon — visible by default, fades out on hover */}
										<span className="transition-opacity duration-150 group-hover:opacity-0">
											<AppLogo
												size="sm"
												variant="color"
												wordmark={false}
												isBeta={false}
											/>
										</span>
										{/* Panel toggle icon — hidden by default, fades in on hover */}
										<span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 text-muted-foreground pl-2">
											{isAppsBarOpen ? (
												<PanelLeftClose className="h-5 w-5" />
											) : (
												<PanelLeftOpen className="h-5 w-5" />
											)}
										</span>
									</button>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									{isAppsBarOpen ? "Collapse sidebar" : "Expand sidebar"}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						{/* Wordmark — link to home */}
						<Link
							href={homeHref}
							className="select-none text-[34px] font-bold leading-none pt-1 pl-2"
							style={{
								fontFamily: "var(--font-comfortaa), Comfortaa, cursive",
							}}
						>
							<span style={{ color: "#3A3A42" }}>b</span>
							<span style={{ color: "#4A4A52" }}>u</span>
							<span style={{ color: "#5A616E" }}>o</span>
							<span style={{ color: "#6B7A8D" }}>b</span>
							<span style={{ color: "#7B8BA0" }}>u</span>
						</Link>
					</div>

					{/* Center: search — absolute so it's always page-center regardless of side widths */}
					{isAuthenticated && !isLoading && (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<div className="pointer-events-auto w-full max-w-xl px-4">
								<GlobalSearchPalette className="w-full" />
							</div>
						</div>
					)}

					{/* Right: controls — ml-auto pushes to the right */}
					<div className="relative z-10 ml-auto flex shrink-0 items-center gap-1.5">
						{actions}
						{isAuthenticated && !isLoading && (
							<>
								<div
									className={cn(
										"flex items-center gap-1.5 rounded-full border bg-background/95 px-2.5 py-1 shadow-xs",
										isArchivedLocked
											? "border-amber-300 dark:border-amber-700"
											: "border-border/60",
									)}
									title={
										isArchivedLocked
											? "Archived mode \u2014 selected board/swimlane is archived"
											: showArchivedItems
												? "Hide archived items"
												: "Show archived items"
									}
								>
									<Archive
										className={cn(
											"h-3.5 w-3.5 shrink-0",
											isArchivedLocked
												? "text-amber-600 dark:text-amber-400"
												: "text-muted-foreground",
										)}
									/>
									<Switch
										checked={showArchivedItems}
										onCheckedChange={
											isArchivedLocked ? undefined : setShowArchivedItems
										}
										disabled={isArchivedLocked}
										className="data-[state=checked]:bg-amber-500 disabled:opacity-100"
									/>
								</div>
								<AppHeaderSyncStatusIndicator
									onExportRequest={() => setShowExportModal(true)}
								/>
								{STORAGE_INDICATOR_ENABLED && <AppHeaderStorageIndicator />}
								<AppHeaderThemeToggle />
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className={cn(
												"h-8 w-8 rounded-full",
												LOCAL_MODE
													? "border border-border/60 bg-background/95 shadow-xs"
													: "p-0",
											)}
											title={LOCAL_MODE ? "Settings" : user?.email}
										>
											{LOCAL_MODE ? (
												<UserRound className="h-4 w-4 text-muted-foreground" />
											) : (
												<div className="relative">
													<Avatar
														className={cn(
															"h-8 w-8",
															showPlusBadge &&
																"ring-2 ring-amber-400 ring-offset-1 ring-offset-background dark:ring-amber-500",
														)}
													>
														{displayAvatarUrl && (
															<AvatarImage src={displayAvatarUrl} alt="Avatar" />
														)}
														<AvatarFallback className="text-xs">
															{initials}
														</AvatarFallback>
													</Avatar>
													{showPlusBadge && (
														<span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 ring-2 ring-background dark:bg-amber-500">
															<Sparkles className="h-2 w-2 text-white" />
														</span>
													)}
												</div>
											)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuLabel className="font-normal">
											<div className="flex items-center gap-2">
												{LOCAL_MODE ? (
													<UserRound className="h-8 w-8 shrink-0 rounded-full border border-border/60 p-1.5 text-muted-foreground" />
												) : (
													<Avatar className="h-8 w-8 shrink-0">
														{displayAvatarUrl && (
															<AvatarImage src={displayAvatarUrl} alt="Avatar" />
														)}
														<AvatarFallback className="text-xs">
															{initials}
														</AvatarFallback>
													</Avatar>
												)}
												<div className="min-w-0">
													<div className="flex items-center gap-1.5">
														<p className="truncate text-sm font-medium leading-none">
															{LOCAL_MODE ? "Local Mode" : user?.email}
														</p>
														{showPlusBadge && (
															<span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
																<Sparkles className="h-2 w-2" /> Plus
															</span>
														)}
													</div>
													<p className="mt-0.5 text-xs text-muted-foreground">
														{syncSummary}
													</p>
												</div>
											</div>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{!LOCAL_MODE && (
											<DropdownMenuItem
												onSelect={() => {
													setAccountSettingsTab("profile");
													setShowAccountSettings(true);
												}}
											>
												<UserCog className="mr-2 h-4 w-4" /> Account Settings
											</DropdownMenuItem>
										)}
										{!LOCAL_MODE && (
											<DropdownMenuItem
												onSelect={() => {
													setAccountSettingsTab("mcp");
													setShowAccountSettings(true);
												}}
											>
												<KeyRound className="mr-2 h-4 w-4" /> MCP Settings
											</DropdownMenuItem>
										)}
										<DropdownMenuSeparator />
										{primaryBoardId && (
											<DropdownMenuItem
												onSelect={() => setShowBoardSettings(true)}
											>
												<Settings className="mr-2 h-4 w-4" /> Board Settings
											</DropdownMenuItem>
										)}
										{singleSelectedSwimlaneId && (
											<DropdownMenuItem
												onSelect={() => {
													void handleOpenSwimlaneSettings();
												}}
											>
												<Layers className="mr-2 h-4 w-4" /> Swimlane Settings
											</DropdownMenuItem>
										)}
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link href="/archive">
												<Archive className="mr-2 h-4 w-4" /> Archive
											</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onSelect={() => setShowExportModal(true)}
											disabled={!db}
										>
											<FileDown className="mr-2 h-4 w-4" /> Export Data
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => setShowImportModal(true)}
											disabled={!db}
										>
											<FileUp className="mr-2 h-4 w-4" /> Import Data
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{!LOCAL_MODE && (
											<DropdownMenuItem
												onSelect={() => logout()}
												className="text-destructive focus:text-destructive"
											>
												<LogOut className="mr-2 h-4 w-4" /> Log out
											</DropdownMenuItem>
										)}
										<div className="px-2 py-1.5 text-[10px] text-muted-foreground/50 font-mono tracking-tight select-none">
											v.{process.env.NEXT_PUBLIC_BUILD_VERSION || "unknown"}{" "}
											\u00b7{" "}
											{process.env.NEXT_PUBLIC_BUILD_TIME
												? new Date(
														process.env.NEXT_PUBLIC_BUILD_TIME,
													).toLocaleDateString("en-GB")
												: "N/A"}
										</div>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						)}
					</div>
				</div>

				{children && (
					<div className="mt-2 flex flex-wrap items-center gap-2 px-4 md:px-0">
						{children}
					</div>
				)}
			</div>

			<ExportModal
				open={showExportModal}
				onOpenChange={setShowExportModal}
				db={db}
			/>
			<ImportModal
				open={showImportModal}
				onOpenChange={setShowImportModal}
				db={db}
			/>
			<AccountSettingsModal
				open={showAccountSettings}
				onOpenChange={setShowAccountSettings}
				user={user}
				onAvatarUpdated={handleAvatarUpdated}
				initialTab={accountSettingsTab}
			/>
			<BoardModal
				open={showBoardSettings}
				onOpenChange={setShowBoardSettings}
				boardId={primaryBoardId}
			/>
			<SwimlaneDialog
				open={swimlaneSettingsOpen}
				onOpenChange={(open) => {
					if (!open) {
						setSwimlaneSettingsOpen(false);
						setEditingSwimlane(null);
					}
				}}
				swimlane={editingSwimlane}
				boardId={primaryBoardId ?? undefined}
				onSave={async (data) => {
					if (editingSwimlane?.id) {
						const { putSwimlane } = await import("@/lib/db");
						await putSwimlane({ ...editingSwimlane, ...data });
						setEditingSwimlane({ ...editingSwimlane, ...data } as Swimlane);
					}
					setSwimlaneSettingsOpen(false);
				}}
			/>
		</div>
	);
}
