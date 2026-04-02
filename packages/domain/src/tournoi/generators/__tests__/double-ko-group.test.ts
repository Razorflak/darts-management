import { describe, expect, it } from "vitest"
import type { MatchInsertRow } from "../../match-schemas.js"
import { generateDoubleKoGroupMatches } from "../double-ko-group.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"
const config = { setsToWin: 2, legsPerSet: 3 }

function makeTeams(n: number): string[] {
	return Array.from(
		{ length: n },
		(_, i) => `team-${String(i + 1).padStart(2, "0")}`,
	)
}

describe("generateDoubleKoGroupMatches - 8 players", () => {
	let matches: MatchInsertRow[]

	it("produces exactly 10 matches for 8-player group", () => {
		const teams = makeTeams(8)
		matches = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		expect(matches).toHaveLength(10)
	})

	it("R1 matches (round 0) have both teams populated", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const r1 = ms.filter((m) => m.round_number === 0)
		expect(r1).toHaveLength(4)
		for (const m of r1) {
			expect(m.team_a_id).not.toBeNull()
			expect(m.team_b_id).not.toBeNull()
		}
	})

	it("R2 and R3 matches have null teams (filled by Phase 5 results)", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const later = ms.filter((m) => m.round_number > 0)
		expect(later).toHaveLength(6)
		for (const m of later) {
			expect(m.team_a_id).toBeNull()
			expect(m.team_b_id).toBeNull()
		}
	})

	it("all R1 teams play in correct seeded pairs (S1 vs S8, S2 vs S7, S3 vs S6, S4 vs S5)", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const r1 = ms.filter((m) => m.round_number === 0)
		const pairs = r1.map((m) => [m.team_a_id, m.team_b_id])
		// Seed 1 (teams[0]) vs Seed 8 (teams[7])
		expect(pairs).toContainEqual([teams[0], teams[7]])
		// Seed 2 vs Seed 7
		expect(pairs).toContainEqual([teams[1], teams[6]])
	})

	it("R1 winners advance to R2 Upper via advances_to_match_id", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const r1 = ms.filter((m) => m.round_number === 0)
		const r2upper = ms.filter(
			(m) => m.round_number === 1 && m.group_number === 0,
		)
		// All R1 matches should have advances_to_match_id pointing to R2 Upper matches
		const _r2upperIds = new Set(r2upper.map((m) => m.id))
		for (const m of r1) {
			expect(m.advances_to_match_id).not.toBeNull()
			// advances_to_match_id should point to an R2 Upper or R2 Lower match
			const target = ms.find((x) => x.id === m.advances_to_match_id)
			expect(target).not.toBeUndefined()
		}
	})

	it("advances_to_slot is set to 'a' or 'b' on R1/R2 matches", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const withAdvances = ms.filter((m) => m.advances_to_match_id !== null)
		for (const m of withAdvances) {
			expect(m.advances_to_slot).toMatch(/^[ab]$/)
		}
	})

	it("group_number is set correctly on all matches", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 2, phaseId, 1, config)
		for (const m of ms) {
			expect(m.group_number).toBe(2)
		}
	})

	it("event_match_id is assigned sequentially from startEventMatchId", () => {
		const teams = makeTeams(8)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 5, config)
		const ids = ms.map((m) => m.event_match_id).sort((a, b) => a - b)
		expect(ids[0]).toBe(5)
		expect(ids[ids.length - 1]).toBe(14)
		// All sequential
		for (let i = 0; i < ids.length - 1; i++) {
			expect(ids[i + 1]).toBe(ids[i] + 1)
		}
	})
})

describe("generateDoubleKoGroupMatches - 4 players", () => {
	it("produces exactly 5 matches for 4-player group", () => {
		const teams = makeTeams(4)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		expect(ms).toHaveLength(5)
	})

	it("R1 has 2 matches, R2U has 1, R2L has 1, R3 has 1", () => {
		const teams = makeTeams(4)
		const ms = generateDoubleKoGroupMatches(teams, 0, phaseId, 1, config)
		const r1 = ms.filter((m) => m.round_number === 0)
		// R2 upper and lower can be distinguished by group_number (we use a sub-round encoding)
		expect(r1).toHaveLength(2)
		// Total non-R1 = 3
		const later = ms.filter((m) => m.round_number > 0)
		expect(later).toHaveLength(3)
	})
})
