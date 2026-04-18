import { describe, expect, it } from "vitest"
import { buildBracket } from "../bracket.js"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodesAt(
	nodes: ReturnType<typeof buildBracket>,
	bracket: "W" | "L" | "GF",
	round: number,
) {
	return nodes.filter((n) => n.bracket === bracket && n.round === round)
}

/**
 * Vérifie que chaque match LB R1 reçoit bien deux références loserTo depuis WB R1.
 * Retourne le nombre de slots par match LB R1.
 */
function lbR1SlotCounts(
	nodes: ReturnType<typeof buildBracket>,
	lbR1Round: number,
): number[] {
	const lbR1Ids = new Set(
		nodes
			.filter((n) => n.bracket === "L" && n.round === lbR1Round)
			.map((n) => n.id),
	)
	// Pour chaque match LB R1, compter combien de nœuds WB R1 pointent vers lui
	const counts = new Map<string, number>()
	for (const id of lbR1Ids) counts.set(id, 0)
	for (const n of nodes) {
		if (n.loserTo && lbR1Ids.has(n.loserTo.nodeId)) {
			counts.set(n.loserTo.nodeId, (counts.get(n.loserTo.nodeId) ?? 0) + 1)
		}
	}
	return [...counts.values()]
}

// ─── Tests structure LB pour effectifs non-puissance-de-2 ────────────────────

describe("buildBracket — structure LB pour effectifs non-puissance-de-2", () => {
	it("8 joueurs : structure de référence inchangée (régression)", () => {
		const nodes = buildBracket(8, "double")
		// WB: 4+2+1=7, LB: 2+2+1+1=6, GF: 1 → 14 total
		expect(nodes.filter((n) => n.bracket === "W")).toHaveLength(7)
		expect(nodes.filter((n) => n.bracket === "L")).toHaveLength(6)
		expect(nodes.filter((n) => n.bracket === "GF")).toHaveLength(1)
		// numWbRounds=3 → lbR1Round = 2*(3-1)-1 = 3
		expect(nodesAt(nodes, "L", 3)).toHaveLength(2)
		expect(lbR1SlotCounts(nodes, 3)).toEqual([2, 2])
		// Drop-in round 2 : 2 matchs, Reshuffle round 1 : 1 match
		expect(nodesAt(nodes, "L", 2)).toHaveLength(2)
		expect(nodesAt(nodes, "L", 1)).toHaveLength(1)
	})

	it("7 joueurs : LB R1 a 2 matchs bien formés (pas un orphelin)", () => {
		expect(() => buildBracket(7, "double")).not.toThrow()
		const nodes = buildBracket(7, "double")
		// numWbRounds=3, lbR1Round=3
		const lbR1 = nodesAt(nodes, "L", 3)
		expect(lbR1).toHaveLength(2)
		expect(lbR1SlotCounts(nodes, 3)).toEqual([2, 2])
	})

	it("6 joueurs : ne crash pas, LB R1 a 2 matchs bien formés", () => {
		expect(() => buildBracket(6, "double")).not.toThrow()
		const nodes = buildBracket(6, "double")
		// numWbRounds=3, lbR1Round=3
		const lbR1 = nodesAt(nodes, "L", 3)
		expect(lbR1).toHaveLength(2)
		expect(lbR1SlotCounts(nodes, 3)).toEqual([2, 2])
	})

	it("5 joueurs : ne crash pas, LB R1 a 2 matchs bien formés", () => {
		expect(() => buildBracket(5, "double")).not.toThrow()
		const nodes = buildBracket(5, "double")
		// numWbRounds=3, lbR1Round=3
		const lbR1 = nodesAt(nodes, "L", 3)
		expect(lbR1).toHaveLength(2)
		expect(lbR1SlotCounts(nodes, 3)).toEqual([2, 2])
	})

	it("9 joueurs : ne crash pas, LB R1 a 4 matchs bien formés", () => {
		// numWbRounds=4, lbR1Round = 2*(4-1)-1 = 5
		expect(() => buildBracket(9, "double")).not.toThrow()
		const nodes = buildBracket(9, "double")
		const lbR1 = nodesAt(nodes, "L", 5)
		expect(lbR1).toHaveLength(4)
		expect(lbR1SlotCounts(nodes, 5)).toEqual([2, 2, 2, 2])
	})

	it("tous les matchs WB ont un loserTo dans un mode double", () => {
		for (const n of [5, 6, 7, 8]) {
			const nodes = buildBracket(n, "double")
			const wbNodes = nodes.filter((node) => node.bracket === "W")
			for (const node of wbNodes) {
				expect(node.loserTo, `WB node sans loserTo pour n=${n}`).not.toBeNull()
			}
		}
	})
})
