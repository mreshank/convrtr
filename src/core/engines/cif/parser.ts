/**
 * Crystallographic Information Framework (.cif / .mmcif) Parser & Converter
 *
 * Parses macromolecular CIF (mmCIF) and standard CIF crystallographic datasets.
 * Extracts unit-cell dimensions, crystal structure titles, loop tables,
 * atomic Cartesian coordinates (_atom_site), and resolves primary amino acid
 * sequences per chain into standard FASTA format and RFC 4180 CSV tables.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

export interface CifAtom {
	record: string; // ATOM or HETATM
	id: string;
	element: string;
	atomName: string;
	residue: string;
	chain: string;
	seqId: string;
	x: number;
	y: number;
	z: number;
	occupancy: number;
	bFactor: number;
}

export interface CifCell {
	a: number;
	b: number;
	c: number;
	alpha: number;
	beta: number;
	gamma: number;
}

export interface CifParseResult {
	entryId: string;
	title: string;
	cell: CifCell;
	chains: Record<string, string>; // chainId -> 1-letter FASTA sequence
	atoms: CifAtom[];
}

const AMINO_ACIDS: Record<string, string> = {
	ALA: "A",
	ARG: "R",
	ASN: "N",
	ASP: "D",
	CYS: "C",
	GLN: "Q",
	GLU: "E",
	GLY: "G",
	HIS: "H",
	ILE: "I",
	LEU: "L",
	LYS: "K",
	MET: "M",
	PHE: "F",
	PRO: "P",
	SER: "S",
	THR: "T",
	TRP: "W",
	TYR: "Y",
	VAL: "V",
	SEC: "U",
	PYL: "O",
	// Nucleic acids
	DA: "A",
	DC: "C",
	DG: "G",
	DT: "T",
	A: "A",
	C: "C",
	G: "G",
	U: "U",
};

/**
 * Tokenizes a CIF text stream handling single quotes, double quotes,
 * and multiline semicolon fields.
 */
function tokenizeCif(text: string): string[] {
	const tokens: string[] = [];
	const len = text.length;
	let i = 0;

	while (i < len) {
		const ch = text[i] ?? "";

		// Skip whitespace
		if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
			i++;
			continue;
		}

		// Comment up to newline
		if (ch === "#") {
			while (i < len && text[i] !== "\n") i++;
			continue;
		}

		// Multiline semicolon delimiter: only if at the beginning of a line
		if (ch === ";" && (i === 0 || text[i - 1] === "\n")) {
			i++; // skip initial semicolon
			const start = i;
			while (i < len) {
				if (text[i] === ";" && text[i - 1] === "\n") {
					break;
				}
				i++;
			}
			tokens.push(text.slice(start, i).trim());
			if (i < len && text[i] === ";") i++;
			continue;
		}

		// Single quoted token
		if (ch === "'") {
			i++;
			const start = i;
			while (i < len && text[i] !== "'") i++;
			tokens.push(text.slice(start, i));
			if (i < len && text[i] === "'") i++;
			continue;
		}

		// Double quoted token
		if (ch === '"') {
			i++;
			const start = i;
			while (i < len && text[i] !== '"') i++;
			tokens.push(text.slice(start, i));
			if (i < len && text[i] === '"') i++;
			continue;
		}

		// Bare word
		const start = i;
		while (
			i < len &&
			text[i] !== " " &&
			text[i] !== "\t" &&
			text[i] !== "\r" &&
			text[i] !== "\n" &&
			text[i] !== "#"
		) {
			i++;
		}
		tokens.push(text.slice(start, i));
	}

	return tokens;
}

