import { describe, expect, it } from "vitest"
import {
	breakTie,
	computeStandings,
	SCORING_RULES,
	validateScore,
} from "./scoring.js"

// ─── SCORING_RULES ───────────────────────────────────────────────────────────

describe("SCORING_RULES", () => {
	it("WIN === 3", () => {
		expect(SCORING_RULES.WIN).toBe(3)
	})

	it("LOSS === 0", () => {
		expect(SCORING_RULES.LOSS).toBe(0)
	})

	it("WALKOVER_WIN === 3", () => {
		expect(SCORING_RULES.WALKOVER_WIN).toBe(3)
	})

	it("WALKOVER_LOSS === 0", () => {
		expect(SCORING_RULES.WALKOVER_LOSS).toBe(0)
	})

	it("BYE === 3 (counted as a win for seeding purposes)", () => {
		expect(SCORING_RULES.BYE).toBe(3)
	})
})

// ─── validateScore ───────────────────────────────────────────────────────────

describe("validateScore", () => {
	// BO3 legs-only (sets_to_win=1, legs_per_set=3): winner needs ceil(3/2)=2 legs
	const bo3 = { sets_to_win: 1, legs_per_set: 3 }
	// BO5 sets mode (sets_to_win=3, legs_per_set=5): winner needs exactly 3 sets
	const bo5sets = { sets_to_win: 3, legs_per_set: 5 }

	it("accepts valid BO3 score 2-1", () => {
		expect(() => validateScore(bo3, { score_a: 2, score_b: 1 })).not.toThrow()
	})

	it("rejects 2-2 in BO3 (no winner — both reached max)", () => {
		expect(() => validateScore(bo3, { score_a: 2, score_b: 2 })).toThrow(
			"ScoreInvalid",
		)
	})

	it("rejects 3-1 in BO3 (winner exceeds legs_per_set requirement)", () => {
		expect(() => validateScore(bo3, { score_a: 3, score_b: 1 })).toThrow(
			"ScoreInvalid",
		)
	})

	it("accepts 0-2 in BO3 (winner has ceil(3/2)=2, loser has 0)", () => {
		expect(() => validateScore(bo3, { score_a: 0, score_b: 2 })).not.toThrow()
	})

	it("accepts valid sets score 3-1 in BO5-sets mode", () => {
		expect(() =>
			validateScore(bo5sets, { score_a: 3, score_b: 1 }),
		).not.toThrow()
	})

	it("rejects 2-2 in BO5-sets mode (no winner)", () => {
		expect(() => validateScore(bo5sets, { score_a: 2, score_b: 2 })).toThrow(
			"ScoreInvalid",
		)
	})

	it("accepts walkover 'a' without score validation", () => {
		expect(() => validateScore(bo3, { walkover: "a" })).not.toThrow()
	})

	it("accepts walkover 'b' without score validation", () => {
		expect(() => validateScore(bo5sets, { walkover: "b" })).not.toThrow()
	})
})

// ─── computeStandings ────────────────────────────────────────────────────────

const teamA = "team-a-uuid"
const teamB = "team-b-uuid"
const teamC = "team-c-uuid"

