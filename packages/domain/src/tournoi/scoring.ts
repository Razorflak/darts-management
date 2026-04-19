import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ScorePayloadSchema = z.object({
	score_a: z.number().int().min(0),
	score_b: z.number().int().min(0),
})
export type ScorePayload = z.infer<typeof ScorePayloadSchema>

export const WalkoverPayloadSchema = z.object({
	walkover: z.enum(["a", "b"]),
})
export type WalkoverPayload = z.infer<typeof WalkoverPayloadSchema>

export const MatchResultPayloadSchema = z.union([
	ScorePayloadSchema,
	WalkoverPayloadSchema,
])
export type MatchResultPayload = z.infer<typeof MatchResultPayloadSchema>

export const StandingEntrySchema = z.object({
	team_id: z.string(),
	played: z.number().int(),
	wins: z.number().int(),
	losses: z.number().int(),
	points: z.number().int(),
	legs_won: z.number().int(),
	legs_lost: z.number().int(),
	leg_diff: z.number().int(),
})
export type StandingEntry = z.infer<typeof StandingEntrySchema>

// ─── Constants ────────────────────────────────────────────────────────────────

export const SCORING_RULES = {
	WIN: 3,
	LOSS: 0,
	WALKOVER_WIN: 3,
	WALKOVER_LOSS: 0,
	BYE: 3,
} as const

// ─── Match input type for standings computation ───────────────────────────────

type MatchForStandings = {
	team_a_id: string | null
	team_b_id: string | null
	score_a: number | null
	score_b: number | null
	status: string
	walkover?: "a" | "b" | null
}

// ─── validateScore ────────────────────────────────────────────────────────────

/**
 * Validates a match result payload against the match configuration.
 * Throws Error("ScoreInvalid: ...") for invalid scores.
 * Walkover payloads are always valid.
 */
export function validateScore(
	match: { sets_to_win: number; legs_per_set: number },
	result: MatchResultPayload,
): void {
	// Walkover is always valid
	if ("walkover" in result) {
		return
	}

	const { score_a, score_b } = result
	const { sets_to_win, legs_per_set } = match

	if (sets_to_win === 1) {
		// Legs-only mode: winner must have exactly ceil(legs_per_set / 2) legs
		const required = Math.ceil(legs_per_set / 2)
		const winner = Math.max(score_a, score_b)
		const loser = Math.min(score_a, score_b)

		if (winner !== required) {
			throw new Error(
				`ScoreInvalid: winner must have exactly ${required} legs (got ${winner})`,
			)
		}
		if (loser >= required) {
			throw new Error(
				`ScoreInvalid: loser must have fewer than ${required} legs (got ${loser})`,
			)
		}
	} else {
		// Sets mode: winner must have exactly sets_to_win sets
		const winner = Math.max(score_a, score_b)
		const loser = Math.min(score_a, score_b)

		if (winner !== sets_to_win) {
			throw new Error(
				`ScoreInvalid: winner must have exactly ${sets_to_win} sets (got ${winner})`,
			)
		}
		if (loser >= sets_to_win) {
			throw new Error(
				`ScoreInvalid: loser must have fewer than ${sets_to_win} sets (got ${loser})`,
			)
		}
	}
}

// ─── computeStandings ────────────────────────────────────────────────────────

/**
 * Computes standings from a list of matches.
 * Done and walkover matches are counted normally.
 * BYE matches give the present team 3 points (same as a win) with no legs.
 * Returns standings sorted by breakTie comparator.
 */
