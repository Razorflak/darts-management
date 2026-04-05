import type { GeneratorResult, MatchInsertRow } from "../match-schemas.js"
import type { PhaseType } from "../phase-schemas.js"

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
			if (!info || info.seed_a === null) return m
			const teamAId = teamIds[info.seed_a - 1] ?? null
			const teamBId =
				info.seed_b !== null ? (teamIds[info.seed_b - 1] ?? null) : null
			const status: MatchInsertRow["status"] =
				teamAId === null || teamBId === null ? "bye" : "pending"
			return { ...m, team_a_id: teamAId, team_b_id: teamBId, status }
		}
		return m
	})

	return { ...result, matches: updatedMatches }
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