describe("computeStandings", () => {
	it("computes correct points, wins, losses, legDiff from done matches", () => {
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: teamB,
				score_a: 2,
				score_b: 1,
				status: "done",
			},
			{
				team_a_id: teamA,
				team_b_id: teamC,
				score_a: 2,
				score_b: 0,
				status: "done",
			},
			{
				team_a_id: teamB,
				team_b_id: teamC,
				score_a: 2,
				score_b: 1,
				status: "done",
			},
		]

		const standings = computeStandings(matches)

		expect(standings).toHaveLength(3)

		const aEntry = standings.find((s) => s.team_id === teamA)
		expect(aEntry).toBeDefined()
		expect(aEntry?.wins).toBe(2)
		expect(aEntry?.losses).toBe(0)
		expect(aEntry?.points).toBe(6)
		expect(aEntry?.leg_diff).toBe(3) // (2+2) - (1+0) = 4 - 1 = 3

		const bEntry = standings.find((s) => s.team_id === teamB)
		expect(bEntry?.wins).toBe(1)
		expect(bEntry?.losses).toBe(1)
		expect(bEntry?.points).toBe(3)

		const cEntry = standings.find((s) => s.team_id === teamC)
		expect(cEntry?.wins).toBe(0)
		expect(cEntry?.losses).toBe(2)
		expect(cEntry?.points).toBe(0)
	})

	it("filters out pending matches (only done/walkover count)", () => {
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: teamB,
				score_a: 2,
				score_b: 1,
				status: "done",
			},
			{
				team_a_id: teamA,
				team_b_id: teamC,
				score_a: null,
				score_b: null,
				status: "pending",
			},
		]

		const standings = computeStandings(matches)
		const aEntry = standings.find((s) => s.team_id === teamA)
		// Only 1 match played for A
		expect(aEntry?.played).toBe(1)
	})

	it("handles walkover matches with WALKOVER_WIN/WALKOVER_LOSS points and 0-0 legs", () => {
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: teamB,
				score_a: null,
				score_b: null,
				status: "walkover",
				walkover: "a" as const,
			},
		]

		const standings = computeStandings(
			matches as Parameters<typeof computeStandings>[0],
		)
		const aEntry = standings.find((s) => s.team_id === teamA)
		const bEntry = standings.find((s) => s.team_id === teamB)

		// In walkover, team_a wins (walkover field='a' means team_a won via walkover)
		// legs are 0-0
		expect(aEntry?.points).toBe(SCORING_RULES.WALKOVER_WIN)
		expect(aEntry?.legs_won).toBe(0)
		expect(bEntry?.points).toBe(SCORING_RULES.WALKOVER_LOSS)
		expect(bEntry?.legs_won).toBe(0)
	})

	it("counts BYE matches as a win (3 points) for the present team", () => {
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: null,
				score_a: null,
				score_b: null,
				status: "bye",
			},
		]

		const standings = computeStandings(matches)
		const aEntry = standings.find((s) => s.team_id === teamA)
		expect(aEntry?.points).toBe(3)
		expect(aEntry?.played).toBe(1)
		expect(aEntry?.wins).toBe(1)
		expect(aEntry?.losses).toBe(0)
	})

	it("returns standings sorted by rank (highest points first)", () => {
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: teamB,
				score_a: 2,
				score_b: 0,
				status: "done",
			},
			{
				team_a_id: teamA,
				team_b_id: teamC,
				score_a: 2,
				score_b: 0,
				status: "done",
			},
			{
				team_a_id: teamB,
				team_b_id: teamC,
				score_a: 2,
				score_b: 0,
				status: "done",
			},
		]

		const standings = computeStandings(matches)
		expect(standings[0].team_id).toBe(teamA)
		expect(standings[1].team_id).toBe(teamB)
		expect(standings[2].team_id).toBe(teamC)
	})
})

// ─── breakTie ─────────────────────────────────────────────────────────────────

describe("breakTie", () => {
	it("higher points wins", () => {
		const a = {
			team_id: teamA,
			played: 2,
			wins: 2,
			losses: 0,
			points: 6,
			legs_won: 4,
			legs_lost: 0,
			leg_diff: 4,
		}
		const b = {
			team_id: teamB,
			played: 2,
			wins: 1,
			losses: 1,
			points: 3,
			legs_won: 2,
			legs_lost: 2,
			leg_diff: 0,
		}
		// a should sort before b (negative = a first)
		expect(breakTie(a, b, [])).toBeLessThan(0)
	})

	it("equal points: higher legDiff wins", () => {
		const a = {
			team_id: teamA,
			played: 2,
			wins: 1,
			losses: 1,
			points: 3,
			legs_won: 4,
			legs_lost: 2,
			leg_diff: 2,
		}
		const b = {
			team_id: teamB,
			played: 2,
			wins: 1,
			losses: 1,
			points: 3,
			legs_won: 3,
			legs_lost: 3,
			leg_diff: 0,
		}
		expect(breakTie(a, b, [])).toBeLessThan(0)
	})

	it("equal points and legDiff: head-to-head result wins", () => {
		const a = {
			team_id: teamA,
			played: 2,
			wins: 1,
			losses: 1,
			points: 3,
			legs_won: 3,
			legs_lost: 3,
			leg_diff: 0,
		}
		const b = {
			team_id: teamB,
			played: 2,
			wins: 1,
			losses: 1,
			points: 3,
			legs_won: 3,
			legs_lost: 3,
			leg_diff: 0,
		}
		// Direct match: A beat B (2-1)
		const matches = [
			{
				team_a_id: teamA,
				team_b_id: teamB,
				score_a: 2,
				score_b: 1,
				status: "done",
			},
		]
		// A beat B, so A should sort first (negative)
		expect(breakTie(a, b, matches)).toBeLessThan(0)
		// B vs A (reverse): B lost to A, B sorts after A (positive)
		expect(breakTie(b, a, matches)).toBeGreaterThan(0)
	})
})
