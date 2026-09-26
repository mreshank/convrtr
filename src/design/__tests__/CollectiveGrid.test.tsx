import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	CollectiveGrid,
	type CollectiveGridItem,
} from "@/design/families/CollectiveGrid";

const SAMPLE_COLLECTIVES: CollectiveGridItem[] = [
	{
		slug: "podcast-kit",
		title: "Podcast episode kit",
		why: "Everything for a podcast: -16 LUFS normalisation, voice EQ, MP3 encoding.",
		hasDemo: true,
		tools: [
			{
				id: "audio/trim-wav",
				name: "Trim WAV",
				fromExt: "wav",
				toExt: "wav",
				href: "/audio/trim-wav",
			},
			{
				id: "audio/normalise-wav",
				name: "Normalise WAV",
				fromExt: "wav",
				toExt: "wav",
				href: "/audio/normalise-wav",
			},
			{
				id: "audio/wav-to-mp3",
				name: "WAV to MP3",
				fromExt: "wav",
				toExt: "mp3",
				href: "/audio/wav-to-mp3",
			},
		],
	},
	{
		slug: "strip-metadata",
		title: "Strip metadata before sharing",
		why: "Remove GPS tags, authoring names, and Vorbis comments before publishing.",
		hasDemo: false,
		tools: [
			{
				id: "image/remove-exif-jpg",
				name: "Remove EXIF JPG",
				fromExt: "jpg",
				toExt: "jpg",
				href: "/image/remove-exif-jpg",
			},
			{
				id: "image/remove-metadata-png",
				name: "Remove Metadata PNG",
				fromExt: "png",
				toExt: "png",
				href: "/image/remove-metadata-png",
			},
		],
	},
];

describe("CollectiveGrid", () => {
	it("renders collectives with index, live demo badge, editorial rationale, and tools pipeline", () => {
		render(<CollectiveGrid collectives={SAMPLE_COLLECTIVES} />);
		expect(screen.getByText("2 CURATED COLLECTIVES")).toBeDefined();
		expect(screen.getByText("COLLECTIVE // 01")).toBeDefined();
		expect(screen.getByText("COLLECTIVE // 02")).toBeDefined();
		expect(screen.getByText("Podcast episode kit")).toBeDefined();
		expect(screen.getByText("Strip metadata before sharing")).toBeDefined();
		expect(screen.getByText("LIVE DEMO INCLUDED")).toBeDefined();
		expect(screen.getByText("WAV → MP3")).toBeDefined();
		expect(screen.getByText("WORKFLOW PIPELINE (3 TOOLS)")).toBeDefined();
	});

	it("filters collectives by search query", () => {
		render(<CollectiveGrid collectives={SAMPLE_COLLECTIVES} />);
		const input = screen.getByPlaceholderText(/Search by mission/);
		fireEvent.change(input, { target: { value: "EXIF" } });

		expect(screen.getByText("SHOWING 1 OF 2 COLLECTIVES")).toBeDefined();
		expect(screen.getByText("Strip metadata before sharing")).toBeDefined();
		expect(screen.queryByText("Podcast episode kit")).toBeNull();
	});

	it("shows empty state when no collective matches and allows clearing search", () => {
		render(<CollectiveGrid collectives={SAMPLE_COLLECTIVES} />);
		const input = screen.getByPlaceholderText(/Search by mission/);
		fireEvent.change(input, { target: { value: "unknown format query" } });

		expect(screen.getByText("[NO_COLLECTIVE_MATCH]")).toBeDefined();
		expect(
			screen.getByText("No collectives matched your search query."),
		).toBeDefined();

		const clearBtn = screen.getByRole("button", { name: "Clear search" });
		fireEvent.click(clearBtn);
		expect(screen.getByText("2 CURATED COLLECTIVES")).toBeDefined();
	});

	it("shows small collectives fully with no view-all CTA", () => {
		render(<CollectiveGrid collectives={SAMPLE_COLLECTIVES} />);
		expect(screen.queryByRole("button", { name: /VIEW ALL/i })).toBeNull();
	});

	it("truncates pipelines longer than 5 tools behind a view-all CTA that opens a dialog with the full list", () => {
		const tools = Array.from({ length: 8 }, (_, i) => ({
			id: `tool-${i + 1}`,
			name: `Tool ${i + 1}`,
			fromExt: "wav",
			toExt: "mp3",
			href: `/tool-${i + 1}`,
		}));
		render(
			<CollectiveGrid
				collectives={[
					{
						slug: "big-kit",
						title: "Big kit",
						why: "A large kit.",
						tools,
					},
				]}
			/>,
		);

		expect(screen.getByText("WORKFLOW PIPELINE (8 TOOLS)")).toBeDefined();
		// Inline card shows only the first 5.
		expect(screen.getByText("Tool 5")).toBeDefined();
		expect(screen.queryByText("Tool 6")).toBeNull();

		const viewAll = screen.getByRole("button", {
			name: /VIEW ALL 8 TOOLS/i,
		});
		fireEvent.click(viewAll);

		const dialog = screen.getByRole("dialog");
		expect(dialog.getAttribute("data-collective-dialog")).toBe("big-kit");
		// Dialog lists every tool, including the truncated ones.
		expect(screen.getByText("Tool 6")).toBeDefined();
		expect(screen.getByText("Tool 8")).toBeDefined();
		expect(
			screen.getByRole("link", { name: /Open full suite page/i }),
		).toBeDefined();

		// Escape closes the dialog.
		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
