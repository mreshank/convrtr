import { describe, expect, it } from "vitest";
import { convertCif, parseCif } from "../parser";

const SYNTHETIC_CIF = `
data_1CRN
#
_entry.id   1CRN
_struct.title  'WATER STRUCTURE OF A HYDROPHOBIC PROTEIN AT ATOMIC RESOLUTION'
_cell.length_a    40.960
_cell.length_b    18.650
_cell.length_c    22.520
_cell.angle_alpha 90.00
_cell.angle_beta  90.77
_cell.angle_gamma 90.00
#
loop_
_atom_site.group_PDB
_atom_site.id
_atom_site.type_symbol
_atom_site.label_atom_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
_atom_site.occupancy
_atom_site.B_iso_or_equiv
ATOM   1 N  N  THR A 1 17.047 14.099 3.625 1.00 13.79
ATOM   2 C  CA THR A 1 16.967 12.784 4.338 1.00 11.23
ATOM   3 C  C  THR A 1 15.685 12.755 5.133 1.00 10.45
ATOM   4 O  O  THR A 1 15.268 13.825 5.594 1.00 12.01
ATOM   5 C  CB THR A 1 18.156 12.564 5.275 1.00 12.28
ATOM   6 N  N  CYS A 2 15.068 11.579 5.289 1.00 9.87
ATOM   7 C  CA CYS A 2 13.834 11.458 6.035 1.00 8.76
HETATM 8 O  O  HOH A . 10.500 5.200  8.100 1.00 20.00
`;

describe("Crystallographic Information Framework (.cif / .mmcif) Parser", () => {
	it("parses header, cell dimensions, atoms, and chains", () => {
		const parsed = parseCif(SYNTHETIC_CIF);

		expect(parsed.entryId).toBe("1CRN");
		expect(parsed.title).toContain("WATER STRUCTURE");
		expect(parsed.cell.a).toBe(40.96);
		expect(parsed.cell.b).toBe(18.65);
		expect(parsed.cell.c).toBe(22.52);
		expect(parsed.cell.beta).toBe(90.77);
		expect(parsed.atoms).toHaveLength(8);

		const firstAtom = parsed.atoms[0];
		expect(firstAtom).toBeDefined();
		if (firstAtom) {
			expect(firstAtom.record).toBe("ATOM");
			expect(firstAtom.id).toBe("1");
			expect(firstAtom.element).toBe("N");
			expect(firstAtom.atomName).toBe("N");
			expect(firstAtom.residue).toBe("THR");
			expect(firstAtom.chain).toBe("A");
			expect(firstAtom.x).toBe(17.047);
			expect(firstAtom.bFactor).toBe(13.79);
		}

		// Sequence of Chain A should be "TC" (THR + CYS)
		expect(parsed.chains["A"]).toBe("TC");
	});

	it("converts atomic coordinates into RFC 4180 CSV spreadsheet", () => {
		const csv = convertCif(SYNTHETIC_CIF);

		expect(csv).toContain("record,atom_id,element,atom_name,residue,chain");
		expect(csv).toContain("ATOM,1,N,N,THR,A,1,17.047,14.099,3.625,1.00,13.79");
		expect(csv).toContain("HETATM,8,O,O,HOH,A,,10.500,5.200,8.100,1.00,20.00");
	});

	it("formats amino acid sequences to FASTA format", () => {
		const fasta = convertCif(SYNTHETIC_CIF, { fasta: true });

		expect(fasta).toContain(">1CRN|Chain A|2 residues");
		expect(fasta).toContain("TC");
	});

	it("formats complete structure to structured JSON", () => {
		const jsonText = convertCif(SYNTHETIC_CIF, { json: true });
		const parsed = JSON.parse(jsonText);

		expect(parsed.entryId).toBe("1CRN");
		expect(parsed.unitCell.dimensionsAngstrom.a).toBe(40.96);
		expect(parsed.totalAtoms).toBe(8);
		expect(parsed.chains["A"]).toBe("TC");
	});
});
