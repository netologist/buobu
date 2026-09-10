import type { ReactNode } from "react";

type AppLayoutMobileToggleButtonProps = {
  ariaLabel: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function AppLayoutMobileToggleButton({
  ariaLabel,
  active = false,
  onClick,
  children,
}: AppLayoutMobileToggleButtonProps) {
  return (
    <button
      type="button"
      className={[
        "flex items-center justify-center rounded-full border p-2 transition-colors md:hidden",
        active
          ? "border-border bg-muted text-foreground"
          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
