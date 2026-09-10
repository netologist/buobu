import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Brain } from "lucide-react";
import type { Dir } from "@/lib/mindmap/layoutUtils";

type Props = {
  visible: boolean;
  onDirection: (dir: Dir) => void;
  onCancel: () => void;
};

export function MindmapDirectionPicker({ visible, onDirection, onCancel }: Props) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col items-center gap-2 rounded-2xl border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-sm font-semibold text-foreground">Hangi yöne eklensin?</p>
        <div className="grid grid-cols-3 gap-2">
          <div />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onDirection("up")}
            title="Yukarı"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <div />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onDirection("left")}
            title="Sol"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40">
            <Brain className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onDirection("right")}
            title="Sağ"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onDirection("down")}
            title="Aşağı"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <div />
        </div>
        <button
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={onCancel}
        >
          İptal
        </button>
      </div>
    </div>
  );
}
