import { describe, expect, it } from "vitest";
import { orgToMarkdownEngine, parseOrgToMarkdown } from "../index";

const SAMPLE_ORG = `#+TITLE: Research Notes on Quantum Algorithms
#+AUTHOR: Dr. Elena Vance
#+DATE: 2026-09-11
#+TAGS: quantum computing algorithms

* Overview
This document contains personal notes on *quantum computing* and /error correction/.
See the official repository at [[https://github.com/example/quantum][Quantum Lib]].

:PROPERTIES:
:ID: d84a92bc-1234
:CUSTOM_ID: sec-overview
:END:

** TODO Implement Shor's Algorithm
- [ ] Review modular exponentiation
- [X] Setup qubit simulator
- [-] Optimize gate depth

** Data Table
| Algorithm | Qubits | Fidelity |
|-----------+--------+----------|
| Grover    | 16     | 99.4%    |
| Shor      | 64     | 98.1%    |

#+BEGIN_SRC python
def quantum_teleportation():
    circuit = QuantumCircuit(3, 3)
    return circuit
#+END_SRC

#+BEGIN_QUOTE
The future of computing is fundamentally non-classical.
#+END_QUOTE
`;

describe("Emacs Org to Markdown Engine", () => {
	it("parses metadata and prepends YAML frontmatter", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.metadata.title).toBe("Research Notes on Quantum Algorithms");
		expect(result.metadata.author).toBe("Dr. Elena Vance");
		expect(result.metadata.date).toBe("2026-09-11");
		expect(result.metadata.tags).toContain("quantum");
		expect(result.markdown).toContain(
			'title: "Research Notes on Quantum Algorithms"',
		);
	});

	it("converts headings and TODO states into Markdown task checkboxes", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.markdown).toContain("# Overview");
		expect(result.markdown).toContain("## [ ] Implement Shor's Algorithm");
		expect(result.markdown).toContain("- [ ] Review modular exponentiation");
		expect(result.markdown).toContain("- [x] Setup qubit simulator");
	});

	it("converts Org tables and separators to GitHub Flavored Markdown tables", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.markdown).toContain("| Algorithm | Qubits | Fidelity |");
		expect(result.markdown).toContain("| --- | --- | --- |");
		expect(result.markdown).toContain("| Grover | 16 | 99.4% |");
	});

	it("converts #+BEGIN_SRC code blocks and #+BEGIN_QUOTE", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.markdown).toContain(
			"```python\ndef quantum_teleportation():",
		);
		expect(result.markdown).toContain(
			"> The future of computing is fundamentally non-classical.",
		);
	});

	it("converts inline formatting and Org links", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.markdown).toContain("**quantum computing**");
		expect(result.markdown).toContain("*error correction*");
		expect(result.markdown).toContain(
			"[Quantum Lib](https://github.com/example/quantum)",
		);
	});

	it("strips property drawers cleanly", () => {
		const result = parseOrgToMarkdown(SAMPLE_ORG);

		expect(result.markdown).not.toContain(":PROPERTIES:");
		expect(result.markdown).not.toContain(":CUSTOM_ID:");
	});

	it("runs through engine execution runner with progress", async () => {
		const phases: string[] = [];
		const inputBuffer = new TextEncoder().encode(SAMPLE_ORG)
			.buffer as ArrayBuffer;

		const outBuffer = await orgToMarkdownEngine.run(
			inputBuffer,
			{ frontmatter: "true" },
			(_ratio, phase) => {
				phases.push(phase);
			},
		);

		const md = new TextDecoder().decode(new Uint8Array(outBuffer));
		expect(md).toContain("# Overview");
		expect(phases).toContain("READING_ORG");
		expect(phases).toContain("COMPLETE");
	});
});
