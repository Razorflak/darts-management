import type {
	BracketInfoInsertRow,
	GeneratorResult,
	MatchInsertRow,
} from "../match-schemas.js"
import { generateDoubleEliminationBracket } from "./double-bracket-elimination.js"

/**
 * generateDoubleEliminationStructure: Adapts generateDoubleEliminationBracket
 * to produce a GeneratorResult (same interface as other generators).
 *
 * All team slots are null — use assignTeamsToPhase0 to fill first-round slots.
 * Seeds (seed_a/seed_b) are pre-computed for WB Round 1 matches only.
 */
export function generateDoubleEliminationStructure(
	playerCount: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	defaultFormat: { setsToWin: number; legsPerSet: number },
): GeneratorResult {
	const rawMatches = generateDoubleEliminationBracket(playerCount)

	// Build a map from raw match id → new bracket_info_id (uuid)
	const idMap = new Map<string, string>()
	for (const rm of rawMatches) {
		idMap.set(rm.id, crypto.randomUUID())
	}

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []

	// Track position per (bracket, round) for sequential position assignment
	const posCounter = new Map<string, number>()

	let eventMatchId = startEventMatchId
	for (const rm of rawMatches) {
		const infoId = idMap.get(rm.id)
		if (infoId === undefined) continue

		const posKey = `${rm.bracket}-${rm.round}`
		const pos = posCounter.get(posKey) ?? 0
		posCounter.set(posKey, pos + 1)

		const bracketInfo: BracketInfoInsertRow = {
			id: infoId,
			tournament_id: tournamentId,
			bracket: rm.bracket,
			round_number: rm.round,
			position: pos,
			group_number: null,
			seed_a: rm.seedA,
			seed_b: rm.seedB,
			winner_goes_to_info_id:
				rm.winnerGoesToMatchId !== null
					? (idMap.get(rm.winnerGoesToMatchId) ?? null)
					: null,
			winner_goes_to_slot: rm.winnerGoesToSlot,
			loser_goes_to_info_id:
				rm.loserGoesToMatchId !== null
					? (idMap.get(rm.loserGoesToMatchId) ?? null)
					: null,
			loser_goes_to_slot: rm.loserGoesToSlot,
		}
		bracketInfos.push(bracketInfo)

		// BYE: any WB R1 match where one slot has no real participant
		const isBye =
			(rm.seedA === null || rm.seedB === null) &&
			rm.bracket === "W" &&
			rm.round === 1

		const match: MatchInsertRow = {
			id: crypto.randomUUID(),
			phase_id: phaseId,
			event_match_id: eventMatchId++,
			team_a_id: null,
			team_b_id: null,
			referee_team_id: null,
			status: isBye ? "bye" : "pending",
			sets_to_win: defaultFormat.setsToWin,
			legs_per_set: defaultFormat.legsPerSet,
			round_robin_info_id: null,
			bracket_info_id: infoId,
		}
		matches.push(match)
	}

	return { matches, roundRobinInfos: [], bracketInfos }
}
