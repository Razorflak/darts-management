import type { MatchInsertRow } from "../match-schemas.js"

/**
 * Assign referees to matches using a greedy least-assigned approach.
 *
 * For each match (processed in event_match_id order):
 * - Find teams not playing in that match AND not already refereeing
 *   another match in the same round_number + group_number slot
 * - Among candidates, pick the one with fewest total referee assignments so far
 * - If no candidate available, leave null
 *
 * Returns a new array of matches with referee_team_id populated.
 */
export function assignReferees(
	matches: MatchInsertRow[],
	allTeamIds: string[],
	autoReferee: boolean,
): MatchInsertRow[] {
	if (!autoReferee) {
		return matches.map((m) => ({ ...m, referee_team_id: null }))
	}

	// Sort matches by event_match_id for deterministic processing
	const sorted = [...matches].sort(
		(a, b) => a.event_match_id - b.event_match_id,
	)

	// Track total referee assignment counts across all matches
	const refCount = new Map<string, number>()
	for (const teamId of allTeamIds) {
		refCount.set(teamId, 0)
	}

	// Track which teams are already assigned as referees per round slot
	// Key: `${round_number}:${group_number ?? "null"}`
	// Value: set of team IDs already refereeing in that slot
	const slotReferees = new Map<string, Set<string>>()

	const getSlotKey = (m: MatchInsertRow): string =>
		`${m.round_number}:${m.group_number ?? "null"}`

	const result = new Map<string, MatchInsertRow>()

	for (const match of sorted) {
		const slotKey = getSlotKey(match)
		if (!slotReferees.has(slotKey)) {
			slotReferees.set(slotKey, new Set())
		}
		const busyInSlot = slotReferees.get(slotKey) ?? new Set<string>()

		// Teams already playing in this match
		const playing = new Set(
			[match.team_a_id, match.team_b_id].filter(Boolean) as string[],
		)

		// Eligible candidates: not playing, not already refereeing in this slot
		const candidates = allTeamIds.filter(
			(id) => !playing.has(id) && !busyInSlot.has(id),
		)

		if (candidates.length === 0) {
			result.set(match.id, { ...match, referee_team_id: null })
			continue
		}

		// Pick the candidate with the fewest total assignments (greedy)
		const chosen = candidates.reduce((best, candidate) => {
			const bestCount = refCount.get(best) ?? 0
			const candidateCount = refCount.get(candidate) ?? 0
			return candidateCount < bestCount ? candidate : best
		})

		// Record assignment
		refCount.set(chosen, (refCount.get(chosen) ?? 0) + 1)
		busyInSlot.add(chosen)

		result.set(match.id, { ...match, referee_team_id: chosen })
	}

	// Return in original order
	return matches.map((m) => result.get(m.id) ?? m)
}
