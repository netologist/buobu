import { useEffect, useState } from "react";

export function AppHeaderStorageIndicator() {
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;

    const refresh = () =>
      navigator.storage.estimate().then(({ usage = 0, quota = 0 }) =>
        setStorage({ usage, quota }),
      );

    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!storage) return null;

  const percent = storage.quota > 0 ? storage.usage / storage.quota : 0;
  const usageMB = (storage.usage / 1024 / 1024).toFixed(1);
  const quotaGB = (storage.quota / 1024 / 1024 / 1024).toFixed(2);
  const quotaMB = (storage.quota / 1024 / 1024).toFixed(0);
  const quotaLabel = storage.quota >= 1024 * 1024 * 1024 ? `${quotaGB} GB` : `${quotaMB} MB`;

  const color = percent > 0.9 ? "#EF4444" : percent > 0.7 ? "#F59E0B" : "#10B981";

  const r = 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(percent, 1);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-border/60 bg-background/95 shadow-xs"
        title={`Storage: ${usageMB} MB / ${quotaLabel}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
          <circle
            cx="9"
            cy="9"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth="3"
          />
          <circle
            cx="9"
            cy="9"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {isHovered && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-border/60 bg-popover px-3 py-2.5 text-xs shadow-md">
          <p className="mb-1.5 font-medium text-foreground">Local Storage</p>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Usage</span>
              <span className="font-medium text-foreground">{usageMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-medium text-foreground">{quotaLabel}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percent * 100, 100)}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-right text-[10px] text-muted-foreground/70">
              {(percent * 100).toFixed(1)}% used
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
