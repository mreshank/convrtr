"use client";

import { useState } from "react";
import {
	applyPreset,
	type ParamValue,
	type QualityState,
	setParam,
} from "@/core/quality";
import type { AdvancedParam, Tool } from "@/core/registry";

type Props = {
	tool: Tool;
	state: QualityState;
	onChange: (state: QualityState) => void;
};

function AdvancedControl({
	param,
	value,
	onChange,
}: {
	param: AdvancedParam;
	value: ParamValue | undefined;
	onChange: (value: ParamValue) => void;
}) {
	if (param.control === "toggle") {
		return (
			<label className="flex items-center justify-between gap-4">
				<span className="text-[12px]">{param.label}</span>
				<input
					type="checkbox"
					aria-label={param.label}
					checked={Boolean(value)}
					onChange={(event) => onChange(event.target.checked)}
				/>
			</label>
		);
	}

	if (param.control === "select") {
		return (
			<label className="flex items-center justify-between gap-4">
				<span className="text-[12px]">{param.label}</span>
				<select
					aria-label={param.label}
					value={String(value)}
					onChange={(event) => onChange(event.target.value)}
					className="mono"
					style={{
						background: "transparent",
						borderColor: "var(--hairline)",
						borderRadius: "var(--radius)",
						color: "var(--text-primary)",
					}}
				>
					{param.options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>
		);
	}

	return (
		<label className="flex items-center justify-between gap-4">
			<span className="text-[12px]">{param.label}</span>
			<span className="flex items-center gap-2">
				<input
					type={param.control === "slider" ? "range" : "number"}
					aria-label={param.label}
					className="mono"
					min={param.min}
					max={param.max}
					step={param.step}
					value={Number(value)}
					onChange={(event) => onChange(Number(event.target.value))}
				/>
				<span
					className="mono text-[11px]"
					style={{ color: "var(--text-muted)" }}
				>
					{Number(value)}
				</span>
			</span>
		</label>
	);
}

export function OptionsPanel({ tool, state, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const active = tool.quality.presets.find(
		(preset) => preset.id === state.preset,
	);
	const groups = [
		...new Set(tool.quality.advanced.map((param) => param.group)),
	];

	return (
		<div className="flex flex-col gap-4">
			<span
				className="mono text-[11px] tracking-[0.08em]"
				style={{ color: "var(--text-muted)" }}
			>
				QUALITY
			</span>

			<div
				role="radiogroup"
				aria-label="Quality"
				className="flex flex-wrap gap-2"
			>
				{tool.quality.presets.map((preset) => {
					const selected = preset.id === state.preset;
					return (
						// biome-ignore lint/a11y/useSemanticElements: a native <input type="radio"> can't carry the segmented-button styling or the label text as its own accessible content.
						<button
							key={preset.id}
							type="button"
							role="radio"
							aria-checked={selected}
							aria-label={preset.label}
							onClick={() => onChange(applyPreset(tool, preset.id))}
							className="mono border px-4 py-2 text-[12px]"
							style={{
								color: selected ? "var(--signal)" : "var(--text-primary)",
								borderColor: selected ? "var(--signal)" : "var(--hairline)",
								borderRadius: "var(--radius)",
								background: "transparent",
							}}
						>
							{preset.label}
						</button>
					);
				})}
			</div>

			{active && (
				<span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
					{active.explanation}
				</span>
			)}

			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				className="mono self-start text-[11px] tracking-[0.08em]"
				style={{ color: "var(--text-muted)", background: "transparent" }}
			>
				ADVANCED {open ? "−" : "+"}
			</button>

			{open && (
				<div
					className="flex flex-col gap-6 border-t pt-4"
					style={{ borderColor: "var(--hairline)" }}
				>
					{groups.map((group) => (
						<div key={group} className="flex flex-col gap-3">
							<span
								className="mono text-[11px] tracking-[0.08em]"
								style={{ color: "var(--text-muted)" }}
							>
								{group.toUpperCase()}
							</span>
							{tool.quality.advanced
								.filter((param) => param.group === group)
								.map((param) => (
									<AdvancedControl
										key={param.key}
										param={param}
										value={state.params[param.key]}
										onChange={(value) =>
											onChange(setParam(tool, state, param.key, value))
										}
									/>
								))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
