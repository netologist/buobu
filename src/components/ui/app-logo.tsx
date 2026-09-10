import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
export type LogoVariant = "mono" | "color";
export type Orientation = "vertical" | "horizontal";

const layoutSizes: Record<
  LogoSize,
  {
    textClass: string;
    gapClass: string;
    whaleWidth: number;
    whaleHeight: number;
    whaleTop: number;
    whaleLeft: number;
    iconOffsetY: number;
    badgeClass: string;
    iconWidth: number;
    iconHeight: number;
  }
> = {
  lg: {
    textClass: "text-[52px]",
    gapClass: "gap-3",
    whaleWidth: 48,
    whaleHeight: 48,
    whaleTop: -52,
    whaleLeft: 0,
    iconOffsetY: -4,
    badgeClass: "left-8 top-4 text-[6px] tracking-wide px-0.5 py-0",
    iconWidth: 48,
    iconHeight: 48,
  },
  md: {
    textClass: "text-[42px]",
    gapClass: "gap-2",
    whaleWidth: 40,
    whaleHeight: 40,
    whaleTop: -44,
    whaleLeft: 0,
    iconOffsetY: -6,
    badgeClass: "left-6 top-3 text-[9px] tracking-normal px-1 py-0.5",
    iconWidth: 40,
    iconHeight: 40,
  },
  sm: {
    // textClass: "text-[32px]",
    textClass: "text-[38px]",
    gapClass: "gap-2.5",
    whaleWidth: 32,
    whaleHeight: 32,
    whaleTop: -36,
    whaleLeft: 0,
    iconOffsetY: -3,
    badgeClass: "left-5.5 top-2.5 text-[6px] tracking-tight px-0.5 py-0",
    iconWidth: 32,
    iconHeight: 32,
  },
};

const letterColorsMono = [
  "color-mix(in oklab, var(--foreground) 84%, var(--background))",
  "color-mix(in oklab, var(--foreground) 76%, var(--background))",
  "color-mix(in oklab, var(--foreground) 66%, var(--background))",
  "color-mix(in oklab, var(--foreground) 56%, var(--background))",
  "color-mix(in oklab, var(--foreground) 47%, var(--background))",
];

const letterColorsColor = [
  "#3A3A42",
  "#4A4A52",
  "#5A616E",
  "#6B7A8D",
  "#7B8BA0",
];



interface AppLogoProps {
  size?: LogoSize;
  /** "mono" (default) — zinc grayscale for app-wide use.
   *  "color" — indigo palette for landing/auth pages. */
  variant?: LogoVariant;
  /** Icon orientation (default: "vertical") */
  orientation?: Orientation;
  className?: string;
  /** Show wordmark (default: true) */
  wordmark?: boolean;
  /** Show beta badge (default: true) */
  isBeta?: boolean;
}

export function AppLogo({
  size = "md",
  variant = "mono",
  orientation = "vertical",
  className,
  wordmark = true,
  isBeta = true,
}: AppLogoProps) {
  const currentSize = layoutSizes[size];
  const isHorizontal = orientation === "horizontal";
  const isColor = variant === "color";
  const letterColors = isColor ? letterColorsColor : letterColorsMono;
  const sq1Color = letterColors[0];
  const sq2Color = letterColors[4];

  const badgeBg = isColor
    ? "#5A616E"
    : "color-mix(in oklab, var(--muted) 82%, var(--background))";
  const badgeText = isColor ? "#F8FAFC" : "var(--foreground)";

  const icon = (
    <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0" y="0" width="34" height="34" rx="9" fill={sq1Color} />
      <rect x="18" y="18" width="34" height="34" rx="9" fill={sq2Color} opacity="0.9" />
    </svg>
  );

  return (
    <div
      className={cn(
        "inline-flex",
        isHorizontal ? "items-center" : "items-end",
        currentSize.gapClass,
        className
      )}
    >
      {wordmark ? (
        <div
          className={cn(
            "relative inline-flex gap-3.5",
            isHorizontal ? "items-center" : "items-end"
          )}
        >
          {isHorizontal && (
            <span
              className="inline-flex shrink-0 items-center justify-center"
              style={{
                width: currentSize.whaleWidth,
                height: currentSize.whaleHeight,
                transform: `translateY(${currentSize.iconOffsetY}px)`,
              }}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          {isHorizontal && isBeta && (
            <span
              className={cn(
                "absolute z-10 font-semibold leading-none rounded-sm",
                currentSize.badgeClass
              )}
              style={{ background: badgeBg, color: badgeText }}
            >
              beta
          </span>)}

          <span
            className={cn("font-bold leading-none whitespace-nowrap", currentSize.textClass)}
            style={{
              fontFamily: "var(--font-comfortaa), Comfortaa, cursive",
            }}
          >
            <span className="relative inline-block">
              {!isHorizontal && (
                <span
                  className="absolute pointer-events-none"
                  style={{
                    top: currentSize.whaleTop,
                    left: currentSize.whaleLeft,
                    width: currentSize.whaleWidth,
                    height: currentSize.whaleHeight,
                  }}
                >
                  {icon}
                </span>
              )}
              <span style={{ color: letterColors[0] }}>b</span>
              <span style={{ color: letterColors[1] }}>u</span>
              <span style={{ color: letterColors[2] }}>o</span>
            </span>
            <span style={{ color: letterColors[3] }}>b</span>
            <span style={{ color: letterColors[4] }}>u</span>
          </span>

          {!isHorizontal && isBeta && (
            <span
              className={cn(
                "absolute z-10 right-12 -top-11 font-semibold leading-none rounded-sm",
                currentSize.badgeClass
              )}
              style={{ background: badgeBg, color: badgeText }}
            >
              beta
            </span>
          )}
        </div>
      ) : (
        <span
          className="inline-flex shrink-0 mt-2 ml-2"
          style={{ width: currentSize.iconWidth, height: currentSize.iconHeight }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
    </div>
  );
}

export { AppFavicon } from "./AppFavicon";
