import { describe, expect, it } from "vitest"
import { generateBracket } from "../bracket.js"

const DEFAULT_FORMAT = { setsToWin: 2, legsPerSet: 3 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesWithBracket(
	result: ReturnType<typeof generateBracket>,
	bracket: "W" | "L" | "GF",
) {
	return result.bracketInfos.filter((b) => b.bracket === bracket)
}

function roundsOf(infos: ReturnType<typeof generateBracket>["bracketInfos"]) {
	return [...new Set(infos.map((b) => b.round_number))].sort((a, b) => a - b)
}

function infoAt(
	result: ReturnType<typeof generateBracket>,
	bracket: "W" | "L" | "GF",
	round: number,
) {
	return result.bracketInfos.filter(
		(b) => b.bracket === bracket && b.round_number === round,
	)
}

// ─── Single Elimination ───────────────────────────────────────────────────────

describe("generateBracket — single elimination", () => {
	describe("4 participants", () => {
		const result = generateBracket({
			mode: "single",
			participantCount: 4,
			phaseId: "phase-1",
			tournamentId: "tournament-1",
			startEventMatchId: 1,
			tiers: [],
			defaultFormat: DEFAULT_FORMAT,
		})

		it("produces 3 matches total", () => {
			expect(result.matches).toHaveLength(3)
			expect(result.bracketInfos).toHaveLength(3)
		})

		it("has no LB or GF matches", () => {
			expect(matchesWithBracket(result, "L")).toHaveLength(0)
			expect(matchesWithBracket(result, "GF")).toHaveLength(0)
		})

		it("WB rounds are 0 and 1 (Final=0, R1=1)", () => {
			expect(roundsOf(matchesWithBracket(result, "W"))).toEqual([0, 1])
		})

		it("Final is at round 0 with 1 match", () => {
			expect(infoAt(result, "W", 0)).toHaveLength(1)
		})

		it("R1 is at round 1 with 2 matches", () => {
			expect(infoAt(result, "W", 1)).toHaveLength(2)
		})

		it("R1 matches have correct seeds (S1 vs S4, S2 vs S3)", () => {
			const r1 = infoAt(result, "W", 1)
			// Normalize each matchup to ascending order before comparing
			const seeds = r1.map((m) =>
				[m.seed_a ?? 0, m.seed_b ?? 0].sort((a, b) => a - b),
			)
			expect(seeds).toContainEqual([1, 4])
			expect(seeds).toContainEqual([2, 3])
		})

		it("R1 winners go to Final", () => {
			const r1 = infoAt(result, "W", 1)
			const final = infoAt(result, "W", 0)[0]
			for (const m of r1) {
				expect(m.winner_goes_to_info_id).toBe(final.id)
				expect(m.winner_goes_to_slot).toMatch(/^[ab]$/)
			}
		})

		it("no loser routing in SE", () => {
			for (const info of result.bracketInfos) {
				expect(info.loser_goes_to_info_id).toBeNull()
			}
		})

		it("positions are 0-based within each round", () => {
			const r1 = infoAt(result, "W", 1).sort((a, b) => a.position - b.position)
			expect(r1[0].position).toBe(0)
			expect(r1[1].position).toBe(1)
			const final = infoAt(result, "W", 0)
			expect(final[0].position).toBe(0)
		})

		it("event_match_ids are sequential from 1", () => {
			const ids = result.matches
				.map((m) => m.event_match_id)
				.sort((a, b) => a - b)
			expect(ids).toEqual([1, 2, 3])
		})
	})

	describe("8 participants", () => {
		const result = generateBracket({
			mode: "single",
			participantCount: 8,
			phaseId: "phase-1",
			tournamentId: "tournament-1",
			startEventMatchId: 1,
			tiers: [],
			defaultFormat: DEFAULT_FORMAT,
		})

		it("produces 7 matches total", () => {
			expect(result.matches).toHaveLength(7)
		})

		it("WB rounds are 0, 1, 2", () => {
			expect(roundsOf(matchesWithBracket(result, "W"))).toEqual([0, 1, 2])
		})

		it("Final=round 0, semi=round 1 (2 matches), R1=round 2 (4 matches)", () => {
			expect(infoAt(result, "W", 0)).toHaveLength(1)
			expect(infoAt(result, "W", 1)).toHaveLength(2)
			expect(infoAt(result, "W", 2)).toHaveLength(4)
		})
	})

	describe("6 participants (non-power-of-2 with byes)", () => {
		const result = generateBracket({
			mode: "single",
			participantCount: 6,
			phaseId: "phase-1",
			tournamentId: "tournament-1",
			startEventMatchId: 1,
			tiers: [],
			defaultFormat: DEFAULT_FORMAT,
		})

		it("WB R1 (round 2) has 4 slots with 2 byes", () => {
			const r1 = infoAt(result, "W", 2)
			expect(r1).toHaveLength(4)
			const byeMatches = r1.filter(
				(m) => m.seed_a === null || m.seed_b === null,
			)
			expect(byeMatches).toHaveLength(2)
		})

		it("bye matches have status bye", () => {
			const byeInfoIds = infoAt(result, "W", 2)
				.filter((m) => m.seed_a === null || m.seed_b === null)
				.map((m) => m.id)
			const byeMatchStatuses = result.matches
				.filter(
					(m) =>
						m.bracket_info_id !== null &&
						byeInfoIds.includes(m.bracket_info_id),
				)
				.map((m) => m.status)
			expect(byeMatchStatuses.every((s) => s === "bye")).toBe(true)
		})
	})
})

// ─── Double Elimination ───────────────────────────────────────────────────────

describe("generateBracket — double elimination", () => {
	describe("4 participants", () => {
		const result = generateBracket({
			mode: "double",
			participantCount: 4,
			phaseId: "phase-1",
			tournamentId: "tournament-1",
			startEventMatchId: 1,
			tiers: [],
			defaultFormat: DEFAULT_FORMAT,
		})

		it("produces 6 matches total (2 WB R1 + 1 WB Final + 1 LB R1 + 1 LB Final + 1 GF)", () => {
			expect(result.matches).toHaveLength(6)
			expect(matchesWithBracket(result, "W")).toHaveLength(3)
			expect(matchesWithBracket(result, "L")).toHaveLength(2)
			expect(matchesWithBracket(result, "GF")).toHaveLength(1)
		})

		it("WB Final is at round 1", () => {
			expect(infoAt(result, "W", 1)).toHaveLength(1)
		})

		it("WB R1 is at round 2", () => {
			expect(infoAt(result, "W", 2)).toHaveLength(2)
		})

		it("LB rounds are 0 and 1", () => {
			expect(roundsOf(matchesWithBracket(result, "L"))).toEqual([0, 1])
		})

		it("LB Final is at round 0 with 1 match", () => {
			expect(infoAt(result, "L", 0)).toHaveLength(1)
		})

		it("LB at round 1 has 1 match (LB R1, shared round with WB Final)", () => {
			expect(infoAt(result, "L", 1)).toHaveLength(1)
		})

		it("WB R1 matches have loserTo pointing to LB round 1", () => {
			const wbR1 = infoAt(result, "W", 2)
			const lbR1 = infoAt(result, "L", 1)[0]
			for (const m of wbR1) {
				expect(m.loser_goes_to_info_id).toBe(lbR1.id)
			}
		})

		it("WB Final loser goes to LB Final (round 0)", () => {
			const wbFinal = infoAt(result, "W", 1)[0]
			const lbFinal = infoAt(result, "L", 0)[0]
			expect(wbFinal.loser_goes_to_info_id).toBe(lbFinal.id)
		})

		it("GF is fed by WB Final winner (slot a) and LB Final winner (slot b)", () => {
			const gf = matchesWithBracket(result, "GF")[0]
			const wbFinal = infoAt(result, "W", 1)[0]
			const lbFinal = infoAt(result, "L", 0)[0]
			expect(wbFinal.winner_goes_to_info_id).toBe(gf.id)
			expect(wbFinal.winner_goes_to_slot).toBe("a")
			expect(lbFinal.winner_goes_to_info_id).toBe(gf.id)
			expect(lbFinal.winner_goes_to_slot).toBe("b")
		})

		it("GF is at round -1", () => {
			const gf = matchesWithBracket(result, "GF")[0]
			expect(gf.round_number).toBe(-1)
		})
	})

	describe("8 participants", () => {
		const result = generateBracket({
			mode: "double",
			participantCount: 8,
			phaseId: "phase-1",
			tournamentId: "tournament-1",
			startEventMatchId: 1,
			tiers: [],
			defaultFormat: DEFAULT_FORMAT,
		})

		it("produces 14 matches total (4+2+1 WB, 2+2+1+1 LB, 1 GF)", () => {
			expect(result.matches).toHaveLength(14)
			expect(matchesWithBracket(result, "W")).toHaveLength(7)
			expect(matchesWithBracket(result, "L")).toHaveLength(6)
			expect(matchesWithBracket(result, "GF")).toHaveLength(1)
		})

		it("WB rounds: R1=3, R2=2, Final=1", () => {
			expect(infoAt(result, "W", 3)).toHaveLength(4)
			expect(infoAt(result, "W", 2)).toHaveLength(2)
			expect(infoAt(result, "W", 1)).toHaveLength(1)
		})

		it("LB Final is at round 0", () => {
			// LB round 0 has exactly 1 match (LB Final)
			const lbFinalCandidates = infoAt(result, "L", 0)
			expect(lbFinalCandidates).toHaveLength(1)
		})

		it("LB round 3 has 2 matches (LB R1)", () => {
			expect(infoAt(result, "L", 3)).toHaveLength(2)
		})

		it("LB round 2 has 2 matches (drop-in depuis WB Semis)", () => {
			expect(infoAt(result, "L", 2)).toHaveLength(2)
		})

		it("LB round 1 has 1 match (reshuffle)", () => {
			expect(infoAt(result, "L", 1)).toHaveLength(1)
		})

		it("all WB matches have loserTo set (WB Final points to LB Final)", () => {
			const wbMatches = matchesWithBracket(result, "W")
			for (const m of wbMatches) {
				expect(m.loser_goes_to_info_id).not.toBeNull()
			}
		})

		it("all LB matches have null loserTo (eliminated on loss)", () => {
			const lbMatches = matchesWithBracket(result, "L")
			for (const m of lbMatches) {
				expect(m.loser_goes_to_info_id).toBeNull()
			}
		})
	})

	describe("SE vs DE consistency for same participant count", () => {
		it("WB R1 round in DE is exactly 1 more than in SE", () => {
			const se = generateBracket({
				mode: "single",
				participantCount: 8,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 1,
				tiers: [],
				defaultFormat: DEFAULT_FORMAT,
			})
			const de = generateBracket({
				mode: "double",
				participantCount: 8,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 1,
				tiers: [],
				defaultFormat: DEFAULT_FORMAT,
			})
			const seR1Round = infoAt(se, "W", 2)[0].round_number // SE R1 = 2
			const deR1Round = infoAt(de, "W", 3)[0].round_number // DE R1 = 3
			expect(deR1Round).toBe(seR1Round + 1)
		})

		it("SE Final round is 0, DE WB Final round is 1", () => {
			const se = generateBracket({
				mode: "single",
				participantCount: 4,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 1,
				tiers: [],
				defaultFormat: DEFAULT_FORMAT,
			})
			const de = generateBracket({
				mode: "double",
				participantCount: 4,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 1,
				tiers: [],
				defaultFormat: DEFAULT_FORMAT,
			})
			expect(infoAt(se, "W", 0)[0].round_number).toBe(0)
			expect(infoAt(de, "W", 1)[0].round_number).toBe(1)
		})
	})

	describe("event_match_id", () => {
		it("ids are sequential starting from startEventMatchId", () => {
			const result = generateBracket({
				mode: "double",
				participantCount: 4,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 10,
				tiers: [],
				defaultFormat: DEFAULT_FORMAT,
			})
			const ids = result.matches
				.map((m) => m.event_match_id)
				.sort((a, b) => a - b)
			expect(ids).toEqual([10, 11, 12, 13, 14, 15])
		})
	})

	describe("format config via tiers", () => {
		it("applies tier config for specific rounds", () => {
			const result = generateBracket({
				mode: "single",
				participantCount: 4,
				phaseId: "p",
				tournamentId: "t",
				startEventMatchId: 1,
				tiers: [{ round: 0, setsToWin: 3, legsPerSet: 5 }],
				defaultFormat: { setsToWin: 2, legsPerSet: 3 },
			})
			const finalInfoId = infoAt(result, "W", 0)[0].id
			const finalMatch = result.matches.find(
				(m) => m.bracket_info_id === finalInfoId,
			)
			if (!finalMatch) throw new Error("Final match not found")
			expect(finalMatch.sets_to_win).toBe(3)
			expect(finalMatch.legs_per_set).toBe(5)

			const r1InfoIds = infoAt(result, "W", 1).map((i) => i.id)
			const r1Matches = result.matches.filter(
				(m) => m.bracket_info_id && r1InfoIds.includes(m.bracket_info_id),
			)
			for (const m of r1Matches) {
				expect(m.sets_to_win).toBe(2)
				expect(m.legs_per_set).toBe(3)
			}
		})
	})
})
