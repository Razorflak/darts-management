import { computeStandings } from "../scoring.js"
import type { Qualifier } from "./bracket-seeding.js"

export type MatchForGroupStandings = {
	team_a_id: string | null
	team_b_id: string | null
	score_a: number | null
	score_b: number | null
	status: string
	group_number: number
}

/**
 * Calcule les qualifiants d'une phase à groupes (round-robin, double_loss_groups).
 * Pour chaque groupe, calcule le classement et sélectionne les N meilleurs.
 * Entrelace les résultats : G0R1, G1R1, G2R1, G0R2, G1R2, ...
 */
export function computePhaseQualifiers(
	matches: MatchForGroupStandings[],
	qualifiersPerGroup: number,
): Qualifier[] {
	const byGroup = new Map<number, MatchForGroupStandings[]>()
	for (const row of matches) {
		const group = byGroup.get(row.group_number) ?? []
		group.push(row)
		byGroup.set(row.group_number, group)
	}

	const sortedGroupNums = Array.from(byGroup.keys()).sort((a, b) => a - b)

	const standingsPerGroup = sortedGroupNums.map((gNum) =>
		computeStandings(byGroup.get(gNum) ?? []),
	)

	const result: Qualifier[] = []
	for (let rank = 0; rank < qualifiersPerGroup; rank++) {
		for (let i = 0; i < standingsPerGroup.length; i++) {
			const entry = standingsPerGroup[i][rank]
			if (entry) {
				result.push({
					teamId: entry.team_id,
					groupNumber: sortedGroupNums[i],
					seed: rank + 1,
				})
			}
		}
	}

	return result
}
