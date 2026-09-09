import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveDemo } from "../LiveDemo";

/**
 * happy-dom does not run real Web Workers, and `core/pipeline/client.ts`
 * never imports `Worker` directly — it reaches for the global, the same
 * seam `core/pipeline/__tests__/client.test.ts` stubs. Reusing that exact
 * pattern here means these tests exercise `LiveDemo`'s real call into the
 * real `runJob`, not a mock standing in for the whole pipeline.
 */
let lastWorker: FakeWorker | null = null;

class FakeWorker {
	onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;

	constructor() {
		lastWorker = this;
	}

	/**
	 * `client.ts` calls `postMessage(request, [request.input])` — a real
	 * transfer, which a real browser detaches on the sender's side
	 * (`byteLength` reads 0 from then on), not a copy. `structuredClone`'s
	 * `transfer` option reproduces that exact detach in Node, which is what
	 * caught `LiveDemo` reading `input.byteLength` *after* this call and
	 * always reporting 0 bytes in — a bug a no-op stub here could not have
	 * found.
	 */
	postMessage(_message: unknown, transfer?: Transferable[]): void {
		if (transfer && transfer.length > 0) {
			structuredClone(transfer[0], { transfer });
		}
	}

	terminate(): void {}
}

function respondDone(output: ArrayBuffer) {
	lastWorker?.onmessage?.({
		data: { type: "done", id: "job", output },
	} as MessageEvent<unknown>);
}

beforeEach(() => {
	lastWorker = null;
	vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("LiveDemo at rest", () => {
	it("shows identity and a RUN DEMO affordance without fetching anything", () => {
		const fetchSpy = vi.spyOn(global, "fetch");

		render(
			<LiveDemo toolId="audio/normalise-wav" sampleId="podcast-clip-wav" />,
		);

		expect(screen.getByRole("button", { name: "RUN DEMO" })).toBeDefined();
		expect(screen.getByText("podcast-clip.wav")).toBeDefined();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(lastWorker).toBeNull();
	});

	it("renders nothing for an unknown tool or sample id", () => {
		const { container: badTool } = render(
			<LiveDemo toolId="no/such-tool" sampleId="podcast-clip-wav" />,
		);
		expect(badTool.firstChild).toBeNull();

		const { container: badSample } = render(
			<LiveDemo toolId="audio/normalise-wav" sampleId="no-such-sample" />,
		);
		expect(badSample.firstChild).toBeNull();
	});
});

describe("LiveDemo on activation", () => {
	it("fetches the sample same-origin and runs it through the real runJob pipeline", async () => {
		const inputBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
		const outputBytes = new Uint8Array([9, 9, 9, 9]).buffer;
		const fetchSpy = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(new Response(inputBytes));

		render(
			<LiveDemo toolId="audio/normalise-wav" sampleId="podcast-clip-wav" />,
		);

		fireEvent.click(screen.getByRole("button", { name: "RUN DEMO" }));

		await waitFor(() =>
			expect(fetchSpy).toHaveBeenCalledWith("/samples/podcast-clip.wav"),
		);
		await waitFor(() => expect(lastWorker).not.toBeNull());

		respondDone(outputBytes);

		// The readout is a real measurement of the bytes runJob actually
		// returned (8 in, 4 out), not a value written down ahead of time.
		await waitFor(() =>
			expect(screen.getByTestId("facts").textContent).toContain("8 B → 4 B"),
		);
		expect(screen.getByTestId("facts").textContent).toContain("−50%");
	});
});

describe("LiveDemo for a heavy-download tool", () => {
	it("shows a labelled static specimen and no RUN DEMO affordance", () => {
		render(<LiveDemo toolId="video/avi-to-mp4" sampleId="unused" />);

		expect(screen.getByText("STATIC SPECIMEN")).toBeDefined();
		expect(screen.getByText(/31MB/)).toBeDefined();
		expect(screen.queryByRole("button", { name: "RUN DEMO" })).toBeNull();
	});

	it("inverts its own ink alongside the ground, not the ground alone", () => {
		// Measured on the real export before this held: white `--ink` text
		// (`MonoMeta`'s "podcast-clip.wav", `FileReadout`, `FidelityScore`)
		// sat on the pale `--surface-alt` card at 1.16:1 -- the ground token
		// was redefined but `color` was left unset, so it kept inheriting
		// the black canvas's already-resolved white from `body`. Fixed at
		// 15.88:1 by also stating `color: var(--ink)` on this same element,
		// the same pairing `SiteFooter` states on its own root.
		const { container } = render(
			<LiveDemo toolId="video/avi-to-mp4" sampleId="unused" />,
		);
		const card = Array.from(
			container.querySelectorAll<HTMLElement>("div"),
		).find(
			(el) => el.style.getPropertyValue("--ground") === "var(--surface-alt)",
		);
		expect(card).toBeDefined();
		expect(card?.style.getPropertyValue("--ink")).toBe("var(--ink-inverse)");
		expect(card?.style.color).toBe("var(--ink)");
		expect(card?.style.background).toBe("var(--ground)");
	});
});
