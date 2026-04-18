import { updateSourceFile } from "typescript"
import type { GeneratorResult, MatchInsertRow } from "../match-schemas.js"

/**
 * Valeurs par défaut de format de match par type de phase.
 * Utiliser ces constantes plutôt que des magic numbers dans les générateurs et l'orchestrateur.
 */
/**
 * Assign teams to all first-round match slots of a phase.
 *
 * Works for all phase types via a unified global seed → team lookup:
 * - Round-robin : uses round_robin_info.slot_a/slot_b (global seeds 1-based)
 * - Bracket (SE, DKO) : uses bracket_info.seed_a/seed_b (global seeds, non-null = R1 only)
 *
 * Seeds are global indices into teamIds: seed 1 → teamIds[0], seed N → teamIds[N-1].
 * Generators are responsible for producing global seeds (offset per group).
 */
export function assignTeamsToPhase0(
	result: GeneratorResult,
	teamIds: string[],
): GeneratorResult {
	const rrInfoById = new Map(result.roundRobinInfos.map((i) => [i.id, i]))
	const bracketInfoById = new Map(result.bracketInfos.map((i) => [i.id, i]))

	// Assignation des équipes aux matchs de la phase 0 (round-robin et/ou premier tour de bracket) selon les seeds définis dans les infos de structure
	const updatedMatches = result.matches.map((m): MatchInsertRow => {
		if (m.round_robin_info_id) {
			const info = rrInfoById.get(m.round_robin_info_id)
			if (!info) return m
			const teamAId = teamIds[info.slot_a - 1] ?? null
			const teamBId = teamIds[info.slot_b - 1] ?? null
			return { ...m, team_a_id: teamAId, team_b_id: teamBId }
		}
		if (m.bracket_info_id) {
			const info = bracketInfoById.get(m.bracket_info_id)
			if (!info) {
				return m
			}
			const teamAId = info.seed_a ? teamIds[info.seed_a - 1] : null
			const teamBId = info.seed_b ? teamIds[info.seed_b - 1] : null
			return { ...m, team_a_id: teamAId, team_b_id: teamBId }
		}
		return m
	})

	// Détection des matchs bye au sein des premiers tours de bracket et assignement du statut "bye"
	updatedMatches.forEach((m) => {
		if (m.bracket_info_id) {
			const info = bracketInfoById.get(m.bracket_info_id)
			if (!info) {
				return
			}
			const isFirstRound = !result.matches.some(
				(other) =>
					other.bracket_info_id === m.bracket_info_id &&
					other.event_match_id < m.event_match_id,
			)
			if (
				isFirstRound &&
				((m.team_a_id && !m.team_b_id) || (!m.team_a_id && m.team_b_id))
			) {
				m.status = "bye"
			}
		}
	})

	// Avancement des équipes dans un match bye vers le match suivant
	updatedMatches
		.filter(
			(m) =>
				m.status === "bye" && (m.team_a_id !== null || m.team_b_id !== null),
		)
		.forEach((byeMatch) => {
			const winnerTeamId = byeMatch.team_a_id ?? byeMatch.team_b_id
			const bracketInfo = result.bracketInfos.find(
				(br) => br.id === byeMatch.bracket_info_id,
			)
			if (!bracketInfo || !bracketInfo.winner_goes_to_info_id) return
			const { winner_goes_to_info_id, winner_goes_to_slot } = bracketInfo
			const nextMatch = updatedMatches.find(
				(m) => m.bracket_info_id === winner_goes_to_info_id,
			)
			if (!nextMatch) return
			if (winner_goes_to_slot === "a") {
				nextMatch.team_a_id = winnerTeamId
			} else if (winner_goes_to_slot === "b") {
				nextMatch.team_b_id = winnerTeamId
			}
		})

	return {
		...result,
		matches: updatedMatches,
	}
}

export const PHASE_FORMAT_DEFAULTS = {
	round_robin: { setsToWin: 2, legsPerSet: 3, playersPerGroup: 4 },
	double_loss_groups: {
		setsToWin: 2,
		legsPerSet: 3,
		playersPerGroup: 8,
		qualifiers_per_group: 4,
	},
	single_elimination: { setsToWin: 3, legsPerSet: 5 },
	double_elimination: { setsToWin: 3, legsPerSet: 5 },
} as const
