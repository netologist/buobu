import { cn } from '@/lib/utils';

const faviconSizes = {
  32: { px: 32, radius: 8 },
  16: { px: 16, radius: 4 },
} as const;

export type FaviconSize = keyof typeof faviconSizes;

export interface AppFaviconProps {
  size?: FaviconSize;
  className?: string;
}

export function AppFavicon({ size = 32, className }: AppFaviconProps) {
  const { px, radius } = faviconSizes[size];
  const sq = Math.round(px * (34 / 52));
  const off = Math.round(px * (18 / 52));
  const rx = Math.round(px * (9 / 52));

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: px, height: px }}>
      <svg
        viewBox={`0 0 ${px} ${px}`}
        xmlns="http://www.w3.org/2000/svg"
        width={px}
        height={px}
        aria-hidden="true"
        style={{ borderRadius: radius, display: 'block' }}
      >
        <rect x={0} y={0} width={sq} height={sq} rx={rx} fill="#0F172A" />
        <rect x={off} y={off} width={sq} height={sq} rx={rx} fill="#6366F1" opacity="0.9" />
      </svg>
    </div>
  );
}
