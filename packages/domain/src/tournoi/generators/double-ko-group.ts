import type {
	BracketInfoInsertRow,
	GeneratorResult,
	MatchInsertRow,
} from "../match-schemas.js"
import {
	type BracketMatch,
	generateDoubleEliminationBracket,
} from "./double-bracket-elimination.js"
import { computeGroupSizes } from "./round-robin.js"

/**
 * Couper le bracket DE pour obtenir exactement `qualifiersPerGroup` qualifiés.
 *
 * Algorithme : dans un bracket DE, chaque match LB élimine 1 joueur (2e défaite).
 * Pour passer de N joueurs à K qualifiés, il faut jouer exactement N-K matchs LB.
 *
 * On garde :
 * - Les N-K premiers matchs LB (triés par round ASC)
 * - Tous les matchs WB dont le round ≤ max round des matchs LB conservés
 *
 * Les matchs dont le winner_goes_to / loser_goes_to pointe vers un match retiré
 * sont nullifiés (leurs gagnants/perdants qualifient ou sont éliminés directement).
 */
function cutBracket(
	deMatches: BracketMatch[],
	n: number,
	qualifiersPerGroup: number,
): BracketMatch[] {
	if (qualifiersPerGroup >= n) return [] // tous qualifiés, aucun match nécessaire
	if (qualifiersPerGroup <= 0) return []

	const targetLbCount = n - qualifiersPerGroup

	// Trier les matchs LB par round puis prendre les N-K premiers
	const lbSorted = deMatches
		.filter((m) => m.bracket === "L")
		.sort((a, b) => a.round - b.round)

	const keptLbIds = new Set(lbSorted.slice(0, targetLbCount).map((m) => m.id))
	const maxKeptLbRound =
		targetLbCount > 0 ? (lbSorted[targetLbCount - 1]?.round ?? 0) : 0

	// Conserver les LB sélectionnés et les WB dont le loser alimente un LB conservé.
	// (Condition directe : loserGoesToMatchId ∈ keptLbIds)
	// Jamais la GF.
	const keptSet = new Set(
		deMatches
			.filter((m) => {
				if (m.bracket === "GF") return false
				if (m.bracket === "L") return keptLbIds.has(m.id)
				// WB : inclure seulement si le perdant va dans un LB conservé
				return (
					m.loserGoesToMatchId !== null && keptLbIds.has(m.loserGoesToMatchId)
				)
			})
			.map((m) => m.id),
	)

	return deMatches
		.filter((m) => keptSet.has(m.id))
		.map((m) => ({
			...m,
			winnerGoesToMatchId:
				m.winnerGoesToMatchId && keptSet.has(m.winnerGoesToMatchId)
					? m.winnerGoesToMatchId
					: null,
			winnerGoesToSlot:
				m.winnerGoesToMatchId && keptSet.has(m.winnerGoesToMatchId)
					? m.winnerGoesToSlot
					: null,
			loserGoesToMatchId:
				m.loserGoesToMatchId && keptSet.has(m.loserGoesToMatchId)
					? m.loserGoesToMatchId
					: null,
			loserGoesToSlot:
				m.loserGoesToMatchId && keptSet.has(m.loserGoesToMatchId)
					? m.loserGoesToSlot
					: null,
		}))
}

/**
 * Convertir un tableau de BracketMatch (DE generator) en GeneratorResult
 * pour un groupe donné.
 *
 * Chaque BracketMatch produit une BracketInfoInsertRow (auto-référentielle via
 * la map deMatchId → bracketInfoId) et un MatchInsertRow.
 */
