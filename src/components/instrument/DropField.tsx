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
			className="mono flex flex-col items-center gap-3 border p-8 text-center"
			style={{
				borderColor: active ? "var(--ink)" : "var(--rule)",
				borderRadius: "var(--radius)",
				cursor: "pointer",
			}}
		>
			<span className="text-[13px]">DROP FILES HERE</span>
			<span className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
				or click to browse
			</span>
			<div className="flex flex-wrap justify-center gap-2">
				{formats.map((format) => (
					<span
						key={format}
						className="border px-2 py-1 text-[11px] tracking-[0.08em]"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							color: "var(--ink-muted)",
						}}
					>
						{format}
					</span>
				))}
			</div>
			<input
				ref={input}
				type="file"
				multiple
				hidden
				accept={[...accept.mime, ...accept.ext.map((ext) => `.${ext}`)].join(
					",",
				)}
				onChange={(event) => handle(event.target.files)}
			/>
		</div>
	);
}
