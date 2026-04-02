/**
 * Distribute teams into groups using snake seeding.
 *
 * Per CONTEXT.md: fill groups to `playersPerGroup`, the last group receives
 * any remaining teams (may be smaller). The actual group count is derived from
 * `Math.ceil(teams.length / playersPerGroup)`, capped at `groupCount`.
 *
 * Algorithm: snake passes across all groups.
 * - Pass left→right: G0, G1, G2, ...
 * - Pass right→left: ..., G2, G1, G0
 * - Remainder teams (teams.length % groupCount) appended to last group
 *
 * Example with 6 teams and 3 groups (2 per group):
 *   Pass 1: A→G0, B→G1, C→G2
 *   Pass 2: D→G2, E→G1, F→G0
 *   Result: G0=[A,F], G1=[B,E], G2=[C,D]
 *
 * Example with 7 teams, playersPerGroup=3:
 *   groupCount = ceil(7/3) = 3
 *   snakeCount = 6 (divisible by 3), remainder 1 → last group
 *   Pass 1: A→G0, B→G1, C→G2
 *   Pass 2: D→G2, E→G1, F→G0
 *   Remainder: G→G2
 *   Result: G0=[A,F], G1=[B,E], G2=[C,D,G]
 */
export function snakeDistribute(
	teams: string[],
	groupCount: number,
	playersPerGroup: number,
): string[][] {
	if (teams.length === 0) return []

	// Actual number of groups: ceil(N / playersPerGroup), capped at requested groupCount
	const actualGroupCount = Math.min(
		groupCount,
		Math.ceil(teams.length / playersPerGroup),
	)

	if (actualGroupCount <= 1) {
		return [teams.slice()]
	}

	const groups: string[][] = Array.from({ length: actualGroupCount }, () => [])

	// Number of teams that go through the snake:
	// floor(teams.length / actualGroupCount) * actualGroupCount
	// so that each pass is complete. Remainder teams append to last group.
	const snakeCount =
		Math.floor(teams.length / actualGroupCount) * actualGroupCount
	const _remainder = teams.length - snakeCount

	// Snake distribute snakeCount teams using zigzag passes of actualGroupCount
	let direction = 1
	let groupIdx = 0

	for (let i = 0; i < snakeCount; i++) {
		groups[groupIdx].push(teams[i])

		// At the end of each pass (last team in a direction), reverse
		const next = groupIdx + direction
		if (next >= actualGroupCount) {
			direction = -1
			groupIdx = actualGroupCount - 1
		} else if (next < 0) {
			direction = 1
			groupIdx = 0
		} else {
			groupIdx = next
		}
	}

	// Append remainder to last group
	for (let i = snakeCount; i < teams.length; i++) {
		groups[actualGroupCount - 1].push(teams[i])
	}

	return groups
}
