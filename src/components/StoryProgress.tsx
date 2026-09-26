"use client";

import { useEffect, useState } from "react";

export type StoryProgressItem = {
	index: string;
	eyebrow: string;
};

type Props = {
	items: StoryProgressItem[];
};

/**
 * The story's progress rail: a fixed right-edge index of the six chapters
 * that tracks the reader's position as they scroll. Clicking a stop jumps
 * to its chapter (the section's scroll margin clears the navbar).
 *
 * Original implementation, no third-party dependency: one
 * IntersectionObserver with a center-band root margin, so exactly the
 * chapter crossing the middle of the viewport reads as current. Rendered
 * only on wide viewports (matchMedia, same idiom as `DifferenceCursor`) --
 * below 1100px the rail would collide with the capped content. Server
 * render outputs nothing, so static export and no-JS readers lose nothing
 * but an enhancement.
 */
export function StoryProgress({ items }: Props) {
	const [wide, setWide] = useState(false);
	const [active, setActive] = useState<string | null>(null);

	useEffect(() => {
		const query = window.matchMedia("(min-width: 1100px)");
		const sync = () => setWide(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		if (typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActive(entry.target.getAttribute("data-story-chapter"));
					}
				}
			},
			{ rootMargin: "-40% 0px -55% 0px", threshold: 0 },
		);
		const sections = document.querySelectorAll("[data-story-chapter]");
		for (const section of sections) observer.observe(section);
		return () => observer.disconnect();
	}, []);

	if (!wide || items.length === 0) return null;

	return (
		<nav
			aria-label="Story chapters"
			style={{
				position: "fixed",
				right: "var(--gap-md)",
				top: "50%",
				transform: "translateY(-50%)",
				zIndex: 50,
				display: "flex",
				flexDirection: "column",
				gap: "var(--space-base)",
			}}
		>
			{items.map((item) => {
				const id = `chapter-${item.index}`;
				const isActive = active === id;
				return (
					<a
						key={id}
						href={`#${id}`}
						aria-label={`Chapter ${item.index}: ${item.eyebrow}`}
						aria-current={isActive ? "true" : undefined}
						className="mono"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "calc(var(--space-base) / 2)",
							flexDirection: "row-reverse",
							fontSize: "var(--mono-size)",
							color: isActive ? "var(--accent)" : "var(--rule-strong)",
							textDecoration: "none",
							letterSpacing: "0.08em",
						}}
					>
						<span
							aria-hidden="true"
							className={`inline-block h-0.5 transition-all duration-150 ${
								isActive ? "w-5" : "w-2"
							}`}
							style={{
								backgroundColor: isActive ? "var(--accent)" : "var(--rule)",
							}}
						/>
						{item.index}
					</a>
				);
			})}
		</nav>
	);
}
