import type { Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Convert Tiptap JSON content → Markdown string
 */
export function editorJsonToMarkdown(editor: Editor): string {
  const json = editor.getJSON();
  return jsonToMarkdown(json);
}

function jsonToMarkdown(node: JSONContent, listDepth = 0): string {
  if (!node) return "";

  if (node.type === "text") {
    let text = node.text ?? "";
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case "bold":
            text = `**${text}**`;
            break;
          case "italic":
            text = `*${text}*`;
            break;
          case "strike":
            text = `~~${text}~~`;
            break;
          case "code":
            text = "`" + text + "`";
            break;
          case "link":
            text = `[${text}](${mark.attrs?.href ?? ""})`;
            break;
          case "highlight":
            if (mark.attrs?.color) {
              text = `<mark style="background-color: ${mark.attrs.color}">${text}</mark>`;
            } else {
              text = `==${text}==`;
            }
            break;
        }
      }
    }
    return text;
  }

  const children = node.content ?? [];
  const childText = () =>
    children.map((c) => jsonToMarkdown(c, listDepth)).join("");

  switch (node.type) {
    case "doc":
      return children.map((c) => jsonToMarkdown(c, listDepth)).join("\n\n");

    case "paragraph":
      return childText();

    case "heading": {
      const level = node.attrs?.level ?? 1;
      return `${"#".repeat(level)} ${childText()}`;
    }

    case "bulletList":
      return children.map((c) => jsonToMarkdown(c, listDepth)).join("\n");

    case "orderedList":
      return children
        .map((c, i) => {
          const indent = "  ".repeat(listDepth);
          const itemContent = jsonToMarkdown(c, listDepth).replace(/^- /, "");
          return `${indent}${i + 1}. ${itemContent}`;
        })
        .join("\n");

    case "listItem": {
      const indent = "  ".repeat(listDepth);
      const continueIndent = "  ".repeat(listDepth + 1);
      const parts = children.map((c) => {
        if (c.type === "bulletList" || c.type === "orderedList") {
          return jsonToMarkdown(c, listDepth + 1);
        }
        return jsonToMarkdown(c, listDepth);
      });
      const first = parts[0] ?? "";
      // Indent continuation lines so they stay associated with this list item
      // when parsed back by marked (necessary for hard breaks via Shift+Enter).
      const indentedFirst = first.replace(/\n/g, `\n${continueIndent}`);
      const rest = parts.slice(1).join("\n");
      return `${indent}- ${indentedFirst}${rest ? "\n" + rest : ""}`;
    }

    case "hardBreak":
      return "  \n";

    case "taskList":
      return children.map((c) => jsonToMarkdown(c, listDepth)).join("\n");

    case "taskItem": {
      const indent = "  ".repeat(listDepth);
      const continueIndent = "  ".repeat(listDepth + 1);
      const checked = node.attrs?.checked ? "x" : " ";
      const content = childText().replace(/\n/g, `\n${continueIndent}`);
      return `${indent}- [${checked}] ${content}`;
    }

    case "blockquote":
      return childText()
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");

    case "codeBlock": {
      const lang = node.attrs?.language ?? "";
      return "```" + lang + "\n" + childText() + "\n```";
    }

    case "mermaidBlock":
      return "```mermaid\n" + (node.attrs?.code ?? "") + "\n```";

    case "calloutBlock": {
      const type = String(node.attrs?.type ?? "note").toUpperCase();
      const body = children
        .map((c) => jsonToMarkdown(c, listDepth))
        .join("\n\n")
        .trimEnd();
      const lines = body ? [`[!${type}]`, ...body.split("\n")] : [`[!${type}]`];
      return lines.map((line) => `> ${line}`).join("\n");
    }

    case "horizontalRule":
      return "---";

    case "image": {
      const src = node.attrs?.src ?? "";
      const alt = node.attrs?.alt ?? "";
      const title = node.attrs?.title;
      const width = node.attrs?.width;
      const height = node.attrs?.height;

      // Use HTML img tag if width/height are specified
      if (width || height) {
        let imgTag = `<img src="${src}" alt="${alt}"`;
        if (title) imgTag += ` title="${title}"`;
        if (width) imgTag += ` width="${width}"`;
        if (height) imgTag += ` height="${height}"`;
        imgTag += " />";
        return imgTag;
      }

      // Standard markdown syntax
      return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
    }

    case "table": {
      const rows = children.filter((c) => c.type === "tableRow");
      if (rows.length === 0) return "";

      const tableRows: string[] = [];
      rows.forEach((row, rowIdx) => {
        const cells = (row.content ?? []).map((cell) => {
          const cellContent = (cell.content ?? [])
            .map((c) => jsonToMarkdown(c, listDepth))
            .join(" ");
          return cellContent || " ";
        });
        tableRows.push(`| ${cells.join(" | ")} |`);
        if (rowIdx === 0) {
          tableRows.push(`| ${cells.map(() => "---").join(" | ")} |`);
        }
      });
      return tableRows.join("\n");
    }

    case "tableRow":
    case "tableCell":
    case "tableHeader":
      return childText();

    case "wikiLink":
      return `[[${node.attrs?.title ?? ""}]]`;

    case "mathInline":
      return `$${node.attrs?.latex ?? childText()}$`;

    case "mathBlock":
      return `$$\n${node.attrs?.latex ?? childText()}\n$$`;

    case "math_display":
      return `$$\n${node.attrs?.latex ?? childText()}\n$$`;

    case "math_inline":
      return `$${node.attrs?.latex ?? childText()}$`;

    default:
      return childText();
  }
}

