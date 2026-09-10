"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { VisionBoardItem } from "@/lib/types";
import { useThemeStore } from "@/stores/theme-store";
import "@excalidraw/excalidraw/index.css";

// ---------------------------------------------------------------------------
// Workaround: "Pica: cannot use getImageData on canvas" error.
//
// Pica (used by Excalidraw for image resizing) verifies that
// putImageData → getImageData round-trips pixel values faithfully.
// Browsers with fingerprinting-protection (Brave, Firefox
// privacy.resistFingerprinting, etc.) add noise to getImageData output,
// which makes pica's check fail and throws the error above.
//
// We fix this by keeping a shadow copy of every putImageData call and
// returning that copy from getImageData when the region matches exactly.
// This makes pica's verification pass while leaving all other canvas
// operations untouched.
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  const shadowDataMap = new WeakMap<
    CanvasRenderingContext2D,
    { x: number; y: number; data: ImageData }[]
  >();

  const origPutImageData = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (
    this: CanvasRenderingContext2D,
    imageData: ImageData,
    dx: number,
    dy: number,
    ...rest: unknown[]
  ) {
    // Store a clone so getImageData can return the exact same bytes
    let arr = shadowDataMap.get(this);
    if (!arr) {
      arr = [];
      shadowDataMap.set(this, arr);
    }
    const clone = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );
    arr.push({ x: dx, y: dy, data: clone });
    // Keep only the last few entries to avoid leaking memory
    if (arr.length > 16) arr.shift();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origPutImageData as any).call(this, imageData, dx, dy, ...rest);
  };

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (
    this: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    ...rest: unknown[]
  ) {
    // Check if this matches a previous putImageData region exactly
    const arr = shadowDataMap.get(this);
    if (arr) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const entry = arr[i];
        if (
          entry.x === sx &&
          entry.y === sy &&
          entry.data.width === sw &&
          entry.data.height === sh
        ) {
          // Return our pristine copy so pica's verification passes
          return new ImageData(
            new Uint8ClampedArray(entry.data.data),
            sw,
            sh,
          );
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origGetImageData as any).call(this, sx, sy, sw, sh, ...rest);
  };
}

interface ExcalidrawEditorProps {
  item: VisionBoardItem | null;
  isCreating: boolean;
  onSave: (data: Partial<VisionBoardItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onArchive?: (id: string) => void;
  swimlaneName?: string;
}

export default function ExcalidrawEditor({
  item,
  isCreating,
  onSave,
  onDelete,
  onArchive,
  swimlaneName,
}: ExcalidrawEditorProps) {
  if (!item && !isCreating) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select a whiteboard or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <ExcalidrawEditorContent
      key={item?.id ?? (isCreating ? "new-whiteboard" : "empty-whiteboard")}
      item={item}
      isCreating={isCreating}
      onSave={onSave}
      onDelete={onDelete}
      onArchive={onArchive}
      swimlaneName={swimlaneName}
    />
  );
}

function ExcalidrawEditorContent({
  item,
  isCreating,
  onSave,
  onDelete,
  onArchive,
  swimlaneName,
}: ExcalidrawEditorProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [title, setTitle] = useState(item?.title ?? "");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Parse initial Excalidraw data (elements + appState + files)
  const initialData = (() => {
    if (item?.excalidrawData) {
      try {
        const parsed = JSON.parse(item.excalidrawData);
        return {
          elements: parsed.elements ?? [],
          appState: parsed.appState ?? {},
          files: parsed.files ?? undefined,
        };
      } catch {
        return undefined;
      }
    }
    return undefined;
  })();

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // Skip initial load change
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }

      // Debounced auto-save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const data = JSON.stringify({
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files: files ?? {},
        });
        void onSave({
          id: item?.id,
          title: title || "Untitled",
          excalidrawData: data,
        });
      }, 1500);
    },
    [item?.id, title, onSave]
  );

  const handleTitleBlur = useCallback(() => {
    if (!item?.id && !isCreating) return;
    void onSave({
      id: item?.id,
      title: title || "Untitled",
      excalidrawData: item?.excalidrawData,
    });
  }, [item?.id, item?.excalidrawData, isCreating, title, onSave]);

  return (
    <div className="flex h-full flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <input
          className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
          placeholder="Untitled whiteboard..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleTitleBlur();
            }
          }}
        />
        {swimlaneName && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {swimlaneName}
          </span>
        )}
        {onArchive && item?.id && (
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => onArchive(item.id)}
            title="Archive"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-2-3H6L4 7m16 0v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7m16 0H4m8 4v6m-3-3l3 3 3-3"
              />
            </svg>
          </button>
        )}
        {onDelete && item?.id && (
          <button
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void onDelete(item.id)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1">
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          theme={resolvedTheme}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
            },
          }}
        />
      </div>
    </div>
  );
}
