import type {
	BracketInfoInsertRow,
	GeneratorResult,
	MatchInsertRow,
} from "../match-schemas.js"

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
 * Pre-generates all UUIDs and wires winner_goes_to_info_id via BracketInfoInsertRow.
 *
 * @param teamIds - Team IDs in seed order. If fewer than bracketSize, extras are BYEs.
 * @param phaseId - The phase this bracket belongs to.
 * @param tournamentId - Used for cascade delete on bracket_match_info.
 * @param startEventMatchId - Starting sequential ID for this phase.
 * @param tiers - Array of { round, setsToWin, legsPerSet } per round.
 *   round=0 is the final, round=1 is semis, etc. (distance from final).
 *   If tiers doesn't cover all rounds, the last tier's config is used.
 */
export function generateSingleEliminationBracket(
	teamIds: string[],
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	tiers: Array<{ round: number; setsToWin: number; legsPerSet: number }>,
): GeneratorResult {
	const n = teamIds.length
	const totalRounds = Math.ceil(Math.log2(Math.max(n, 2)))

	// Pre-generate bracket info UUIDs level by level (level 0 = final)
	const infoIdTree: string[][] = []
	for (let level = 0; level < totalRounds; level++) {
		const count = 2 ** level
		infoIdTree.push(Array.from({ length: count }, () => crypto.randomUUID()))
	}

	const getConfig = (
		roundNumber: number,
	): { setsToWin: number; legsPerSet: number } => {
		const tier = tiers.find((t) => t.round === roundNumber)
		if (tier) return { setsToWin: tier.setsToWin, legsPerSet: tier.legsPerSet }
		const last = tiers[tiers.length - 1]
		return { setsToWin: last.setsToWin, legsPerSet: last.legsPerSet }
	}

	const firstRoundPairings = getBracket(n)

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	for (let level = 0; level < totalRounds; level++) {
		const roundNumber = level // 0 = final, totalRounds-1 = first round
		const isFirstRound = level === totalRounds - 1
		const config = getConfig(roundNumber)
		const levelInfoIds = infoIdTree[level]

		for (let pos = 0; pos < levelInfoIds.length; pos++) {
			const infoId = levelInfoIds[pos]

			// winner_goes_to: parent is at level-1, position floor(pos/2)
			let winnerGoesToInfoId: string | null = null
			let winnerGoesToSlot: "a" | "b" | null = null
			if (level > 0) {
				winnerGoesToInfoId = infoIdTree[level - 1][Math.floor(pos / 2)]
				winnerGoesToSlot = pos % 2 === 0 ? "a" : "b"
			}

			// Seeds: only for the first round
			let seedA: number | null = null
			let seedB: number | null = null
			if (isFirstRound) {
				const [sA, sB] = firstRoundPairings[pos]
				seedA = sA
				seedB = sB
			}

			bracketInfos.push({
				id: infoId,
				tournament_id: tournamentId,
				bracket: "W",
				round_number: roundNumber,
				position: pos,
				group_number: null,
				seed_a: seedA,
				seed_b: seedB,
				winner_goes_to_info_id: winnerGoesToInfoId,
				winner_goes_to_slot: winnerGoesToSlot,
				loser_goes_to_info_id: null,
				loser_goes_to_slot: null,
			})

			// Team assignment: first round only
			let teamAId: string | null = null
			let teamBId: string | null = null
			let status: MatchInsertRow["status"] = "pending"

			if (isFirstRound) {
				const [sA, sB] = firstRoundPairings[pos]
				teamAId = sA !== null && sA <= n ? teamIds[sA - 1] : null
				teamBId = sB !== null && sB <= n ? teamIds[sB - 1] : null
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
	}

	return { matches, roundRobinInfos: [], bracketInfos }
}

/**
 * Generate an empty single-elimination bracket structure for a given player count.
 * All team slots are null — use assignTeamsToPhase0 to fill first-round slots.
 * Seeds (seed_a/seed_b) are pre-computed via getBracket for the first round.
 */
export function generateSingleEliminationStructure(
	playerCount: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	tiers: Array<{ round: number; setsToWin: number; legsPerSet: number }>,
): GeneratorResult {
	const n = playerCount
	const totalRounds = Math.ceil(Math.log2(Math.max(n, 2)))

	const infoIdTree: string[][] = []
	for (let level = 0; level < totalRounds; level++) {
		const count = 2 ** level
		infoIdTree.push(Array.from({ length: count }, () => crypto.randomUUID()))
	}

	const getConfig = (
		roundNumber: number,
	): { setsToWin: number; legsPerSet: number } => {
		const tier = tiers.find((t) => t.round === roundNumber)
		if (tier) return { setsToWin: tier.setsToWin, legsPerSet: tier.legsPerSet }
		const last = tiers[tiers.length - 1]
		return { setsToWin: last.setsToWin, legsPerSet: last.legsPerSet }
	}

	const firstRoundPairings = getBracket(n)

	const bracketInfos: BracketInfoInsertRow[] = []
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	for (let level = 0; level < totalRounds; level++) {
		const roundNumber = level
		const isFirstRound = level === totalRounds - 1
		const config = getConfig(roundNumber)
		const levelInfoIds = infoIdTree[level]

		for (let pos = 0; pos < levelInfoIds.length; pos++) {
			const infoId = levelInfoIds[pos]

			let winnerGoesToInfoId: string | null = null
			let winnerGoesToSlot: "a" | "b" | null = null
			if (level > 0) {
				winnerGoesToInfoId = infoIdTree[level - 1][Math.floor(pos / 2)]
				winnerGoesToSlot = pos % 2 === 0 ? "a" : "b"
			}

			let seedA: number | null = null
			let seedB: number | null = null
			if (isFirstRound) {
				const [sA, sB] = firstRoundPairings[pos]
				seedA = sA
				seedB = sB
			}

			bracketInfos.push({
				id: infoId,
				tournament_id: tournamentId,
				bracket: "W",
				round_number: roundNumber,
				position: pos,
				group_number: null,
				seed_a: seedA,
				seed_b: seedB,
				winner_goes_to_info_id: winnerGoesToInfoId,
				winner_goes_to_slot: winnerGoesToSlot,
				loser_goes_to_info_id: null,
				loser_goes_to_slot: null,
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
	}

	return { matches, roundRobinInfos: [], bracketInfos }
}
