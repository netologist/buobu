import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ResizableImageView from "./resizable-image-view";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          // Check for width attribute first
          const width = element.getAttribute("width");
          if (width) return width;
          
          // Also check inline styles
          const style = element.getAttribute("style");
          if (style) {
            const match = style.match(/width:\s*([^;]+)/);
            if (match) return match[1].trim();
          }
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          // Check for height attribute first
          const height = element.getAttribute("height");
          if (height) return height;
          
          // Also check inline styles
          const style = element.getAttribute("style");
          if (style) {
            const match = style.match(/height:\s*([^;]+)/);
            if (match) return match[1].trim();
          }
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
