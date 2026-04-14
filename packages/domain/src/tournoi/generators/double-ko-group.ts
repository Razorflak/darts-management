import type {
	BracketInfoInsertRow,
	GeneratorResult,
	MatchInsertRow,
} from "../match-schemas.js"
import { type BracketNode, buildBracket } from "./bracket.js"
import { computeGroupSizes } from "./round-robin.js"

/**
 * Couper le bracket DE pour obtenir exactement `qualifiersPerGroup` qualifiés.
 *
 * Algorithme : dans un bracket DE, chaque match LB élimine 1 joueur (2e défaite).
 * Pour passer de N joueurs à K qualifiés, il faut jouer exactement N-K matchs LB.
 *
 * On garde :
 * - Les N-K premiers matchs LB (triés par round ASC)
 * - Tous les matchs WB dont le perdant va dans un LB conservé
 *
 * Les références winner_goes_to / loser_goes_to vers des matchs retirés sont nullifiées.
 */
function cutBracket(
	nodes: BracketNode[],
	n: number,
	qualifiersPerGroup: number,
): BracketNode[] {
	if (qualifiersPerGroup >= n) return []
	if (qualifiersPerGroup <= 0) return []

	const targetLbCount = n - qualifiersPerGroup

	// Dans bracket.ts, round décroît vers la fin du tournoi (0 = LB Final).
	// Trier DESC pour obtenir les matchs les plus précoces en premier.
	const lbSorted = nodes
		.filter((m) => m.bracket === "L")
		.sort((a, b) => b.round - a.round)

	const keptLbIds = new Set(lbSorted.slice(0, targetLbCount).map((m) => m.id))

	const keptSet = new Set(
		nodes
			.filter((m) => {
				if (m.bracket === "GF") return false
				if (m.bracket === "L") return keptLbIds.has(m.id)
				return m.loserTo !== null && keptLbIds.has(m.loserTo.nodeId)
			})
			.map((m) => m.id),
	)

	return nodes
		.filter((m) => keptSet.has(m.id))
		.map((m) => ({
			...m,
			winnerTo:
				m.winnerTo && keptSet.has(m.winnerTo.nodeId) ? m.winnerTo : null,
			loserTo: m.loserTo && keptSet.has(m.loserTo.nodeId) ? m.loserTo : null,
		}))
}

/**
 * Convertir un tableau de BracketNode en GeneratorResult pour un groupe donné.
 *
 * Chaque nœud produit une BracketInfoInsertRow (auto-référentielle via idMap)
 * et un MatchInsertRow. L'assignation des équipes est faite en aval via assignTeamsToPhase0.
 */
function convertNodesToResult(
	nodes: BracketNode[],
	groupIndex: number,
	groupOffset: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
): GeneratorResult & { nextEventMatchId: number } {
	const idMap = new Map<string, string>()
	for (const node of nodes) {
		idMap.set(node.id, crypto.randomUUID())
	}

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	// Trier par round ASC (finals d'abord, round 0 = LB Final) pour respecter
	// la FK auto-référentielle lors de l'insertion.
	const sorted = [...nodes].sort((a, b) => a.round - b.round)
	let localPos = 0

	for (const node of sorted) {
		// biome-ignore lint/style/noNonNullAssertion: idMap is built from the same nodes array
		const infoId = idMap.get(node.id)!

		bracketInfos.push({
			id: infoId,
			tournament_id: tournamentId,
			bracket: node.bracket,
			round_number: node.round,
			position: localPos++,
			group_number: groupIndex,
			seed_a: node.seedA !== null ? node.seedA + groupOffset : null,
			seed_b: node.seedB !== null ? node.seedB + groupOffset : null,
			winner_goes_to_info_id: node.winnerTo
				? (idMap.get(node.winnerTo.nodeId) ?? null)
				: null,
			winner_goes_to_slot: node.winnerTo?.slot ?? null,
			loser_goes_to_info_id: node.loserTo
				? (idMap.get(node.loserTo.nodeId) ?? null)
				: null,
			loser_goes_to_slot: node.loserTo?.slot ?? null,
		})

		matches.push({
			id: crypto.randomUUID(),
			phase_id: phaseId,
			event_match_id: nextEventMatchId++,
			team_a_id: null,
			team_b_id: null,
			referee_team_id: null,
			status: "pending",
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
 * Internally uses buildBracket (mode "double") and cuts at the right round
 * to produce exactly `qualifiersPerGroup` qualifiers per group.
 *
 * All team slots are null — use assignTeamsToPhase0 to fill R1 slots.
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
		const nodes = buildBracket(n, "double")
		const cut = cutBracket(nodes, n, qualifiersPerGroup)

		const result = convertNodesToResult(
			cut,
			groupIndex,
			groupOffset,
			phaseId,
			tournamentId,
			nextEventMatchId,
			config,
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
