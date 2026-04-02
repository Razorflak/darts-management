import type { MatchInsertRow } from "../match-schemas.js"

/**
 * getBracket: Compute first-round seed pairings for a single-elimination bracket.
 *
 * Returns an array of [seedA, seedB] pairs for the first round.
 * Null indicates a BYE (seed number > participantsCount).
 *
 * Example: getBracket(4) → [[1,4],[2,3]]
 * Example: getBracket(8) → [[1,8],[5,4],[3,6],[7,2]] (standard seeding)
 */
export function getBracket(
	participantsCount: number,
): Array<[number | null, number | null]> {
	const rounds = Math.ceil(Math.log2(Math.max(participantsCount, 2)))
	// Start with the root match [1, 2]
	let matches: Array<[number, number]> = [[1, 2]]

	for (let round = 1; round < rounds; round++) {
		const roundMatches: Array<[number, number]> = []
		const sum = 2 ** (round + 1) + 1
		for (const [a, b] of matches) {
			roundMatches.push([a, sum - a])
			roundMatches.push([sum - b, b])
		}
		matches = roundMatches
	}

	return matches.map(([a, b]) => [
		a <= participantsCount ? a : null,
		b <= participantsCount ? b : null,
	])
}

/**
 * generateSingleEliminationBracket: Generate all matches for a single-elimination bracket.
 *
 * Builds match tree from final (root) down to first round (leaves).
 * Pre-generates all UUIDs and wires advances_to_match_id from leaves to root.
 *
 * @param teamIds - Team IDs in seed order. If fewer than bracketSize, extras are BYEs.
 * @param phaseId - The phase this bracket belongs to.
 * @param startEventMatchId - Starting sequential ID for this phase.
 * @param tiers - Array of { round, setsToWin, legsPerSet } per round.
 *   round=0 is the final, round=1 is semis, etc. (distance from final).
 *   If tiers doesn't cover all rounds, the last tier's config is used for remaining rounds.
 */
export function generateSingleEliminationBracket(
	teamIds: string[],
	phaseId: string,
	startEventMatchId: number,
	tiers: Array<{ round: number; setsToWin: number; legsPerSet: number }>,
): MatchInsertRow[] {
	const n = teamIds.length
	const totalRounds = Math.ceil(Math.log2(Math.max(n, 2)))
	const bracketSize = 2 ** totalRounds

	// Build the tree level by level, starting from the final (round 0)
	// Level 0 = final (1 match), level 1 = semis (2 matches), ...
	// level = totalRounds - 1 = first round (bracketSize/2 matches)
	// round_number = totalRounds - 1 - level (so final has round_number=0)

	// Pre-generate match UUIDs for all matches
	// Total matches = bracketSize - 1
	const _totalMatches = bracketSize - 1

	// Build match structure level by level
	// matchTree[level] = array of match IDs at that level
	const matchIdTree: string[][] = []
	for (let level = 0; level < totalRounds; level++) {
		const count = 2 ** level
		matchIdTree.push(Array.from({ length: count }, () => crypto.randomUUID()))
	}

	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	// Get config for a given round_number (0 = final)
	const getConfig = (
		roundNumber: number,
	): { setsToWin: number; legsPerSet: number } => {
		// Find tier matching this round
		const tier = tiers.find((t) => t.round === roundNumber)
		if (tier) return { setsToWin: tier.setsToWin, legsPerSet: tier.legsPerSet }
		// Fallback to last tier
		const last = tiers[tiers.length - 1]
		return { setsToWin: last.setsToWin, legsPerSet: last.legsPerSet }
	}

	// Get first-round seed pairings
	const firstRoundPairings = getBracket(n)

	// Generate matches from final (level 0) to first round (level totalRounds-1)
	// round_number = 0 for final, totalRounds-1 for first round
	for (let level = 0; level < totalRounds; level++) {
		const roundNumber = level // level 0 = final, level N-1 = first round
		const isFirstRound = level === totalRounds - 1
		const config = getConfig(roundNumber)

		const levelMatchIds = matchIdTree[level]

		for (let pos = 0; pos < levelMatchIds.length; pos++) {
			const matchId = levelMatchIds[pos]

			// advances_to_match_id: parent is at level-1, position floor(pos/2)
			let advancesToMatchId: string | null = null
			let advancesToSlot: "a" | "b" | null = null

			if (level > 0) {
				const parentLevel = level - 1
				const parentPos = Math.floor(pos / 2)
				advancesToMatchId = matchIdTree[parentLevel][parentPos]
				advancesToSlot = pos % 2 === 0 ? "a" : "b"
			}

			let teamAId: string | null = null
			let teamBId: string | null = null
			let status: "pending" | "bye" = "pending"

			if (isFirstRound) {
				// Map seed numbers to team IDs
				const [seedA, seedB] = firstRoundPairings[pos]
				teamAId = seedA !== null && seedA <= n ? teamIds[seedA - 1] : null
				teamBId = seedB !== null && seedB <= n ? teamIds[seedB - 1] : null

				// BYE: one slot is null
				if (teamAId === null || teamBId === null) {
					status = "bye"
				}
			}
			// Non-first-round matches always have null teams (filled by Phase 5)

			matches.push({
				id: matchId,
				phase_id: phaseId,
				event_match_id: nextEventMatchId++,
				group_number: null,
				round_number: roundNumber,
				position: pos,
				team_a_id: teamAId,
				team_b_id: teamBId,
				referee_team_id: null,
				advances_to_match_id: advancesToMatchId,
				advances_to_slot: advancesToSlot,
				status,
				sets_to_win: config.setsToWin,
				legs_per_set: config.legsPerSet,
			})
		}
	}

	return matches
}
