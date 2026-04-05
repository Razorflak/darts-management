import { describe, expect, it } from "vitest"
import {
	generateSingleEliminationBracket,
	getBracket,
} from "../single-elimination.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"
const tournamentId = "550e8400-e29b-41d4-a716-446655440001"

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
		expect(hasPair(result, 1, 8)).toBe(true)
		expect(hasPair(result, 2, 7)).toBe(true)
		expect(hasPair(result, 3, 6)).toBe(true)
		expect(hasPair(result, 4, 5)).toBe(true)
	})

	it("getBracket(5) returns 4 matches with 3 BYEs", () => {
		const result = getBracket(5)
		expect(result).toHaveLength(4)
		const nullPairs = result.filter(([a, b]) => a === null || b === null)
		expect(nullPairs).toHaveLength(3)
	})

	it("getBracket(2) returns 1 match: [[1,2]]", () => {
		const result = getBracket(2)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual([1, 2])
	})
})

describe("generateSingleEliminationBracket", () => {
	const tiers = [{ round: 0, setsToWin: 2, legsPerSet: 3 }]

	it("8 teams creates 7 matches and 7 bracket_infos", () => {
		const teams = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiers,
		)
		expect(result.matches).toHaveLength(7)
		expect(result.bracketInfos).toHaveLength(7)
		expect(result.roundRobinInfos).toHaveLength(0)
		console.log("JTA Result:", JSON.stringify(result, null, 2))
	})

	it("bracket_infos link via winner_goes_to_info_id (QF → SF → Final)", () => {
		const teams = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiers,
		)
		const infoById = new Map(result.bracketInfos.map((i) => [i.id, i]))
		const maxRound = Math.max(...result.bracketInfos.map((i) => i.round_number))
		const firstRoundInfos = result.bracketInfos.filter(
			(i) => i.round_number === maxRound,
		)
		for (const info of firstRoundInfos) {
			expect(info.winner_goes_to_info_id).not.toBeNull()
			const target = infoById.get(info.winner_goes_to_info_id!)
			expect(target).toBeDefined()
			expect(target?.round_number).toBeLessThan(maxRound)
		}
	})

	it("BYE matches (one team null) have status 'bye'", () => {
		const teams = Array.from({ length: 3 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiers,
		)
		const byeMatches = result.matches.filter((m) => m.status === "bye")
		expect(byeMatches.length).toBeGreaterThan(0)
		for (const m of byeMatches) {
			expect(m.team_a_id === null || m.team_b_id === null).toBe(true)
		}
	})

	it("per-round sets_to_win/legs_per_set from tiers applied correctly", () => {
		const tiersConfig = [
			{ round: 0, setsToWin: 3, legsPerSet: 5 },
			{ round: 1, setsToWin: 2, legsPerSet: 3 },
		]
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiersConfig,
		)
		const finalInfo = result.bracketInfos.find((i) => i.round_number === 0)
		const finalMatch = result.matches.find(
			(m) => m.bracket_info_id === finalInfo?.id,
		)
		expect(finalMatch?.sets_to_win).toBe(3)
		expect(finalMatch?.legs_per_set).toBe(5)

		const semiInfos = result.bracketInfos.filter((i) => i.round_number === 1)
		for (const info of semiInfos) {
			const m = result.matches.find((x) => x.bracket_info_id === info.id)
			expect(m?.sets_to_win).toBe(2)
			expect(m?.legs_per_set).toBe(3)
		}
	})

	it("event_match_id is assigned sequentially from startEventMatchId", () => {
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			10,
			tiers,
		)
		const ids = result.matches
			.map((m) => m.event_match_id)
			.sort((a, b) => a - b)
		expect(ids[0]).toBe(10)
		expect(ids[ids.length - 1]).toBe(12)
	})

	it("all matches have the correct phase_id and bracket_info_id not null", () => {
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiers,
		)
		for (const m of result.matches) {
			expect(m.phase_id).toBe(phaseId)
			expect(m.bracket_info_id).not.toBeNull()
		}
	})

	it("all bracket_infos have group_number = null (SE has no groups)", () => {
		const teams = Array.from({ length: 4 }, (_, i) => `team-${i + 1}`)
		const result = generateSingleEliminationBracket(
			teams,
			phaseId,
			tournamentId,
			1,
			tiers,
		)
		for (const info of result.bracketInfos) {
			expect(info.group_number).toBeNull()
		}
	})
})
