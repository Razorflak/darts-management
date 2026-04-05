import { describe, expect, it } from "vitest"
import { assignTeamsToPhase0 } from "../defaults.js"
import { generateDoubleKoStructure } from "../double-ko-group.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"
const tournamentId = "550e8400-e29b-41d4-a716-446655440001"
const config = { setsToWin: 2, legsPerSet: 3 }

function makeTeams(n: number): string[] {
	return Array.from(
		{ length: n },
		(_, i) => `team-${String(i + 1).padStart(2, "0")}`,
	)
}

describe("generateDoubleKoStructure — 8 players, 2 qualifiers", () => {
	it("produces 13 matches (DE 14 - 1 GF) and 13 bracket_infos", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		// Full DE for 8 = 14 matches. Cut 1 layer (GF) → 13.
		expect(result.matches).toHaveLength(13)
		expect(result.bracketInfos).toHaveLength(13)
	})

	it("no GF bracket in the infos", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		expect(result.bracketInfos.some((i) => i.bracket === "GF")).toBe(false)
	})

	it("terminal WB and LB infos have winner_goes_to_info_id = null", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		const terminals = result.bracketInfos.filter(
			(i) => i.winner_goes_to_info_id === null,
		)
		// 2 qualifiers → 2 terminal matches (1 WB final, 1 LB final)
		expect(terminals).toHaveLength(2)
	})

	it("event_match_id assigned sequentially", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			5,
			config,
		)
		const ids = result.matches
			.map((m) => m.event_match_id)
			.sort((a, b) => a - b)
		expect(ids[0]).toBe(5)
		expect(ids[ids.length - 1]).toBe(17)
	})
})

describe("generateDoubleKoStructure — 8 players, 4 qualifiers", () => {
	it("produces 10 matches (WB R1:4 + LB R1:2 + WB R2:2 + LB drop-in R2:2)", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			4,
			phaseId,
			tournamentId,
			1,
			config,
		)
		expect(result.matches).toHaveLength(10)
	})

	it("4 terminal infos (winner_goes_to_info_id = null)", () => {
		const result = generateDoubleKoStructure(
			8,
			8,
			4,
			phaseId,
			tournamentId,
			1,
			config,
		)
		const terminals = result.bracketInfos.filter(
			(i) => i.winner_goes_to_info_id === null,
		)
		expect(terminals).toHaveLength(4)
	})
})

describe("generateDoubleKoStructure — 4 players, 2 qualifiers", () => {
	it("produces 5 matches (DE 6 - 1 GF)", () => {
		const result = generateDoubleKoStructure(
			4,
			4,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		expect(result.matches).toHaveLength(5)
	})
})

describe("assignTeamsToPhase0 — double KO", () => {
	it("assigns teams to R1 WB slots via seeds (S1 vs SN, S2 vs SN-1...)", () => {
		const teams = makeTeams(8)
		const structure = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		const result = assignTeamsToPhase0(structure, teams)

		// R1 WB matches have seeds → teams should be assigned
		const infoById = new Map(result.bracketInfos.map((i) => [i.id, i]))
		const r1Matches = result.matches.filter((m) => {
			if (!m.bracket_info_id) return false
			const info = infoById.get(m.bracket_info_id)
			return info?.bracket === "W" && info.seed_a !== null
		})
		expect(r1Matches.length).toBeGreaterThan(0)
		for (const m of r1Matches) {
			expect(m.team_a_id).not.toBeNull()
			expect(m.team_b_id).not.toBeNull()
		}
	})

	it("non-R1 matches stay null after assignment", () => {
		const teams = makeTeams(8)
		const structure = generateDoubleKoStructure(
			8,
			8,
			2,
			phaseId,
			tournamentId,
			1,
			config,
		)
		const result = assignTeamsToPhase0(structure, teams)

		const infoById = new Map(result.bracketInfos.map((i) => [i.id, i]))
		const laterMatches = result.matches.filter((m) => {
			if (!m.bracket_info_id) return false
			const info = infoById.get(m.bracket_info_id)
			return info?.seed_a === null
		})
		for (const m of laterMatches) {
			expect(m.team_a_id).toBeNull()
			expect(m.team_b_id).toBeNull()
		}
	})
})
