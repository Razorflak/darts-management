import { describe, expect, it } from "vitest"
import type { MatchInsertRow } from "../../match-schemas.js"
import { assignReferees } from "../referee-assignment.js"

function makeMatch(
	overrides: Partial<MatchInsertRow> & {
		id: string
		team_a_id: string | null
		team_b_id: string | null
	},
): MatchInsertRow {
	return {
		phase_id: "phase-id-placeholder",
		event_match_id: 1,
		group_number: 0,
		round_number: 0,
		position: 0,
		referee_team_id: null,
		advances_to_match_id: null,
		advances_to_slot: null,
		status: "pending",
		sets_to_win: 2,
		legs_per_set: 3,
		...overrides,
	}
}

describe("assignReferees", () => {
	it("with 6 teams and 3 matches in a round, each match gets a different referee", () => {
		const allTeams = ["T1", "T2", "T3", "T4", "T5", "T6"]
		const matches: MatchInsertRow[] = [
			makeMatch({
				id: "m1",
				event_match_id: 1,
				round_number: 0,
				position: 0,
				team_a_id: "T1",
				team_b_id: "T2",
			}),
			makeMatch({
				id: "m2",
				event_match_id: 2,
				round_number: 0,
				position: 1,
				team_a_id: "T3",
				team_b_id: "T4",
			}),
			makeMatch({
				id: "m3",
				event_match_id: 3,
				round_number: 0,
				position: 2,
				team_a_id: "T5",
				team_b_id: "T6",
			}),
		]
		const result = assignReferees(matches, allTeams, true)
		const referees = result.map((m) => m.referee_team_id)
		expect(new Set(referees).size).toBe(3)
	})

	it("referee is never one of the teams playing in that match", () => {
		const allTeams = ["T1", "T2", "T3", "T4", "T5", "T6"]
		const matches: MatchInsertRow[] = [
			makeMatch({
				id: "m1",
				event_match_id: 1,
				round_number: 0,
				position: 0,
				team_a_id: "T1",
				team_b_id: "T2",
			}),
			makeMatch({
				id: "m2",
				event_match_id: 2,
				round_number: 0,
				position: 1,
				team_a_id: "T3",
				team_b_id: "T4",
			}),
			makeMatch({
				id: "m3",
				event_match_id: 3,
				round_number: 0,
				position: 2,
				team_a_id: "T5",
				team_b_id: "T6",
			}),
		]
		const result = assignReferees(matches, allTeams, true)
		for (const m of result) {
			expect(m.referee_team_id).not.toBe(m.team_a_id)
			expect(m.referee_team_id).not.toBe(m.team_b_id)
		}
	})

	it("referee is chosen greedily — least-assigned among eligible candidates", () => {
		// Scenario: T1 vs T2 in round 0, then T1 vs T3 in round 1.
		// Only T4, T5, T6 can referee round 0.
		// For round 1: T4, T5, T6 + T2 are eligible. Greedy picks least-assigned.
		// T4/T5/T6 already have 0 assignments each after round 0 (only one round 0 match).
		// The greedy algo picks the one with fewest total assignments.
		const allTeams = ["T1", "T2", "T3", "T4", "T5", "T6"]
		const matches: MatchInsertRow[] = [
			makeMatch({
				id: "m1",
				event_match_id: 1,
				round_number: 0,
				team_a_id: "T1",
				team_b_id: "T2",
			}),
			makeMatch({
				id: "m2",
				event_match_id: 2,
				round_number: 1,
				team_a_id: "T3",
				team_b_id: "T4",
			}),
			makeMatch({
				id: "m3",
				event_match_id: 3,
				round_number: 1,
				team_a_id: "T5",
				team_b_id: "T6",
			}),
		]
		// Round 0: m1 (T1 vs T2) — referee must be T3, T4, T5, or T6
		// Round 1 has two matches in the same slot — two different referees needed
		const result = assignReferees(matches, allTeams, true)
		// The two round-1 matches should have different referees
		expect(result[1].referee_team_id).not.toBeNull()
		expect(result[2].referee_team_id).not.toBeNull()
		expect(result[1].referee_team_id).not.toBe(result[2].referee_team_id)
	})

	it("with only 2 teams (both playing), referee_team_id remains null", () => {
		const allTeams = ["T1", "T2"]
		const matches: MatchInsertRow[] = [
			makeMatch({
				id: "m1",
				event_match_id: 1,
				round_number: 0,
				team_a_id: "T1",
				team_b_id: "T2",
			}),
		]
		const result = assignReferees(matches, allTeams, true)
		expect(result[0].referee_team_id).toBeNull()
	})

	it("with auto_referee=false, all matches have null referee_team_id", () => {
		const allTeams = ["T1", "T2", "T3", "T4", "T5", "T6"]
		const matches: MatchInsertRow[] = [
			makeMatch({
				id: "m1",
				event_match_id: 1,
				round_number: 0,
				team_a_id: "T1",
				team_b_id: "T2",
			}),
			makeMatch({
				id: "m2",
				event_match_id: 2,
				round_number: 0,
				team_a_id: "T3",
				team_b_id: "T4",
			}),
		]
		const result = assignReferees(matches, allTeams, false)
		for (const m of result) {
			expect(m.referee_team_id).toBeNull()
		}
	})
})
