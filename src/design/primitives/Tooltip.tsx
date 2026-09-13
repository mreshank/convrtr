"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";

export interface TooltipProps {
	children: React.ReactElement<{
		"aria-describedby"?: string;
		onFocus?: React.FocusEventHandler;
		onBlur?: React.FocusEventHandler;
		onMouseEnter?: React.MouseEventHandler;
		onMouseLeave?: React.MouseEventHandler;
		onKeyDown?: React.KeyboardEventHandler;
	}>;
	content: React.ReactNode;
	position?: "top" | "bottom" | "left" | "right";
	delayMs?: number;
}

/**
 * Accessible WAI-ARIA Tooltip primitive.
 *
 * Adheres to W3C tooltip guidelines:
 * - Links trigger via `aria-describedby` when open.
 * - Bubble bears `role="tooltip"`.
 * - Opens on hover (with debounced entry delay) and instantly on focus.
 * - Dismisses instantly on `Escape` key, blur, or mouse exit.
 * - Uses pure design tokens with zero arbitrary hex or un-tokenized values.
 */
export function Tooltip({
	children,
	content,
	position = "bottom",
	delayMs = 120,
}: TooltipProps) {
	const [isOpen, setIsOpen] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const tooltipId = useId();

	const clearTimer = useCallback(() => {
		if (timeoutRef.current !== null) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	const show = useCallback(
		(instant = false) => {
			clearTimer();
			if (instant || delayMs <= 0) {
				setIsOpen(true);
			} else {
				timeoutRef.current = setTimeout(() => {
					setIsOpen(true);
				}, delayMs);
			}
		},
		[clearTimer, delayMs],
	);

	const hide = useCallback(() => {
		clearTimer();
		setIsOpen(false);
	}, [clearTimer]);

	useEffect(() => {
		return () => clearTimer();
	}, [clearTimer]);

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Escape" && isOpen) {
			event.stopPropagation();
			hide();
		}
		children.props.onKeyDown?.(event);
	};

	const handleMouseEnter = (event: React.MouseEvent) => {
		show(false);
		children.props.onMouseEnter?.(event);
	};

	const handleMouseLeave = (event: React.MouseEvent) => {
		hide();
		children.props.onMouseLeave?.(event);
	};

	const handleFocus = (event: React.FocusEvent) => {
		show(true);
		children.props.onFocus?.(event);
	};

	const handleBlur = (event: React.FocusEvent) => {
		hide();
		children.props.onBlur?.(event);
	};

	// Compute positioning inline styles
	const positionStyles: React.CSSProperties =
		position === "top"
			? {
					bottom: "calc(100% + var(--space-base))",
					left: "50%",
					transform: "translateX(-50%)",
				}
			: position === "left"
				? {
						right: "calc(100% + var(--space-base))",
						top: "50%",
						transform: "translateY(-50%)",
					}
				: position === "right"
					? {
							left: "calc(100% + var(--space-base))",
							top: "50%",
							transform: "translateY(-50%)",
						}
					: {
							top: "calc(100% + var(--space-base))",
							left: "50%",
							transform: "translateX(-50%)",
						};

	const clonedChild = React.cloneElement(children, {
		"aria-describedby": isOpen
			? [children.props["aria-describedby"], tooltipId]
					.filter(Boolean)
					.join(" ")
			: children.props["aria-describedby"],
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		onFocus: handleFocus,
		onBlur: handleBlur,
		onKeyDown: handleKeyDown,
	});

	return (
		<span
			style={{
				position: "relative",
				display: "inline-flex",
				alignItems: "center",
			}}
		>
			{clonedChild}
			{isOpen && (
				<span
					id={tooltipId}
					role="tooltip"
					data-tooltip-bubble
					data-position={position}
					style={{
						position: "absolute",
						zIndex: 1000,
						pointerEvents: "none",
						userSelect: "none",
						whiteSpace: "nowrap",
						backgroundColor: "var(--surface)",
						color: "var(--ink)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule-strong)",
						borderRadius: "var(--radius-control)",
						padding: "calc(var(--space-base) / 2) var(--space-base)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						lineHeight: 1,
						letterSpacing: "0.04em",
						...positionStyles,
					}}
				>
					{content}
				</span>
			)}
		</span>
	);
}
