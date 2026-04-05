import type {
	GeneratorResult,
	MatchInsertRow,
	RoundRobinInfoInsertRow,
} from "../match-schemas.js"

/**
 * Compute the size of each group for a given player count and group size target.
 * Matches the distribution produced by snakeDistribute.
 *
 * Example: 7 players, 3/group → [2, 2, 3]
 */
export function computeGroupSizes(
	playerCount: number,
	playersPerGroup: number,
): number[] {
	if (playerCount <= 0) return []
	const groupCount = Math.ceil(playerCount / playersPerGroup)
	const baseSize = Math.floor(playerCount / groupCount)
	const remainder = playerCount - baseSize * groupCount
	const sizes = Array.from({ length: groupCount }, () => baseSize)
	if (remainder > 0) sizes[groupCount - 1] += remainder
	return sizes
}

/**
 * Berger circle-method round-robin rotation.
 *
 * For N teams (N even), generates N-1 rounds of N/2 matches each.
 * For N odd, adds a 'BYE' sentinel, generates N rounds, then filters BYE matches.
 * Returns rounds: each round is an array of [teamA, teamB] pairs.
 */
export function bergerRounds(teams: string[]): [string, string][][] {
	const isOdd = teams.length % 2 !== 0
	const padded = isOdd ? [...teams, "BYE"] : [...teams]
	const n = padded.length // always even

	const fixed = padded[0]
	let rotating = padded.slice(1) // length n-1

	const rounds: [string, string][][] = []

	for (let r = 0; r < n - 1; r++) {
		const round: [string, string][] = []

		// Fixed team plays against the last in rotating array
		round.push([fixed, rotating[n / 2 - 1]])

		// Other pairs: rotating[i] vs rotating[n-2-i]
		for (let i = 0; i < n / 2 - 1; i++) {
			round.push([rotating[i], rotating[n - 2 - i]])
		}

		// Filter out BYE matches
		const filteredRound = round.filter(([a, b]) => a !== "BYE" && b !== "BYE")
		rounds.push(filteredRound)

		// Rotate: move last element to front
		rotating = [rotating[n - 2], ...rotating.slice(0, n - 2)]
	}

	return rounds
}

/**
 * Compute seed pairings (1-based) for each round via Berger rotation
 * applied to indices [1..n].
 *
 * Returns rounds: each round is an array of [seedA, seedB] pairs.
 */
function bergerSeedRounds(n: number): [number, number][][] {
	const seeds = Array.from({ length: n }, (_, i) => i + 1)
	const strRounds = bergerRounds(seeds.map(String))
	return strRounds.map((round) =>
		round.map(([a, b]) => [Number(a), Number(b)] as [number, number]),
	)
}

/**
 * Generate all round-robin matches for the given groups (teams already assigned).
 *
 * Each group uses Berger rotation to produce the schedule.
 * event_match_id is assigned sequentially starting from startEventMatchId.
 */
export function generateRoundRobinMatches(
	groups: string[][],
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
): GeneratorResult {
	const matches: MatchInsertRow[] = []
	const roundRobinInfos: RoundRobinInfoInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
		const group = groups[groupIndex]
		const rounds = bergerRounds(group)
		const seedRounds = bergerSeedRounds(group.length)

		for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
			const round = rounds[roundIndex]
			const seedRound = seedRounds[roundIndex]

			for (let position = 0; position < round.length; position++) {
				const [teamA, teamB] = round[position]
				const [seedA, seedB] = seedRound[position]

				const infoId = crypto.randomUUID()
				const matchId = crypto.randomUUID()

				roundRobinInfos.push({
					id: infoId,
					tournament_id: tournamentId,
					group_number: groupIndex,
					round_number: roundIndex,
					position,
					slot_a: seedA,
					slot_b: seedB,
				})

				matches.push({
					id: matchId,
					phase_id: phaseId,
					event_match_id: nextEventMatchId++,
					team_a_id: teamA,
					team_b_id: teamB,
					referee_team_id: null,
					status: "pending",
					sets_to_win: config.setsToWin,
					legs_per_set: config.legsPerSet,
					round_robin_info_id: infoId,
					bracket_info_id: null,
				})
			}
		}
	}

	return { matches, roundRobinInfos, bracketInfos: [] }
}

/**
 * Generate an empty round-robin match structure for a given player count.
 * All team slots are null — use assignTeamsToRoundRobin to fill them in.
 * Seeds (slot_a/slot_b) are pre-computed via Berger rotation on indices.
 */
export function generateRoundRobinStructure(
	playerCount: number,
	playersPerGroup: number,
	phaseId: string,
	tournamentId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
): GeneratorResult {
	const groupSizes = computeGroupSizes(playerCount, playersPerGroup)
	const matches: MatchInsertRow[] = []
	const roundRobinInfos: RoundRobinInfoInsertRow[] = []
	let nextEventMatchId = startEventMatchId
	let seedOffset = 0

	for (let groupIndex = 0; groupIndex < groupSizes.length; groupIndex++) {
		const g = groupSizes[groupIndex]
		const seedRounds = bergerSeedRounds(g)

		for (let roundIndex = 0; roundIndex < seedRounds.length; roundIndex++) {
			const seedRound = seedRounds[roundIndex]

			for (let position = 0; position < seedRound.length; position++) {
				const [seedA, seedB] = seedRound[position]

				const infoId = crypto.randomUUID()
				const matchId = crypto.randomUUID()

				roundRobinInfos.push({
					id: infoId,
					tournament_id: tournamentId,
					group_number: groupIndex,
					round_number: roundIndex,
					position,
					slot_a: seedA + seedOffset,
					slot_b: seedB + seedOffset,
				})

				matches.push({
					id: matchId,
					phase_id: phaseId,
					event_match_id: nextEventMatchId++,
					team_a_id: null,
					team_b_id: null,
					referee_team_id: null,
					status: "pending",
					sets_to_win: config.setsToWin,
					legs_per_set: config.legsPerSet,
					round_robin_info_id: infoId,
					bracket_info_id: null,
				})
			}
		}

		seedOffset += g
	}

	return { matches, roundRobinInfos, bracketInfos: [] }
}