function convertDeMatchesToResult(
	bracketMatches: BracketMatch[],
	groupIndex: number,
	groupOffset: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
	teamSlots: Map<number, string>, // seed 1-based global → teamId (pour R1)
): GeneratorResult & { nextEventMatchId: number } {
	// Map deMatch.id → bracketInfoId (pré-générés pour les auto-références)
	const infoIdByDeId = new Map<string, string>()
	for (const m of bracketMatches) {
		infoIdByDeId.set(m.id, crypto.randomUUID())
	}

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	// Trier par round ASC (finals d'abord) pour respecter la FK auto-référentielle
	// lors de l'insertion : winner_goes_to_info_id doit exister avant son référençant.
	const sorted = [...bracketMatches].sort((a, b) => a.round - b.round)

	// Position locale dans le groupe (index dans sorted)
	let localPos = 0

	for (const dm of sorted) {
		const infoId = infoIdByDeId.get(dm.id)!

		const winnerGoesToInfoId = dm.winnerGoesToMatchId
			? (infoIdByDeId.get(dm.winnerGoesToMatchId) ?? null)
			: null

		const loserGoesToInfoId = dm.loserGoesToMatchId
			? (infoIdByDeId.get(dm.loserGoesToMatchId) ?? null)
			: null

		bracketInfos.push({
			id: infoId,
			tournament_id: tournamentId,
			bracket: dm.bracket,
			round_number: dm.round,
			position: localPos++,
			group_number: groupIndex,
			seed_a: dm.seedA !== null ? dm.seedA + groupOffset : null,
			seed_b: dm.seedB !== null ? dm.seedB + groupOffset : null,
			winner_goes_to_info_id: winnerGoesToInfoId,
			winner_goes_to_slot: dm.winnerGoesToSlot,
			loser_goes_to_info_id: loserGoesToInfoId,
			loser_goes_to_slot: dm.loserGoesToSlot,
		})

		// Assigner les équipes R1 via les seeds
		let teamAId: string | null = null
		let teamBId: string | null = null
		let status: MatchInsertRow["status"] = "pending"

		if (dm.seedA !== null || dm.seedB !== null) {
			// Match de premier tour WB — seeds présents
			teamAId = dm.seedA !== null ? (teamSlots.get(dm.seedA) ?? null) : null
			teamBId = dm.seedB !== null ? (teamSlots.get(dm.seedB) ?? null) : null
			if (teamAId === null || teamBId === null) status = "bye"
		}

		matches.push({
			id: crypto.randomUUID(),
			phase_id: phaseId,
			event_match_id: nextEventMatchId++,
			team_a_id: teamAId,
			team_b_id: teamBId,
			referee_team_id: null,
			status,
			sets_to_win: config.setsToWin,
			legs_per_set: config.legsPerSet,
			round_robin_info_id: null,
			bracket_info_id: infoId,
		})
	}

	return { matches, roundRobinInfos: [], bracketInfos, nextEventMatchId }
}

/**
 * Generate double-KO group structure for all groups of a phase.
 *
 * Internally uses generateDoubleEliminationBracket and cuts at the right round
 * to produce exactly `qualifiersPerGroup` qualifiers per group.
 *
 * All team slots are null — use assignTeamsToDoubleKo to fill R1 slots.
 */
export function generateDoubleKoStructure(
	playerCount: number,
	playersPerGroup: number,
	qualifiersPerGroup: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
): GeneratorResult {
	const groupSizes = computeGroupSizes(playerCount, playersPerGroup)
	const allMatches: MatchInsertRow[] = []
	const allBracketInfos: BracketInfoInsertRow[] = []
	let nextEventMatchId = startEventMatchId
	let groupOffset = 0

	for (let groupIndex = 0; groupIndex < groupSizes.length; groupIndex++) {
		const n = groupSizes[groupIndex]
		const deMatches = generateDoubleEliminationBracket(n)
		const cut = cutBracket(deMatches, n, qualifiersPerGroup)

		const emptySlots = new Map<number, string>() // pas d'équipe assignée

		const result = convertDeMatchesToResult(
			cut,
			groupIndex,
			groupOffset,
			phaseId,
			tournamentId,
			nextEventMatchId,
			config,
			emptySlots,
		)

		allMatches.push(...result.matches)
		allBracketInfos.push(...result.bracketInfos)
		nextEventMatchId = result.nextEventMatchId
		groupOffset += n
	}

	return {
		matches: allMatches,
		roundRobinInfos: [],
		bracketInfos: allBracketInfos,
	}
}