export function parseCif(text: string): CifParseResult {
	const tokens = tokenizeCif(text);

	let entryId = "STRUCTURE";
	let title = "Macromolecular Crystal Structure";
	const cell: CifCell = {
		a: 0,
		b: 0,
		c: 0,
		alpha: 90,
		beta: 90,
		gamma: 90,
	};
	const atoms: CifAtom[] = [];

	let i = 0;
	while (i < tokens.length) {
		const token = tokens[i] ?? "";

		if (token.startsWith("data_")) {
			entryId = token.slice(5).trim() || entryId;
			i++;
		} else if (token === "_entry.id") {
			entryId = tokens[i + 1] ?? entryId;
			i += 2;
		} else if (token === "_struct.title") {
			title = tokens[i + 1] ?? title;
			i += 2;
		} else if (token === "_cell.length_a") {
			cell.a = Number.parseFloat(tokens[i + 1] ?? "0") || cell.a;
			i += 2;
		} else if (token === "_cell.length_b") {
			cell.b = Number.parseFloat(tokens[i + 1] ?? "0") || cell.b;
			i += 2;
		} else if (token === "_cell.length_c") {
			cell.c = Number.parseFloat(tokens[i + 1] ?? "0") || cell.c;
			i += 2;
		} else if (token === "_cell.angle_alpha") {
			cell.alpha = Number.parseFloat(tokens[i + 1] ?? "90") || cell.alpha;
			i += 2;
		} else if (token === "_cell.angle_beta") {
			cell.beta = Number.parseFloat(tokens[i + 1] ?? "90") || cell.beta;
			i += 2;
		} else if (token === "_cell.angle_gamma") {
			cell.gamma = Number.parseFloat(tokens[i + 1] ?? "90") || cell.gamma;
			i += 2;
		} else if (token === "loop_") {
			i++;
			// Collect loop header tags
			const tags: string[] = [];
			while (i < tokens.length && (tokens[i] ?? "").startsWith("_")) {
				tags.push(tokens[i] ?? "");
				i++;
			}

			if (tags.length === 0) continue;

			// Check if this is the _atom_site table
			const isAtomSite = tags.some((t) => t.startsWith("_atom_site."));

			if (isAtomSite) {
				const tagMap: Record<string, number> = {};
				for (let tIdx = 0; tIdx < tags.length; tIdx++) {
					const tag = tags[tIdx];
					if (tag) tagMap[tag] = tIdx;
				}

				const colCount = tags.length;

				// Parse rows until next loop_, tag, or data_
				while (
					i < tokens.length &&
					!tokens[i]?.startsWith("_") &&
					tokens[i] !== "loop_" &&
					!tokens[i]?.startsWith("data_")
				) {
					if (i + colCount > tokens.length) break;

					const rowTokens = tokens.slice(i, i + colCount);
					i += colCount;

					function getVal(subtag: string, fallback = ""): string {
						const fullName = `_atom_site.${subtag}`;
						const idx = tagMap[fullName];
						if (idx !== undefined) {
							const v = rowTokens[idx] ?? fallback;
							return v === "?" || v === "." ? fallback : v;
						}
						return fallback;
					}

					const groupPdb = getVal("group_PDB", "ATOM");
					const atomId = getVal("id", "0");
					const typeSymbol = getVal("type_symbol", "C");
					const atomName =
						getVal("label_atom_id") || getVal("auth_atom_id") || typeSymbol;
					const residue =
						getVal("label_comp_id") || getVal("auth_comp_id") || "UNK";
					const chain =
						getVal("auth_asym_id") || getVal("label_asym_id") || "A";
					const seqId = getVal("auth_seq_id") || getVal("label_seq_id") || "";
					const x = Number.parseFloat(getVal("Cartn_x", "0")) || 0;
					const y = Number.parseFloat(getVal("Cartn_y", "0")) || 0;
					const z = Number.parseFloat(getVal("Cartn_z", "0")) || 0;
					const occupancy =
						Number.parseFloat(getVal("occupancy", "1.0")) || 1.0;
					const bFactor =
						Number.parseFloat(getVal("B_iso_or_equiv", "0.0")) || 0.0;

					atoms.push({
						record: groupPdb,
						id: atomId,
						element: typeSymbol,
						atomName,
						residue,
						chain,
						seqId,
						x,
						y,
						z,
						occupancy,
						bFactor,
					});
				}
			} else {
				// Skip non-atom loop values
				const colCount = tags.length;
				while (
					i < tokens.length &&
					!tokens[i]?.startsWith("_") &&
					tokens[i] !== "loop_" &&
					!tokens[i]?.startsWith("data_")
				) {
					i += colCount;
				}
			}
		} else {
			i++;
		}
	}

	// 3. Resolve primary amino acid sequences per chain
	const chains: Record<string, string> = {};
	const seenResiduesByChain: Record<string, Set<string>> = {};

	for (const atom of atoms) {
		if (atom.record !== "ATOM") continue; // only standard polymer residues
		const chainId = atom.chain;
		if (!chains[chainId]) {
			chains[chainId] = "";
			seenResiduesByChain[chainId] = new Set<string>();
		}

		const resKey = `${atom.seqId}_${atom.residue}`;
		const seen = seenResiduesByChain[chainId];
		if (seen && !seen.has(resKey)) {
			seen.add(resKey);
			const oneLetter = AMINO_ACIDS[atom.residue.toUpperCase()] ?? "X";
			chains[chainId] += oneLetter;
		}
	}

	return {
		entryId,
		title,
		cell,
		chains,
		atoms,
	};
}

