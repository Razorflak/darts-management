import type { MatchInsertRow } from "../match-schemas.js"

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
 * Generate all round-robin matches for the given groups.
 *
 * Each group uses Berger rotation to produce the schedule.
 * event_match_id is assigned sequentially starting from startEventMatchId.
 */
export function generateRoundRobinMatches(
	groups: string[][],
	phaseId: string,
	startEventMatchId: number,
	config: { setsToWin: number; legsPerSet: number },
): MatchInsertRow[] {
	const matches: MatchInsertRow[] = []
	let nextEventMatchId = startEventMatchId

	for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
		const group = groups[groupIndex]
		const rounds = bergerRounds(group)

		for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
			const round = rounds[roundIndex]

			for (let position = 0; position < round.length; position++) {
				const [teamA, teamB] = round[position]

				matches.push({
					id: crypto.randomUUID(),
					phase_id: phaseId,
					event_match_id: nextEventMatchId++,
					group_number: groupIndex,
					round_number: roundIndex,
					position,
					team_a_id: teamA,
					team_b_id: teamB,
					referee_team_id: null,
					advances_to_match_id: null,
					advances_to_slot: null,
					status: "pending",
					sets_to_win: config.setsToWin,
					legs_per_set: config.legsPerSet,
				})
			}
		}
	}

	return matches
}
