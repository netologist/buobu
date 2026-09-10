"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useCallback, useRef } from "react";

export default function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const { src, alt, title, width, height } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: string;
    height?: string;
  };
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      const img = imageRef.current;
      if (!img) return;

      startPosRef.current = {
        x: clientX,
        y: clientY,
        width: img.offsetWidth,
        height: img.offsetHeight,
      };

      setIsResizing(true);

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const moveX =
          "touches" in moveEvent
            ? moveEvent.touches[0].clientX
            : (moveEvent as MouseEvent).clientX;
        const deltaX = moveX - startPosRef.current.x;

        // Maintain aspect ratio
        const aspectRatio =
          startPosRef.current.width / startPosRef.current.height;
        const newWidth = Math.max(50, startPosRef.current.width + deltaX);
        const newHeight = Math.round(newWidth / aspectRatio);

        updateAttributes({
          width: `${newWidth}px`,
          height: `${newHeight}px`,
        });
      };

      const handleEnd = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      className={`resizable-image-wrapper ${selected ? "selected" : ""}`}
      style={{
        display: "inline-block",
        position: "relative",
        maxWidth: "100%",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt || ""}
        title={title}
        style={{
          width: width || "auto",
          height: height || "auto",
          maxWidth: "100%",
          display: "block",
          cursor: isResizing ? "nwse-resize" : "default",
        }}
        className="rounded-lg"
        draggable={false}
      />
      {selected && (
        <>
          {/* Resize handle - bottom right */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 12,
              height: 12,
              backgroundColor: "var(--primary)",
              border: "2px solid var(--background)",
              borderRadius: "50%",
              cursor: "nwse-resize",
              zIndex: 10,
              boxShadow: "0 1px 3px color-mix(in oklab, var(--foreground) 20%, transparent)",
            }}
          />
          {/* Selection border */}
          <div
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              border: "2px solid var(--primary)",
              borderRadius: "6px",
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </NodeViewWrapper>
  );
}