function escapeCsv(val: string): string {
	if (
		val.includes(",") ||
		val.includes('"') ||
		val.includes("\n") ||
		val.includes("\r")
	) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}

export function formatCifCsv(parsed: CifParseResult): string {
	const headers = [
		"record",
		"atom_id",
		"element",
		"atom_name",
		"residue",
		"chain",
		"seq_id",
		"x_angstrom",
		"y_angstrom",
		"z_angstrom",
		"occupancy",
		"b_factor",
	];

	const rows: string[] = [headers.map(escapeCsv).join(",")];

	for (const a of parsed.atoms) {
		const row = [
			a.record,
			a.id,
			a.element,
			a.atomName,
			a.residue,
			a.chain,
			a.seqId,
			a.x.toFixed(3),
			a.y.toFixed(3),
			a.z.toFixed(3),
			a.occupancy.toFixed(2),
			a.bFactor.toFixed(2),
		];
		rows.push(row.map(escapeCsv).join(","));
	}

	return rows.join("\r\n");
}

export function formatCifFasta(parsed: CifParseResult): string {
	const lines: string[] = [];
	for (const [chain, seq] of Object.entries(parsed.chains)) {
		lines.push(`>${parsed.entryId}|Chain ${chain}|${seq.length} residues`);
		// Wrap to 60 characters per line
		for (let i = 0; i < seq.length; i += 60) {
			lines.push(seq.slice(i, i + 60));
		}
	}
	return lines.join("\n");
}

export function formatCifJson(parsed: CifParseResult): string {
	return JSON.stringify(
		{
			entryId: parsed.entryId,
			title: parsed.title,
			unitCell: {
				dimensionsAngstrom: {
					a: parsed.cell.a,
					b: parsed.cell.b,
					c: parsed.cell.c,
				},
				anglesDegrees: {
					alpha: parsed.cell.alpha,
					beta: parsed.cell.beta,
					gamma: parsed.cell.gamma,
				},
			},
			chains: parsed.chains,
			totalAtoms: parsed.atoms.length,
			atoms: parsed.atoms,
		},
		null,
		2,
	);
}

export function convertCif(
	text: string,
	options?: {
		json?: boolean;
		fasta?: boolean;
	},
): string {
	const parsed = parseCif(text);

	if (options?.json) {
		return formatCifJson(parsed);
	}

	if (options?.fasta) {
		return formatCifFasta(parsed);
	}

	return formatCifCsv(parsed);
}
