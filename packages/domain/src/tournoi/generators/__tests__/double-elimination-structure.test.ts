import { describe, expect, it } from "vitest"
import { generateDoubleEliminationStructure } from "../double-elimination.js"

const phaseId = "550e8400-e29b-41d4-a716-446655440000"
const tournamentId = "550e8400-e29b-41d4-a716-446655440001"
const defaultFormat = { setsToWin: 2, legsPerSet: 3 }

describe("generateDoubleEliminationStructure", () => {
	it("returns a GeneratorResult with matches, bracketInfos, and empty roundRobinInfos", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		expect(result.matches.length).toBeGreaterThan(0)
		expect(result.bracketInfos.length).toBeGreaterThan(0)
		expect(result.roundRobinInfos).toHaveLength(0)
	})

	it("every match has a corresponding bracketInfos entry", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const infoIds = new Set(result.bracketInfos.map((bi) => bi.id))
		for (const match of result.matches) {
			expect(match.bracket_info_id).not.toBeNull()
			expect(infoIds.has(match.bracket_info_id as string)).toBe(true)
		}
	})

	it("bracketInfos contain W, L, and GF bracket entries", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const brackets = new Set(result.bracketInfos.map((bi) => bi.bracket))
		expect(brackets.has("W")).toBe(true)
		expect(brackets.has("L")).toBe(true)
		expect(brackets.has("GF")).toBe(true)
	})

	it("exactly 1 GF match exists", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const gfInfos = result.bracketInfos.filter((bi) => bi.bracket === "GF")
		expect(gfInfos).toHaveLength(1)
		const gfMatches = result.matches.filter(
			(m) => m.bracket_info_id === gfInfos[0].id,
		)
		expect(gfMatches).toHaveLength(1)
	})

	it("all event_match_id values are sequential starting from startEventMatchId", () => {
		const startEventMatchId = 5
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			startEventMatchId,
			defaultFormat,
		)
		const ids = result.matches
			.map((m) => m.event_match_id)
			.sort((a, b) => a - b)
		for (let i = 0; i < ids.length; i++) {
			expect(ids[i]).toBe(startEventMatchId + i)
		}
	})

	it("every match has the correct sets_to_win and legs_per_set from defaultFormat", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		for (const match of result.matches) {
			expect(match.sets_to_win).toBe(defaultFormat.setsToWin)
			expect(match.legs_per_set).toBe(defaultFormat.legsPerSet)
		}
	})

	it("WB R1 bracketInfos have seed_a/seed_b set; later rounds have null seeds", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const wbInfos = result.bracketInfos.filter((bi) => bi.bracket === "W")
		const wbR1Infos = wbInfos.filter((bi) => bi.round_number === 1)
		for (const bi of wbR1Infos) {
			// At least one of seed_a or seed_b is set in WB R1
			expect(bi.seed_a !== null || bi.seed_b !== null).toBe(true)
		}
		const laterRoundInfos = wbInfos.filter((bi) => bi.round_number > 1)
		for (const bi of laterRoundInfos) {
			expect(bi.seed_a).toBeNull()
			expect(bi.seed_b).toBeNull()
		}
	})

	it("winner_goes_to_info_id chains correctly (WB and LB match winner_goes_to targets exist in bracketInfos)", () => {
		const result = generateDoubleEliminationStructure(
			8,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const infoIds = new Set(result.bracketInfos.map((bi) => bi.id))
		for (const bi of result.bracketInfos) {
			if (bi.winner_goes_to_info_id !== null) {
				expect(infoIds.has(bi.winner_goes_to_info_id)).toBe(true)
			}
		}
	})

	it("loser_goes_to_info_id is set on WB matches (losers drop to L bracket)", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const infoIds = new Set(result.bracketInfos.map((bi) => bi.id))
		const wbInfos = result.bracketInfos.filter((bi) => bi.bracket === "W")
		// WB R1 matches should have loser_goes_to set
		const wbR1Infos = wbInfos.filter((bi) => bi.round_number === 1)
		for (const bi of wbR1Infos) {
			expect(bi.loser_goes_to_info_id).not.toBeNull()
			expect(infoIds.has(bi.loser_goes_to_info_id as string)).toBe(true)
		}
		// loser_goes_to target should be in L bracket
		for (const bi of wbR1Infos) {
			const target = result.bracketInfos.find(
				(x) => x.id === bi.loser_goes_to_info_id,
			)
			expect(target?.bracket).toBe("L")
		}
	})

	it("for 8 participants: WB has 7 matches, LB has 6 matches, GF has 1 match", () => {
		const result = generateDoubleEliminationStructure(
			8,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		const wbInfos = result.bracketInfos.filter((bi) => bi.bracket === "W")
		const lbInfos = result.bracketInfos.filter((bi) => bi.bracket === "L")
		const gfInfos = result.bracketInfos.filter((bi) => bi.bracket === "GF")
		expect(wbInfos).toHaveLength(7)
		expect(lbInfos).toHaveLength(6)
		expect(gfInfos).toHaveLength(1)
		expect(result.matches).toHaveLength(14)
	})

	it("all bracketInfos have a valid tournament_id", () => {
		const result = generateDoubleEliminationStructure(
			4,
			phaseId,
			tournamentId,
			1,
			defaultFormat,
		)
		for (const bi of result.bracketInfos) {
			expect(bi.tournament_id).toBe(tournamentId)
		}
	})
})
