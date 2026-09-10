"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

const LANGUAGES = [
  { value: "", label: "Auto" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" },
  { value: "graphql", label: "GraphQL" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "plaintext", label: "Plain Text" },
];

export default function CodeBlockView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const currentLang = (node.attrs.language as string) || "";

  return (
    <NodeViewWrapper className="code-block-wrapper relative my-4 rounded-lg overflow-hidden border border-border/50">
      <div className="code-block-header flex items-center justify-between bg-muted/70 px-3 py-1.5 border-b border-border/50" contentEditable={false}>
        <select
          className="bg-transparent text-xs font-medium text-muted-foreground outline-none cursor-pointer hover:text-foreground transition-colors"
          value={currentLang}
          onChange={(e) => updateAttributes({ language: e.target.value })}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          onClick={() => {
            const code = node.textContent;
            navigator.clipboard.writeText(code);
          }}
        >
          Copy
        </button>
      </div>
      <pre className="!m-0 !rounded-none !rounded-b-lg bg-muted/40 p-4 overflow-x-auto">
        <NodeViewContent as="div" className="code-content font-mono text-sm leading-relaxed" />
      </pre>
    </NodeViewWrapper>
  );
}
