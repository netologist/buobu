"use client";

import { useState, useCallback } from "react";
import { Eye, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	rows?: number;
}

/**
 * Markdown editor with Edit/Preview toggle.
 * Edit mode: plain textarea for writing markdown.
 * Preview mode: rendered markdown output.
 */
export function MarkdownEditor({
	value,
	onChange,
	disabled = false,
	className,
	placeholder = "Write description (markdown supported)...",
	rows = 6,
}: MarkdownEditorProps) {
	const [preview, setPreview] = useState(false);

	const togglePreview = useCallback(() => {
		setPreview((prev) => !prev);
	}, []);

	return (
		<div className={cn("space-y-1", className)}>
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold uppercase text-muted-foreground">
					Description
				</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
					onClick={togglePreview}
					disabled={disabled}
				>
					{preview ? (
						<>
							<Pencil className="h-3 w-3" />
							Edit
						</>
					) : (
						<>
							<Eye className="h-3 w-3" />
							Preview
						</>
					)}
				</Button>
			</div>
			{preview ? (
				<div className="min-h-[120px] rounded-md border bg-muted/30 p-3">
					{value.trim() ? (
						<MarkdownRenderer markdown={value} className="max-w-none" />
					) : (
						<p className="text-sm italic text-muted-foreground">
							No description
						</p>
					)}
				</div>
			) : (
				<Textarea
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className="min-h-[120px] font-mono text-sm"
					rows={rows}
					disabled={disabled}
					placeholder={placeholder}
				/>
			)}
		</div>
	);
}