export function computeStandings(
	matches: MatchForStandings[],
): StandingEntry[] {
	const map = new Map<string, StandingEntry>()

	function getOrCreate(teamId: string): StandingEntry {
		if (!map.has(teamId)) {
			map.set(teamId, {
				team_id: teamId,
				played: 0,
				wins: 0,
				losses: 0,
				points: 0,
				legs_won: 0,
				legs_lost: 0,
				leg_diff: 0,
			})
		}
		return map.get(teamId) as StandingEntry
	}

	// Ensure all teams that appear in any match (even BYE) get an entry with 0s
	for (const m of matches) {
		if (m.team_a_id) getOrCreate(m.team_a_id)
		if (m.team_b_id) getOrCreate(m.team_b_id)
	}

	// Process done, walkover, and bye matches
	const counted = matches.filter(
		(m) => m.status === "done" || m.status === "walkover" || m.status === "bye",
	)

	for (const m of counted) {
		// BYE: one slot is null — credit the present team a win
		if (m.status === "bye") {
			const teamId = m.team_a_id ?? m.team_b_id
			if (!teamId) continue
			const team = getOrCreate(teamId)
			team.played++
			team.wins++
			team.points += SCORING_RULES.BYE
			continue
		}

		if (!m.team_a_id || !m.team_b_id) continue

		const a = getOrCreate(m.team_a_id)
		const b = getOrCreate(m.team_b_id)

		if (m.status === "walkover") {
			// walkover field indicates which team won (a = team_a won)
			// legs are 0-0
			const aWon = m.walkover === "a"
			a.played++
			b.played++
			if (aWon) {
				a.wins++
				a.points += SCORING_RULES.WALKOVER_WIN
				b.losses++
				b.points += SCORING_RULES.WALKOVER_LOSS
			} else {
				b.wins++
				b.points += SCORING_RULES.WALKOVER_WIN
				a.losses++
				a.points += SCORING_RULES.WALKOVER_LOSS
			}
		} else {
			// status === 'done'
			const scoreA = m.score_a ?? 0
			const scoreB = m.score_b ?? 0

			a.played++
			b.played++
			a.legs_won += scoreA
			a.legs_lost += scoreB
			b.legs_won += scoreB
			b.legs_lost += scoreA
			a.leg_diff = a.legs_won - a.legs_lost
			b.leg_diff = b.legs_won - b.legs_lost

			if (scoreA > scoreB) {
				a.wins++
				a.points += SCORING_RULES.WIN
				b.losses++
				b.points += SCORING_RULES.LOSS
			} else {
				b.wins++
				b.points += SCORING_RULES.WIN
				a.losses++
				a.points += SCORING_RULES.LOSS
			}
		}
	}

	const allMatches: MatchForStandings[] = matches.filter(
		(m) => m.status === "done" || m.status === "walkover",
	)
	console.log("All matches for tie-breaking:", allMatches)
	const r = Array.from(map.values()).sort((a, b) => breakTie(a, b, allMatches))
	console.log("Computed standings:", r)

	return r
}

// ─── breakTie ────────────────────────────────────────────────────────────────

/**
 * Comparator for sorting StandingEntry by:
 * 1. Points DESC
 * 2. Losses ASC (fewer losses ranks higher — critical for double_loss_groups
 *    where a 2-0 team and a 2-1 team both earn 6 points)
 * 3. leg_diff DESC
 * 4. Head-to-head result (winner of direct match ranks higher)
 *
 * Returns negative if a ranks before b, positive if b ranks before a, 0 if equal.
 */
export function breakTie(
	a: StandingEntry,
	b: StandingEntry,
	matches: MatchForStandings[],
): number {
	// 1. Points DESC
	if (a.points !== b.points) {
		return b.points - a.points
	}

	// 2. Losses ASC — fewer losses ranks higher.
	// In round-robin all teams play the same number of matches, so equal points
	// implies equal losses (no-op). In double_loss_groups teams play different
	// numbers of matches, so this correctly places 2-0 teams above 2-1 teams.
	if (a.losses !== b.losses) {
		console.log(
			`Breaking tie between ${a.team_id} and ${b.team_id} by losses: ${a.losses} vs ${b.losses}`,
		)
		return a.losses - b.losses
	}

	// 3. Leg difference DESC
	if (a.leg_diff !== b.leg_diff) {
		return b.leg_diff - a.leg_diff
	}

	// 4. Head-to-head
	const h2h = matches.find(
		(m) =>
			(m.team_a_id === a.team_id && m.team_b_id === b.team_id) ||
			(m.team_a_id === b.team_id && m.team_b_id === a.team_id),
	)

	if (h2h) {
		if (h2h.status === "done") {
			const scoreA = h2h.score_a ?? 0
			const scoreB = h2h.score_b ?? 0

			if (h2h.team_a_id === a.team_id) {
				// a is team_a in this match
				if (scoreA > scoreB) return -1 // a won
				if (scoreB > scoreA) return 1 // b won
			} else {
				// b is team_a in this match
				if (scoreB > scoreA) return -1 // a won (as team_b)
				if (scoreA > scoreB) return 1 // b won (as team_a)
			}
		} else if (h2h.status === "walkover") {
			const aWon =
				(h2h.team_a_id === a.team_id && h2h.walkover === "a") ||
				(h2h.team_b_id === a.team_id && h2h.walkover === "b")
			return aWon ? -1 : 1
		}
	}

	return 0
}
