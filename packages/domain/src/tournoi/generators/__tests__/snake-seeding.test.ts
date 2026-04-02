import { describe, expect, it } from "vitest"
import { snakeDistribute } from "../snake-seeding.js"

describe("snakeDistribute", () => {
	it("distributes 6 teams into 3 groups of 2 using snake order", () => {
		const result = snakeDistribute(["A", "B", "C", "D", "E", "F"], 3, 2)
		expect(result).toEqual([
			["A", "F"],
			["B", "E"],
			["C", "D"],
		])
	})

	it("distributes 7 teams into 3 groups where last group receives remainder", () => {
		// 7 teams, playersPerGroup=3: floor(7/3)=2 full groups + remainder
		// groupCount = ceil(7/3) = 3
		// First 2 groups get exactly 3, last group gets remainder (1 extra)
		// Snake: A->g0, B->g1, C->g2, D->g2, E->g1, F->g0, G->g2 (remainder to last)
		const result = snakeDistribute(["A", "B", "C", "D", "E", "F", "G"], 3, 3)
		// Per CONTEXT.md: fill groups to playersPerGroup, last group gets remainder
		// Snake for 6 (groupCount-1 * playersPerGroup = 2*3 = 6), then G -> last group
		expect(result).toEqual([
			["A", "F"],
			["B", "E"],
			["C", "D", "G"],
		])
	})

	it("puts all teams into a single group when groupCount is 1", () => {
		const result = snakeDistribute(["A", "B", "C", "D"], 1, 4)
		expect(result).toEqual([["A", "B", "C", "D"]])
	})

	it("handles teams where count equals playersPerGroup * groupCount exactly", () => {
		// 8 teams, 4 per group, 2 groups
		const result = snakeDistribute(
			["A", "B", "C", "D", "E", "F", "G", "H"],
			2,
			4,
		)
		// Snake: A->g0, B->g1, C->g1, D->g0, E->g0, F->g1, G->g1, H->g0
		expect(result).toHaveLength(2)
		expect(result[0]).toHaveLength(4)
		expect(result[1]).toHaveLength(4)
		// All 8 teams present
		const flat = result.flat().sort()
		expect(flat).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"])
	})

	it("returns fewer groups when teams count is less than groupCount * playersPerGroup", () => {
		// 4 teams, playersPerGroup=2, groupCount=3 requested but only 2 full groups possible
		const result = snakeDistribute(["A", "B", "C", "D"], 3, 2)
		expect(result).toHaveLength(2)
		expect(result[0]).toEqual(["A", "D"])
		expect(result[1]).toEqual(["B", "C"])
	})

	it("assigns seed 1 to first group and alternates correctly in snake order", () => {
		// 9 teams, 3 per group, 3 groups
		const result = snakeDistribute(
			["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"],
			3,
			3,
		)
		// Snake for 9 (all fit, groupCount=3, 3 per group, 9/3=3, exact)
		// S1->g0, S2->g1, S3->g2, S4->g2, S5->g1, S6->g0, S7->g0, S8->g1, S9->g2
		expect(result[0]).toContain("S1")
		expect(result[0]).not.toContain("S2")
		expect(result[0]).not.toContain("S3")
	})
})
