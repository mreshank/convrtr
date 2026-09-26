"use client";

import { useRef, useState } from "react";
import { acceptsFile } from "@/core/io";

type Props = {
	accept: { mime: string[]; ext: string[] };
	formats: string[];
	onFiles: (files: File[]) => void;
};

export function DropField({ accept, formats, onFiles }: Props) {
	const [active, setActive] = useState(false);
	const input = useRef<HTMLInputElement>(null);

	const handle = (files: FileList | null) => {
		if (!files) return;
		const accepted = Array.from(files).filter((file) =>
			acceptsFile(file, accept),
		);
		if (accepted.length > 0) onFiles(accepted);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: drop zone needs drag-and-drop handlers and a nested file input, which a native <button> can't host.
		<div
			data-testid="drop-field"
			data-active={active}
			role="button"
			aria-label="Drop files here or click to browse"
			tabIndex={0}
			onDragOver={(event) => {
				event.preventDefault();
				setActive(true);
			}}
			onDragLeave={() => setActive(false)}
			onDrop={(event) => {
				event.preventDefault();
				setActive(false);
				handle(event.dataTransfer.files);
			}}
			onClick={() => input.current?.click()}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					input.current?.click();
				}
			}}
			className="m3-surface-card mono flex flex-col items-center gap-3.5 border-dashed p-8 text-center transition-all duration-200"
			style={{
				borderColor: active ? "var(--ink)" : "var(--rule-strong)",
				cursor: "pointer",
			}}
		>
			<div
				className="flex h-10 w-10 items-center justify-center rounded-full border transition-all"
				style={{
					borderColor: active ? "var(--ink)" : "var(--rule-subtle)",
					backgroundColor: "var(--ground)",
					color: active ? "var(--accent)" : "var(--ink-muted)",
				}}
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
			</div>
			<div className="flex flex-col items-center gap-1">
				<span className="text-[13px] font-medium tracking-[0.04em]">
					DROP FILES HERE
				</span>
				<span className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
					or click to browse
				</span>
			</div>
			<div className="flex flex-wrap justify-center gap-2 pt-1">
				{formats.map((format) => (
					<span key={format} className="m3-chip text-[11px] tracking-[0.04em]">
						{format}
					</span>
				))}
			</div>
			<input
				ref={input}
				type="file"
				multiple
				hidden
				aria-label="Upload files"
				accept={[...accept.mime, ...accept.ext.map((ext) => `.${ext}`)].join(
					",",
				)}
				onChange={(event) => handle(event.target.files)}
			/>
		</div>
	);
}
