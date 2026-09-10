import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type EditorToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: ReactNode;
  disabled?: boolean;
};

export default function EditorToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled,
}: EditorToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${isActive ? "bg-muted text-foreground" : "text-muted-foreground"}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
    >
      {children}
    </Button>
  );
}
