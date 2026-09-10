"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	getVisibleApps,
	resolveTaskHref,
} from "@/lib/navigation/nav-visibility";
import { useAppsBarStore } from "@/stores/apps-bar-store";
import { useNavVisibilityStore } from "@/stores/nav-visibility-store";

function isActive(pathname: string, prefixes: string[]): boolean {
	return prefixes.some((p) => pathname.startsWith(p));
}

export function AppsBar() {
	const { isOpen } = useAppsBarStore();
	const hiddenAppIds = useNavVisibilityStore((s) => s.hiddenAppIds);
	const hiddenTaskViewIds = useNavVisibilityStore((s) => s.hiddenTaskViewIds);
	const pathname = usePathname();
	const appsBarTooltipClassName =
		"rounded-md border border-border bg-accent/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-[1px] [&>svg]:fill-accent";

	return (
		<TooltipProvider delayDuration={300}>
			<nav
				aria-label="Apps"
				className={cn(
					"hidden md:flex flex-col shrink-0 border-r bg-muted/30 overflow-hidden transition-all duration-200 h-full",
					isOpen ? "w-[50px]" : "w-0",
				)}
			>
				<div className="flex flex-col gap-1 px-1 pt-2 flex-1 overflow-y-auto">
					{getVisibleApps(hiddenAppIds).map((item) => {
						const active = isActive(pathname, item.matchPrefixes);
						const Icon = item.icon;
						const itemHref =
							item.id === "tasks"
								? resolveTaskHref(item.href, hiddenTaskViewIds)
								: item.href;
						return (
							<div key={item.id}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Link
											href={itemHref}
											aria-label={item.label}
											aria-current={active ? "page" : undefined}
											className={cn(
												"flex h-10 w-full items-center justify-center rounded-md transition-colors",
												active
													? "bg-primary/10 text-foreground"
													: "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
											)}
										>
											<Icon
												className={cn(
													"h-6 w-6 shrink-0",
													active && "stroke-[2.2]",
												)}
											/>
											<span className="sr-only">{item.label}</span>
										</Link>
									</TooltipTrigger>
									<TooltipContent
										side="right"
										sideOffset={8}
										className={appsBarTooltipClassName}
									>
										{item.label}
									</TooltipContent>
								</Tooltip>

								{/* Sub-items — only shown when parent is active */}
								{active && item.subItems && (
									<div className="mt-0.5 flex flex-col gap-0.5 pb-1">
										{item.subItems
											?.filter((sub) => !hiddenTaskViewIds.includes(sub.id))
											.map((sub) => {
												const subActive = isActive(pathname, sub.matchPrefixes);
												const SubIcon = sub.icon;
												return (
													<Tooltip key={sub.id}>
														<TooltipTrigger asChild>
															<Link
																href={sub.href}
																aria-label={sub.label}
																aria-current={subActive ? "page" : undefined}
																className={cn(
																	"flex h-8 w-full items-center justify-center rounded-md transition-colors",
																	subActive
																		? "bg-primary/5 text-primary"
																		: "text-muted-foreground/60 hover:bg-primary/5 hover:text-foreground",
																)}
															>
																<SubIcon
																	className={cn(
																		"h-4 w-4 shrink-0",
																		subActive && "stroke-[2.2]",
																	)}
																/>
																<span className="sr-only">{sub.label}</span>
															</Link>
														</TooltipTrigger>
														<TooltipContent
															side="right"
															sideOffset={8}
															className={appsBarTooltipClassName}
														>
															{sub.label}
														</TooltipContent>
													</Tooltip>
												);
											})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</nav>
		</TooltipProvider>
	);
}
