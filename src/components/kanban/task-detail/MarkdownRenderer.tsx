"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
interface MarkdownRendererProps {
	markdown: string;
	className?: string;
}

/**
 * Renders a markdown string as sanitized HTML.
 * Uses marked for parsing and DOMPurify for XSS protection.
 */
export function MarkdownRenderer({
	markdown,
	className,
}: MarkdownRendererProps) {
	const html = useMemo(() => {
		if (!markdown || !markdown.trim()) return "";
		const raw = marked.parse(markdown, { async: false }) as string;
		if (typeof window !== "undefined") {
			return DOMPurify.sanitize(raw, {
				ALLOWED_URI_REGEXP: /^https?:/i,
				ALLOW_UNKNOWN_PROTOCOLS: false,
			});
		}
		return raw;
	}, [markdown]);

	if (!html) return null;

	return (
		<div
			className={cn("markdown-body text-sm", className)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

/**
 * Strips HTML tags from a markdown string to get plain text.
 * Useful for preview/card views that need text-only content.
 */
export function markdownToPlainText(markdown: string): string {
	if (!markdown) return "";
	const raw = marked.parse(markdown, { async: false }) as string;
	if (typeof window !== "undefined") {
		const sanitized = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [] });
		// DOMPurify with no allowed tags returns just the text content
		return sanitized;
	}
	// Fallback: strip HTML tags
	return raw.replace(/<[^>]*>/g, "").trim();
}
