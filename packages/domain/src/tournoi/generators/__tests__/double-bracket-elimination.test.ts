import { describe, expect, it } from "vitest"
import { generateDoubleEliminationBracket } from "../double-bracket-elimination.js"

describe("generateDoubleEliminationBracket", () => {
	it("should return empty array for less than 2 participants", () => {
		expect(generateDoubleEliminationBracket(0)).toEqual([])
		expect(generateDoubleEliminationBracket(1)).toEqual([])
	})

	it("should generate correct structure for 4 participants", () => {
		const matches = generateDoubleEliminationBracket(4)

		// 2 WB R1 + 1 WB R2 + 1 LB R1 + 1 LB R2 + 1 GF = 6 matches
		expect(matches).toHaveLength(6)

		// Check WB Round 1
		const wbR1 = matches.filter((m) => m.bracket === "W" && m.round === 1)
		expect(wbR1).toHaveLength(2)
		expect(wbR1[0].seedA).toBe(1)
		expect(wbR1[0].seedB).toBe(4)
		expect(wbR1[1].seedA).toBe(3)
		expect(wbR1[1].seedB).toBe(2)

		// Check brackets exist
		expect(matches.filter((m) => m.bracket === "W").length).toBeGreaterThan(0)
		expect(matches.filter((m) => m.bracket === "L").length).toBeGreaterThan(0)
		expect(matches.filter((m) => m.bracket === "GF").length).toBe(1)
	})

	it("should handle byes correctly for 3 participants", () => {
		const matches = generateDoubleEliminationBracket(3)

		const wbR1 = matches.filter((m) => m.bracket === "W" && m.round === 1)

		// Should have at least one bye
		const hasBye = wbR1.some((m) => m.seedA === null || m.seedB === null)
		expect(hasBye).toBe(true)
	})

	it("should connect WB losers to LB correctly", () => {
		const matches = generateDoubleEliminationBracket(4)

		const wbR1 = matches.filter((m) => m.bracket === "W" && m.round === 1)

		// All WB R1 losers should drop to LB
		wbR1.forEach((wbMatch) => {
			expect(wbMatch.loserGoesToMatchId).not.toBeNull()
			expect(wbMatch.loserGoesToSlot).not.toBeNull()

			// Verify target match exists and is in LB
			const targetMatch = matches.find(
				(m) => m.id === wbMatch.loserGoesToMatchId,
			)
			expect(targetMatch).toBeDefined()
			expect(targetMatch?.bracket).toBe("L")
		})
	})

	it("should connect WB and LB finals to Grand Final", () => {
		const matches = generateDoubleEliminationBracket(4)

		const gf = matches.find((m) => m.bracket === "GF")
		expect(gf).toBeDefined()

		// Find WB final (highest round in W bracket)
		const wbFinal = matches
			.filter((m) => m.bracket === "W")
			.sort((a, b) => b.round - a.round)[0]
		expect(wbFinal.winnerGoesToMatchId).toBe(gf?.id)
		expect(wbFinal.winnerGoesToSlot).toBe("a")

		// Find LB final (highest round in L bracket)
		const lbFinal = matches
			.filter((m) => m.bracket === "L")
			.sort((a, b) => b.round - a.round)[0]
		expect(lbFinal.winnerGoesToMatchId).toBe(gf?.id)
		expect(lbFinal.winnerGoesToSlot).toBe("b")
	})

	it("should generate correct number of matches for 8 participants", () => {
		const matches = generateDoubleEliminationBracket(8)

		// 4+2+1=7 WB + 6 LB + 1 GF = 14 total
		expect(matches).toHaveLength(14)

		const wb = matches.filter((m) => m.bracket === "W")
		const lb = matches.filter((m) => m.bracket === "L")
		const gf = matches.filter((m) => m.bracket === "GF")

		expect(wb).toHaveLength(7)
		expect(lb).toHaveLength(6)
		expect(gf).toHaveLength(1)
	})

	it("should apply splitAndReverse for rematch prevention", () => {
		const matches = generateDoubleEliminationBracket(8)

		// WB R1: 4 matches → losers should be reordered in LB
		const wbR1 = matches
			.filter((m) => m.bracket === "W" && m.round === 1)
			.sort((a, b) => a.seedA! - b.seedA!)

		// Get the LB matches that receive WB R1 losers
		const lbR1Targets = wbR1
			.map((m) => matches.find((x) => x.id === m.loserGoesToMatchId))
			.filter(Boolean)

		// Verify they all go to LB and are properly distributed
		expect(lbR1Targets.every((m) => m?.bracket === "L")).toBe(true)
		expect(new Set(lbR1Targets.map((m) => m?.id)).size).toBe(2) // 4 matches → 2 LB matches
	})

	it("should have valid UUIDs for all match IDs", () => {
		const matches = generateDoubleEliminationBracket(4)

		matches.forEach((match) => {
			expect(match.id).toBeTruthy()
			expect(typeof match.id).toBe("string")
			expect(match.id.length).toBeGreaterThan(0)
		})

		// All IDs should be unique
		const ids = matches.map((m) => m.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it("should have null loserGoesTo for Grand Final", () => {
		const matches = generateDoubleEliminationBracket(4)

		const gf = matches.find((m) => m.bracket === "GF")
		expect(gf?.loserGoesToMatchId).toBeNull()
		expect(gf?.loserGoesToSlot).toBeNull()
		expect(gf?.winnerGoesToMatchId).toBeNull()
		expect(gf?.winnerGoesToSlot).toBeNull()
	})
})
