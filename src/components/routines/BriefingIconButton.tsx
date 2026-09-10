import type { ReactNode } from "react";

type BriefingIconButtonProps = {
  children: ReactNode;
  title: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
};

export function BriefingIconButton({
  children,
  title,
  disabled,
  className = "",
  onClick,
}: BriefingIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
