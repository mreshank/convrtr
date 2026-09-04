import { formatDuration, formatPercent } from "@/lib/format";

type Props = { ratio: number; phase: string; elapsedSeconds: number };

export function ProgressBar({ ratio, phase, elapsedSeconds }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<div
				role="progressbar"
				aria-valuenow={Math.round(ratio * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				className="h-[2px] w-full"
				style={{ background: "var(--hairline)" }}
			>
				<div
					className="h-full"
					style={{
						width: `${ratio * 100}%`,
						background: "var(--text-primary)",
					}}
				/>
			</div>
			<span data-testid="progress-readout" className="mono text-[12px]">
				{formatPercent(ratio)} {"·"} {phase} {"·"} ELAPSED{" "}
				{formatDuration(elapsedSeconds)}
			</span>
		</div>
	);
}
