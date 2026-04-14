import { describe, expect, it } from "vitest"
import {
	bergerRounds,
	computeGroupSizes,
	generateRoundRobinMatches,
} from "../round-robin.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"
const tournamentId = "550e8400-e29b-41d4-a716-446655440001"
const config = { setsToWin: 2, legsPerSet: 3 }

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
	it("2 groups of 3 produces 6 matches total (3 per group)", () => {
		const groups = [
			["T1", "T2", "T3"],
			["T4", "T5", "T6"],
		]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		expect(result.matches).toHaveLength(6)
	})

	it("each match has a round_robin_info with correct group_number", () => {
		const groups = [
			["T1", "T2", "T3"],
			["T4", "T5", "T6"],
		]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		const group0Infos = result.roundRobinInfos.filter(
			(i) => i.group_number === 0,
		)
		const group1Infos = result.roundRobinInfos.filter(
			(i) => i.group_number === 1,
		)
		expect(group0Infos).toHaveLength(3)
		expect(group1Infos).toHaveLength(3)
	})

	it("event_match_id is assigned sequentially starting from startId", () => {
		const groups = [["T1", "T2", "T3"]]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			5,
			config,
		)
		const ids = result.matches
			.map((m) => m.event_match_id)
			.sort((a, b) => a - b)
		expect(ids).toEqual([5, 6, 7])
	})

	it("each match has correct sets_to_win and legs_per_set from config", () => {
		const groups = [["T1", "T2"]]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		for (const m of result.matches) {
			expect(m.sets_to_win).toBe(2)
			expect(m.legs_per_set).toBe(3)
		}
	})

	it("each match has phase_id, status pending, and null referee_team_id", () => {
		const groups = [["T1", "T2"]]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		for (const m of result.matches) {
			expect(m.phase_id).toBe(phaseId)
			expect(m.status).toBe("pending")
			expect(m.referee_team_id).toBeNull()
			expect(m.bracket_info_id).toBeNull()
			expect(m.round_robin_info_id).not.toBeNull()
		}
	})

	it("round_robin_infos have correct round_number and position", () => {
		const groups = [["T1", "T2", "T3"]]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		// 3 rounds of 1 match each
		const roundNums = result.roundRobinInfos
			.map((i) => i.round_number)
			.sort((a, b) => a - b)
		expect(roundNums).toEqual([0, 1, 2])
		for (const i of result.roundRobinInfos) {
			expect(i.position).toBe(0)
		}
	})

	it("round_robin_infos have slot_a and slot_b set (1-based seeds)", () => {
		const groups = [["T1", "T2", "T3", "T4"]]
		const result = generateRoundRobinMatches(
			groups,
			phaseId,
			tournamentId,
			1,
			config,
		)
		for (const info of result.roundRobinInfos) {
			expect(info.slot_a).toBeGreaterThan(0)
			expect(info.slot_b).toBeGreaterThan(0)
			expect(info.slot_a).not.toBe(info.slot_b)
		}
	})
})

describe("computeGroupSize", () => {
	it("returns correct group size for 16 players with 4 groups", () => {
		const r = computeGroupSizes(77, 4)
		console.log(r)
	})
})
