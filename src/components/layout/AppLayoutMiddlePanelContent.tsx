import type { ComponentProps, ReactNode } from "react";

import { CompactNavigation } from "@/components/layout/CompactNavigation";
import { cn } from "@/lib/utils";

type AppLayoutMiddlePanelContentProps = {
  isArchiveView: boolean;
  compactNavigationProps: ComponentProps<typeof CompactNavigation>;
  compactNavigationWrapperClassName?: string;
  middlePanel: ReactNode;
};

export function AppLayoutMiddlePanelContent({
  isArchiveView,
  compactNavigationProps,
  compactNavigationWrapperClassName,
  middlePanel,
}: AppLayoutMiddlePanelContentProps) {
  return (
    <>
      <div className={compactNavigationWrapperClassName ?? "shrink-0 border-b"}>
        <CompactNavigation {...compactNavigationProps} />
      </div>
      <div
        data-compact-mode="true"
        className={cn(
          "group/middle-panel flex min-h-0 flex-1 flex-col",
          "[&>*:first-child]:hidden",
          isArchiveView && "pointer-events-none opacity-80",
        )}
      >
        {middlePanel}
      </div>
    </>
  );
}
