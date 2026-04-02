import { describe, expect, it } from "vitest"
import { bergerRounds, generateRoundRobinMatches } from "../round-robin.js"

describe("bergerRounds", () => {
	it("produces N-1 rounds for N even teams (4 teams → 3 rounds)", () => {
		const rounds = bergerRounds(["A", "B", "C", "D"])
		expect(rounds).toHaveLength(3)
		// Each round has 2 matches
		for (const round of rounds) {
			expect(round).toHaveLength(2)
		}
	})

	it("produces N rounds for N odd teams (3 teams → 3 rounds of 1 match each)", () => {
		const rounds = bergerRounds(["A", "B", "C"])
		// Odd: add BYE → 4 teams → 3 rounds, but BYE matches filtered out → 1 match each
		expect(rounds).toHaveLength(3)
		for (const round of rounds) {
			expect(round).toHaveLength(1)
		}
	})

	it("produces N rounds for 5 teams (5 rounds of 2 matches each)", () => {
		const rounds = bergerRounds(["A", "B", "C", "D", "E"])
		// Odd: add BYE → 6 teams → 5 rounds, BYE matches filtered
		expect(rounds).toHaveLength(5)
		for (const round of rounds) {
			expect(round).toHaveLength(2)
		}
	})

	it("no team plays twice in the same round", () => {
		const teams = ["A", "B", "C", "D", "E", "F"]
		const rounds = bergerRounds(teams)
		for (const round of rounds) {
			const participating = round.flat()
			const unique = new Set(participating)
			expect(unique.size).toBe(participating.length)
		}
	})

	it("every pair meets exactly once across all rounds", () => {
		const teams = ["A", "B", "C", "D", "E", "F"]
		const rounds = bergerRounds(teams)
		const pairs = new Map<string, number>()
		for (const round of rounds) {
			for (const [a, b] of round) {
				const key = [a, b].sort().join("-")
				pairs.set(key, (pairs.get(key) ?? 0) + 1)
			}
		}
		// All pairs appear exactly once
		for (const [, count] of pairs) {
			expect(count).toBe(1)
		}
		// Number of pairs = N*(N-1)/2
		const n = teams.length
		expect(pairs.size).toBe((n * (n - 1)) / 2)
	})
})

describe("generateRoundRobinMatches", () => {
	const phaseId = "550e8400-e29b-41d4-a716-446655440000"
	const config = { setsToWin: 2, legsPerSet: 3 }

	it("2 groups of 3 produces 6 matches total (3 per group)", () => {
		const groups = [
			["T1", "T2", "T3"],
			["T4", "T5", "T6"],
		]
		const matches = generateRoundRobinMatches(groups, phaseId, 1, config)
		expect(matches).toHaveLength(6)
	})

	it("each match has correct group_number", () => {
		const groups = [
			["T1", "T2", "T3"],
			["T4", "T5", "T6"],
		]
		const matches = generateRoundRobinMatches(groups, phaseId, 1, config)
		const group0 = matches.filter((m) => m.group_number === 0)
		const group1 = matches.filter((m) => m.group_number === 1)
		expect(group0).toHaveLength(3)
		expect(group1).toHaveLength(3)
	})

	it("event_match_id is assigned sequentially starting from startId", () => {
		const groups = [["T1", "T2", "T3"]]
		const matches = generateRoundRobinMatches(groups, phaseId, 5, config)
		const ids = matches.map((m) => m.event_match_id).sort((a, b) => a - b)
		expect(ids).toEqual([5, 6, 7])
	})

	it("each match has correct sets_to_win and legs_per_set from config", () => {
		const groups = [["T1", "T2"]]
		const matches = generateRoundRobinMatches(groups, phaseId, 1, config)
		for (const m of matches) {
			expect(m.sets_to_win).toBe(2)
			expect(m.legs_per_set).toBe(3)
		}
	})

	it("each match has phase_id, status pending, and null advances_to/referee fields", () => {
		const groups = [["T1", "T2"]]
		const matches = generateRoundRobinMatches(groups, phaseId, 1, config)
		for (const m of matches) {
			expect(m.phase_id).toBe(phaseId)
			expect(m.status).toBe("pending")
			expect(m.referee_team_id).toBeNull()
			expect(m.advances_to_match_id).toBeNull()
			expect(m.advances_to_slot).toBeNull()
		}
	})

	it("each match has round_number and position set correctly", () => {
		const groups = [["T1", "T2", "T3"]]
		const matches = generateRoundRobinMatches(groups, phaseId, 1, config)
		// 3 rounds of 1 match each
		const roundNums = matches.map((m) => m.round_number).sort((a, b) => a - b)
		expect(roundNums).toEqual([0, 1, 2])
		for (const m of matches) {
			expect(m.position).toBe(0)
		}
	})
})
