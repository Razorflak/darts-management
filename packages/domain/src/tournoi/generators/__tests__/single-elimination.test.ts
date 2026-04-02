import { describe, expect, it } from "vitest"
import {
	generateSingleEliminationBracket,
	getBracket,
} from "../single-elimination.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"

// Helper: check if a pair [a,b] or [b,a] is in the bracket result
function hasPair(
	result: Array<[number | null, number | null]>,
	x: number | null,
	y: number | null,
): boolean {
	return result.some(([a, b]) => (a === x && b === y) || (a === y && b === x))
}

describe("getBracket", () => {
	it("getBracket(4) returns 2 matches with pairs {1,4} and {2,3}", () => {
		const result = getBracket(4)
		expect(result).toHaveLength(2)
		expect(hasPair(result, 1, 4)).toBe(true)
		expect(hasPair(result, 2, 3)).toBe(true)
	})

	it("getBracket(8) returns 4 matches with correct seeding pairs", () => {
		const result = getBracket(8)
		expect(result).toHaveLength(4)
		// Standard seeding: 1v8, 2v7, 3v6, 4v5
		expect(hasPair(result, 1, 8)).toBe(true)
		expect(hasPair(result, 2, 7)).toBe(true)
		expect(hasPair(result, 3, 6)).toBe(true)
		expect(hasPair(result, 4, 5)).toBe(true)
	})

	it("getBracket(5) returns 4 matches with 3 BYEs (seeds 6,7,8 → null)", () => {
		const result = getBracket(5)
		expect(result).toHaveLength(4)
		// Seed 5 participates, seeds 6-8 are null
		const nullPairs = result.filter(([a, b]) => a === null || b === null)
		expect(nullPairs).toHaveLength(3)
	})

	it("getBracket(2) returns 1 match: [[1,2]]", () => {
		const result = getBracket(2)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual([1, 2])
	})

	it("getBracket(1) returns 1 match with one null (BYE)", () => {
		const result = getBracket(1)
		expect(result).toHaveLength(1)
		// Only one participant, the other is BYE
		const [a, b] = result[0]
		expect([a, b]).toContain(1)
		expect([a, b]).toContain(null)
	})
})

describe("generateSingleEliminationBracket", () => {
	const tiers = [{ round: 0, setsToWin: 2, legsPerSet: 3 }]

	it("8 teams creates 7 matches (4 QF + 2 SF + 1 Final)", () => {
		const teams = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 1, tiers)
		expect(matches).toHaveLength(7)
	})

	it("advances_to_match_id links QF → SF → Final correctly", () => {
		const teams = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 1, tiers)
		// QF matches (highest round_number) should advance to SF matches
		const maxRound = Math.max(...matches.map((m) => m.round_number))
		const qf = matches.filter((m) => m.round_number === maxRound)
		for (const m of qf) {
			expect(m.advances_to_match_id).not.toBeNull()
			const target = matches.find((x) => x.id === m.advances_to_match_id)
			expect(target).not.toBeUndefined()
			expect(target?.round_number).toBeLessThan(maxRound)
		}
	})

	it("BYE matches (one team null) have status 'bye'", () => {
		// 3 teams: bracket size = 4 → 1 BYE match
		const teams = Array.from({ length: 3 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 1, tiers)
		const byeMatches = matches.filter((m) => m.status === "bye")
		expect(byeMatches.length).toBeGreaterThan(0)
		for (const m of byeMatches) {
			const hasNull = m.team_a_id === null || m.team_b_id === null
			expect(hasNull).toBe(true)
		}
	})

	it("bracket with 3 teams: first round has 2 matches, 1 final", () => {
		const teams = Array.from({ length: 3 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 1, tiers)
		// bracket size = 4 → 3 matches (2 QF + 1 Final)
		expect(matches).toHaveLength(3)
		const maxRound = Math.max(...matches.map((m) => m.round_number))
		const firstRound = matches.filter((m) => m.round_number === maxRound)
		expect(firstRound).toHaveLength(2)
	})

	it("per-round sets_to_win/legs_per_set from tiers applied correctly", () => {
		const tiersConfig = [
			{ round: 0, setsToWin: 3, legsPerSet: 5 }, // final
			{ round: 1, setsToWin: 2, legsPerSet: 3 }, // semi
		]
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(
			teams,
			phaseId,
			1,
			tiersConfig,
		)
		// Final (round_number = 0) → setsToWin = 3
		const final = matches.find((m) => m.round_number === 0)
		expect(final?.sets_to_win).toBe(3)
		expect(final?.legs_per_set).toBe(5)
		// Semis (round_number = 1) → setsToWin = 2
		const semis = matches.filter((m) => m.round_number === 1)
		for (const m of semis) {
			expect(m.sets_to_win).toBe(2)
			expect(m.legs_per_set).toBe(3)
		}
	})

	it("event_match_id is assigned sequentially from startEventMatchId", () => {
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 10, tiers)
		const ids = matches.map((m) => m.event_match_id).sort((a, b) => a - b)
		expect(ids[0]).toBe(10)
		expect(ids[ids.length - 1]).toBe(12)
	})

	it("all matches have the correct phase_id", () => {
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const matches = generateSingleEliminationBracket(teams, phaseId, 1, tiers)
		for (const m of matches) {
			expect(m.phase_id).toBe(phaseId)
		}
	})
})
