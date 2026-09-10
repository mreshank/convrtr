"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { deriveTaskGroups, type Kind } from "@/core/registry/groups";

type Props = {
	triggerLabel: string;
	triggerHref: string;
};

const CLOSE_DELAY_MS = 150;

function label(kind: Kind): string {
	return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

/**
 * The hover/focus mega-menu for the one nav item that carries it. This is
 * deliberately NOT a repeat of `SiteHeader`'s mobile disclosure: no portal,
 * no `position: fixed` scrim, no scroll lock, no focus trap. It is a small
 * panel anchored under its trigger, scoped to normal document flow, sourced
 * entirely from `deriveTaskGroups()` so it can never drift from the tool
 * registry.
 */
export function ToolsMegaMenu({ triggerLabel, triggerHref }: Props) {
	const groups = deriveTaskGroups();

	const [open, setOpen] = useState(false);
	// Defaults to the first group so the panel never opens empty: a mega-menu
	// that shows only level-1 rows until something is hovered forces an extra
	// step just to see any tool link. Later hovers simply move this.
	const [activeKind, setActiveKind] = useState<Kind | null>(
		groups[0]?.kind ?? null,
	);
	const triggerRef = useRef<HTMLAnchorElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<number | null>(null);
	const suppressNextFocus = useRef(false);
	const panelId = useId();

	const cancelScheduledClose = useCallback(() => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);

	const close = useCallback(() => {
		cancelScheduledClose();
		setOpen(false);
		// activeKind is deliberately left as-is -- reopening (hover or focus)
		// should show the same group expanded, not force a blank first render.
	}, [cancelScheduledClose]);

	const scheduleClose = useCallback(() => {
		cancelScheduledClose();
		closeTimer.current = window.setTimeout(close, CLOSE_DELAY_MS);
	}, [cancelScheduledClose, close]);

	useEffect(() => {
		if (!open) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			close();
			// Re-focusing the trigger below dispatches its own focus event,
			// which bubbles to this component's wrapping `onFocus` handler and
			// would otherwise reopen the menu right after `close()` ran.
			suppressNextFocus.current = true;
			triggerRef.current?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, close]);

	useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: this wrapper is not itself an interactive control -- the real link and buttons inside it are; these handlers only track whether the pointer/focus is anywhere within this region.
		<div
			ref={rootRef}
			style={{ position: "relative", display: "inline-flex" }}
			onMouseEnter={cancelScheduledClose}
			onMouseLeave={scheduleClose}
			onFocus={() => {
				if (suppressNextFocus.current) {
					suppressNextFocus.current = false;
					return;
				}
				setOpen(true);
			}}
			onBlur={(event) => {
				if (rootRef.current?.contains(event.relatedTarget as Node | null)) {
					return;
				}
				close();
			}}
		>
			<Link
				ref={triggerRef}
				href={triggerHref}
				aria-expanded={open}
				aria-controls={panelId}
				onMouseEnter={() => setOpen(true)}
				onClick={(event) => {
					event.preventDefault();
					setOpen((current) => !current);
				}}
				style={{
					display: "inline-flex",
					alignItems: "center",
					height: "23px",
					padding: "0 14px",
					background: "transparent",
					color: "var(--ink)",
					borderRadius: "var(--radius-control)",
					fontSize: "var(--label-size)",
					letterSpacing: "var(--label-tracking)",
					fontWeight: "var(--label-weight)",
					whiteSpace: "nowrap",
				}}
			>
				{triggerLabel}
			</Link>

			{open ? (
				// biome-ignore lint/a11y/useSemanticElements: a disclosure panel of links and toggle buttons, not a form control group -- <fieldset>'s implicit role happens to be "group" but its semantics are wrong here.
				<div
					id={panelId}
					role="group"
					aria-label={triggerLabel}
					data-mega-menu
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						zIndex: 110,
						display: "flex",
						background: "var(--ground)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						padding: "var(--space-base)",
						gap: "var(--space-base)",
					}}
				>
					<ul
						style={{
							display: "flex",
							flexDirection: "column",
							minWidth: "calc(var(--space-base) * 20)",
						}}
					>
						{groups.map((group) => (
							<li key={group.kind}>
								<button
									type="button"
									onMouseEnter={() => setActiveKind(group.kind)}
									onFocus={() => setActiveKind(group.kind)}
									style={{
										display: "flex",
										width: "100%",
										justifyContent: "space-between",
										gap: "var(--gap-sm)",
										padding: "var(--space-base) var(--gap-sm)",
										background:
											activeKind === group.kind
												? "var(--surface)"
												: "transparent",
										color: "var(--ink)",
										border: "none",
										borderRadius: "var(--radius)",
										fontSize: "var(--label-size)",
										textAlign: "left",
									}}
								>
									<span>{label(group.kind)} </span>
									<span className="mono" style={{ color: "var(--ink-muted)" }}>
										({group.tools.length})
									</span>
								</button>
							</li>
						))}
					</ul>

					{activeKind
						? groups
								.filter((group) => group.kind === activeKind)
								.map((group) => (
									// biome-ignore lint/a11y/useSemanticElements: a list of tool links grouped under one task kind, not a form control group -- <fieldset> would be the wrong semantics here too.
									<ul
										key={group.kind}
										role="group"
										aria-label={`${label(group.kind)} (${group.tools.length})`}
										style={{
											display: "flex",
											flexDirection: "column",
											minWidth: "calc(var(--space-base) * 25)",
											borderLeftWidth: "var(--rule-width)",
											borderLeftStyle: "solid",
											borderLeftColor: "var(--rule)",
											paddingLeft: "var(--space-base)",
										}}
									>
										{group.tools.map((tool) => (
											<li key={tool.id}>
												<Link
													href={`/${tool.id}`}
													onClick={close}
													style={{
														display: "block",
														padding: "var(--space-base) var(--gap-sm)",
														color: "var(--ink)",
														fontSize: "var(--body-size)",
													}}
												>
													{tool.seo.title}
												</Link>
											</li>
										))}
									</ul>
								))
						: null}
				</div>
			) : null}
		</div>
	);
}