/**
 * Convert Markdown string → Tiptap-compatible HTML for loading
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "<p></p>";

  // Pre-process task list items before marked converts them to <input type="checkbox">,
  // which DOMPurify strips — causing checkboxes to render as plain bullets on reload.
  const taskItemChecked: boolean[] = [];
  let processed = markdown.replace(
    /^(\s*)- \[([ x])\] /gm,
    (_, indent: string, check: string) => {
      const idx = taskItemChecked.length;
      taskItemChecked.push(check.toLowerCase() === "x");
      return `${indent}- TSKCHK${idx}TSKEND `;
    },
  );

  // Pre-process wiki-links: [[Title]] → custom span
  // Escape the captured title before inserting into HTML attributes to prevent attribute injection.
  processed = processed.replace(
    /\[\[([^\]]+)\]\]/g,
    (_match, title: string) => {
      const safeAttr = title
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<span data-type="wiki-link" data-title="${safeAttr}">[[${safeAttr}]]</span>`;
    },
  );

  // Pre-process mermaid code blocks before passing to marked
  const mermaidBlocks: string[] = [];
  processed = processed.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, code) => {
      const idx = mermaidBlocks.length;
      mermaidBlocks.push(code.trim());
      return `%%MERMAID_PLACEHOLDER_${idx}%%`;
    },
  );

  // Pre-process highlight marks: ==text== → <mark>
  processed = processed.replace(/==(.*?)==/g, "<mark>$1</mark>");

  // Pre-process LaTeX blocks
  const latexBlocks: string[] = [];
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
    const idx = latexBlocks.length;
    latexBlocks.push(latex.trim());
    return `%%LATEX_BLOCK_${idx}%%`;
  });

  const latexInline: string[] = [];
  processed = processed.replace(
    /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g,
    (_match, latex) => {
      const idx = latexInline.length;
      latexInline.push(latex.trim());
      return `%%LATEX_INLINE_${idx}%%`;
    },
  );

  // Pre-process GitHub-style alerts
  const calloutBlocks: Array<{ type: string; content: string }> = [];
  processed = replaceCalloutBlocks(processed, calloutBlocks);

  // Pre-process empty paragraphs: the doc serializer encodes empty paragraphs
  // as extra blank lines (4+ consecutive newlines). Preserve them as placeholders
  // before marked collapses multiple blank lines into a single paragraph break.
  const emptyParaSections: number[] = [];
  processed = processed.replace(/\n{4,}/g, (match) => {
    const emptyCount = Math.floor((match.length - 2) / 2);
    emptyParaSections.push(emptyCount);
    const idx = emptyParaSections.length - 1;
    return `\n\n%%EMPTY_PARAS_${idx}%%\n\n`;
  });

  // Parse markdown using marked
  const rawHtml = marked.parse(processed, { async: false }) as string;

  // Post-process: restore empty paragraphs
  let html = rawHtml;
  emptyParaSections.forEach((count, idx) => {
    const emptyHtml = "<p></p>".repeat(count);
    html = html.replace(new RegExp(`<p>%%EMPTY_PARAS_${idx}%%</p>`), emptyHtml);
    html = html.replace(`%%EMPTY_PARAS_${idx}%%`, emptyHtml);
  });
  calloutBlocks.forEach(({ type, content }, idx) => {
    const calloutHtml = buildCalloutHtml(type, content);
    html = html.replace(
      new RegExp(`<p>%%CALLOUT_BLOCK_${idx}%%<\/p>`, "g"),
      calloutHtml,
    );
    html = html.replace(`%%CALLOUT_BLOCK_${idx}%%`, calloutHtml);
  });

  // Post-process: restore mermaid blocks
  mermaidBlocks.forEach((code, idx) => {
    html = html.replace(
      new RegExp(`<p>%%MERMAID_PLACEHOLDER_${idx}%%</p>`, "g"),
      `<div data-type="mermaid-block" data-code="${escapeAttr(code)}"><pre><code>${escapeHtml(code)}</code></pre></div>`,
    );
    html = html.replace(
      `%%MERMAID_PLACEHOLDER_${idx}%%`,
      `<div data-type="mermaid-block" data-code="${escapeAttr(code)}"><pre><code>${escapeHtml(code)}</code></pre></div>`,
    );
  });

  // Post-process: restore LaTeX blocks
  latexBlocks.forEach((latex, idx) => {
    html = html.replace(
      new RegExp(`<p>%%LATEX_BLOCK_${idx}%%</p>`, "g"),
      `<span data-type="math_display" data-latex="${escapeAttr(latex)}">$$${escapeHtml(latex)}$$</span>`,
    );
    html = html.replace(
      `%%LATEX_BLOCK_${idx}%%`,
      `<span data-type="math_display" data-latex="${escapeAttr(latex)}">$$${escapeHtml(latex)}$$</span>`,
    );
  });

  latexInline.forEach((latex, idx) => {
    html = html.replace(
      `%%LATEX_INLINE_${idx}%%`,
      `<span data-type="math_inline" data-latex="${escapeAttr(latex)}">$${escapeHtml(latex)}$</span>`,
    );
  });

  // Restore pre-processed task items with Tiptap-compatible attributes
  taskItemChecked.forEach((checked, idx) => {
    html = html.replace(
      new RegExp(`<li>\\s*TSKCHK${idx}TSKEND\\s*`),
      `<li data-type="taskItem" data-checked="${checked}">`,
    );
  });

  // Wrap <ul> containers of task items with data-type="taskList" so Tiptap
  // recognises them as a taskList node instead of a regular bulletList.
  html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
    if (content.includes('data-type="taskItem"')) {
      return `<ul data-type="taskList">${content}</ul>`;
    }
    return match;
  });

  // Sanitize — restrict URI attributes to https only (blocks data: SVG injection and
  // prevents image requests to arbitrary external servers). Event handlers are already
  // stripped by DOMPurify defaults; ALLOWED_URI_REGEXP adds an extra layer for src/href.
  if (typeof window !== "undefined") {
    html = DOMPurify.sanitize(html, {
      ADD_TAGS: ["span", "div", "pre", "code", "math", "mark", "img"],
      ADD_ATTR: [
        "data-type",
        "data-callout-type",
        "data-title",
        "data-latex",
        "data-checked",
        "data-code",
        "data-language",
        "class",
        "style",
        "width",
        "height",
        "src",
        "alt",
        "title",
      ],
      ALLOWED_URI_REGEXP: /^https?:/i,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function replaceCalloutBlocks(
  markdown: string,
  callouts: Array<{ type: string; content: string }>,
): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(
      /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i,
    );
    if (!match) {
      output.push(line);
      continue;
    }

    const type = match[1].toLowerCase();
    const contentLines: string[] = [];
    i += 1;

    while (i < lines.length) {
      const current = lines[i];
      if (!current.trim().startsWith(">")) break;
      contentLines.push(current.replace(/^>\s?/, ""));
      i += 1;
    }

    const idx = callouts.length;
    callouts.push({ type, content: contentLines.join("\n").trimEnd() });
    output.push(`%%CALLOUT_BLOCK_${idx}%%`);
    i -= 1;
  }

  return output.join("\n");
}

function buildCalloutHtml(type: string, content: string): string {
  const safeType = ["note", "tip", "important", "warning", "caution"].includes(
    type,
  )
    ? type
    : "note";
  const contentHtml = content
    ? (marked.parse(content, { async: false }) as string)
    : "<p></p>";

  return `<div data-type="callout-block" data-callout-type="${safeType}">${contentHtml}</div>`;
}
