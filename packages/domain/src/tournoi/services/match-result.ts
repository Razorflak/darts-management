import { z } from "zod"
import type { MatchResultPayload } from "../scoring.js"

// ─── Schema & type ────────────────────────────────────────────────────────────

export const MatchResolutionSchema = z.object({
	scoreA: z.number().int(),
	scoreB: z.number().int(),
	status: z.enum(["done", "walkover"]),
	winnerTeamId: z.string(),
	loserTeamId: z.string(),
})
export type MatchResolution = z.infer<typeof MatchResolutionSchema>

type MatchParticipants = {
	team_a_id: string | null
	team_b_id: string | null
}

// ─── resolveMatchResult ───────────────────────────────────────────────────────

/**
 * Pure function: determines scores, status, winner and loser from a validated
 * match result payload. No database access.
 */
export function resolveMatchResult(
	match: MatchParticipants,
	payload: MatchResultPayload,
): MatchResolution {
	if ("walkover" in payload) {
		// walkover 'a' means team_a forfeited → team_b wins
		const winnerTeamId =
			payload.walkover === "a"
				? (match.team_b_id ?? "")
				: (match.team_a_id ?? "")
		const loserTeamId =
			payload.walkover === "a"
				? (match.team_a_id ?? "")
				: (match.team_b_id ?? "")
		return {
			scoreA: 0,
			scoreB: 0,
			status: "walkover",
			winnerTeamId,
			loserTeamId,
		}
	}

	const { score_a: scoreA, score_b: scoreB } = payload
	const winnerTeamId =
		scoreA > scoreB ? (match.team_a_id ?? "") : (match.team_b_id ?? "")
	const loserTeamId =
		scoreA > scoreB ? (match.team_b_id ?? "") : (match.team_a_id ?? "")
	return { scoreA, scoreB, status: "done", winnerTeamId, loserTeamId }
}
