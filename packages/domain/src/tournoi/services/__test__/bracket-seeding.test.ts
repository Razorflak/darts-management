import { describe, it } from "vitest"
import { separateGroupsForBracket } from "../bracket-seeding.js"

describe("bracket seeding", () => {
	it("separateGroupsForBracket", () => {
		// 8 joueurs, 4 groupes de 2, 2 qualifiés par groupe
		// Attendu : les joueurs d'un même groupe sont séparés au mieux dans le bracket
		// G0R1, G1R1, G2R1, G3R1, G0R2, G1R2, G2R2, G3R2
		// -> G0R1, G1R1, G2R1, G3R1, G3R2, G2R2, G1R2, G0R2
		const qualifiers = [
			{ teamId: "G0R1", groupNumber: 0, seed: 1 },
			{ teamId: "G1R1", groupNumber: 1, seed: 1 },
			{ teamId: "G2R1", groupNumber: 2, seed: 1 },
			{ teamId: "G3R1", groupNumber: 3, seed: 1 },
			{ teamId: "G0R2", groupNumber: 0, seed: 2 },
			{ teamId: "G1R2", groupNumber: 1, seed: 2 },
			{ teamId: "G2R2", groupNumber: 2, seed: 2 },
			{ teamId: "G3R2", groupNumber: 3, seed: 2 },
		]
		const positions = separateGroupsForBracket(qualifiers)
		console.log(positions)
	})
	it("separateGroupsForBracket 2", () => {
		// 8 joueurs, 4 groupes de 2, 2 qualifiés par groupe
		// Attendu : les joueurs d'un même groupe sont séparés au mieux dans le bracket
		// G0R1, G1R1, G2R1, G3R1, G0R2, G1R2, G2R2, G3R2
		// -> G0R1, G1R1, G2R1, G3R1, G3R2, G2R2, G1R2, G0R2
		const qualifiers = [
			{ teamId: "id1", groupNumber: 0, seed: 1 },
			{ teamId: "id2", groupNumber: 0, seed: 2 },
			{ teamId: "id3", groupNumber: 0, seed: 4 },
			{ teamId: "id4", groupNumber: 0, seed: 3 },
			{ teamId: "id5", groupNumber: 1, seed: 4 },
			{ teamId: "id6", groupNumber: 1, seed: 1 },
			{ teamId: "id7", groupNumber: 1, seed: 3 },
			{ teamId: "id8", groupNumber: 1, seed: 2 },
		]
		const positions = separateGroupsForBracket(qualifiers)
		console.log(positions)
	})
})
