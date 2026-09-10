"use client";

import { Lock, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useNavVisibilityStore } from "@/stores/nav-visibility-store";
import {
	useDefaultCurrencyStore,
	CURRENCY_OPTIONS,
} from "@/stores/default-currency-store";
import { APP_NAV_ITEMS } from "@/lib/navigation/app-nav-items";
import {
	ALWAYS_VISIBLE_APP_IDS,
	canHideTaskView,
	getTaskViews,
} from "@/lib/navigation/nav-visibility";

/**
 * Lets the user hide/show top-level apps and individual task views.
 * Hiding is visibility-only (data is never deleted). At least one task view
 * must always remain visible; the last one's toggle is disabled and the
 * store refuses to hide it as a safety net.
 */
export function WorkspaceCustomizationPanel() {
	const hiddenAppIds = useNavVisibilityStore((s) => s.hiddenAppIds);
	const hiddenTaskViewIds = useNavVisibilityStore((s) => s.hiddenTaskViewIds);
	const setAppHidden = useNavVisibilityStore((s) => s.setAppHidden);
	const setTaskViewHidden = useNavVisibilityStore((s) => s.setTaskViewHidden);
	const reset = useNavVisibilityStore((s) => s.reset);
	const defaultCurrency = useDefaultCurrencyStore((s) => s.currency);
	const setDefaultCurrency = useDefaultCurrencyStore((s) => s.setCurrency);

	const taskViews = getTaskViews();
	const allowHideTaskView = canHideTaskView(hiddenTaskViewIds);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-base font-semibold">Workspace</h2>
				<p className="text-sm text-muted-foreground">
					Choose which apps and task views appear in your navigation. Hidden
					items keep their data — they are just out of your way.
				</p>
			</div>

			{/* Apps */}
			<div className="space-y-3">
				<h3 className="text-sm font-medium">Apps</h3>
				<div className="divide-y rounded-lg border">
					{APP_NAV_ITEMS.map((app) => {
						const alwaysOn = ALWAYS_VISIBLE_APP_IDS.has(app.id);
						const hidden = !alwaysOn && hiddenAppIds.includes(app.id);
						const Icon = app.icon;
						return (
							<div
								key={app.id}
								className="flex items-center justify-between gap-3 p-3"
							>
								<div className="flex items-center gap-2.5">
									<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="text-sm">{app.label}</span>
									{alwaysOn && (
										<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
											<Lock className="h-3 w-3" /> Always on
										</span>
									)}
								</div>
								<Switch
									checked={!hidden}
									disabled={alwaysOn}
									onCheckedChange={(checked) => setAppHidden(app.id, !checked)}
									aria-label={`Show ${app.label}`}
								/>
							</div>
						);
					})}
				</div>
			</div>

			{/* Task views */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium">Task views</h3>
					<span className="text-[11px] text-muted-foreground">
						At least one stays on
					</span>
				</div>
				<div className="divide-y rounded-lg border">
					{taskViews.map((view) => {
						const hidden = hiddenTaskViewIds.includes(view.id);
						const Icon = view.icon;
						const disabled = !hidden && !allowHideTaskView;
						return (
							<div
								key={view.id}
								className="flex items-center justify-between gap-3 p-3"
							>
								<div className="flex items-center gap-2.5">
									<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="text-sm">{view.label}</span>
								</div>
								<Switch
									checked={!hidden}
									disabled={disabled}
									onCheckedChange={(checked) =>
										setTaskViewHidden(view.id, !checked)
									}
									aria-label={`Show ${view.label}`}
								/>
							</div>
						);
					})}
				</div>
			</div>

			{/* Default Currency */}
			<div className="space-y-3">
				<h3 className="text-sm font-medium">Default Currency</h3>
				<p className="text-xs text-muted-foreground">
					Currency pre-selected when you create a new lane.
				</p>
				<div className="max-w-[200px]">
					<Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CURRENCY_OPTIONS.map((c) => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex justify-end">
				<Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
					<RotateCcw className="h-3.5 w-3.5" />
					Reset to defaults
				</Button>
			</div>
		</div>
	);
}
