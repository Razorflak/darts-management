import { getMatchRepositoryWithSql, sql } from "@darts-management/db"
import {
	type MatchResultPayload,
	resolveMatchResult,
	validateScore,
} from "@darts-management/domain"
import { trace } from "@opentelemetry/api"

type Sql = typeof sql

export async function submitMatchResult(
	matchId: string,
	payload: MatchResultPayload,
	userRoles: Array<{ entityId: string; role: string }>,
): Promise<{ phaseId: string; winnerTeamId: string }> {
	trace.getActiveSpan()?.setAttribute("match.id", matchId)

	return await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const matchRepo = getMatchRepositoryWithSql(tx)

		// 1. Lock match row (prevents double-submission)
		const match = await matchRepo.lockMatchForUpdate(matchId)

		// 2. Authz: get entity_id from tournament chain via phase
		const tournamentInfo = await tx`
			SELECT t.event_id, e.entity_id
			FROM phase p
			JOIN tournament t ON t.id = p.tournament_id
			JOIN event e ON e.id = t.event_id
			WHERE p.id = ${match.phase_id}
		`
		if (tournamentInfo.length === 0) throw new Error("NotFound")
		const entityId = tournamentInfo[0].entity_id as string
		const eventId = tournamentInfo[0].event_id as string

		const hasAccess = userRoles.some(
			(r) =>
				r.entityId === entityId &&
				[
					"adminTournoi",
					"adminClub",
					"adminComite",
					"adminLigue",
					"adminFederal",
				].includes(r.role),
		)
		if (!hasAccess) throw new Error("Forbidden")

		// 3. Validate score (throws "ScoreInvalid: ..." on bad scores)
		validateScore(
			{ sets_to_win: match.sets_to_win, legs_per_set: match.legs_per_set },
			payload,
		)

		// 4. Resolve winner/loser, scores and status
		const { scoreA, scoreB, status, winnerTeamId, loserTeamId } =
			resolveMatchResult(match, payload)

		await matchRepo.updateMatchResult(matchId, scoreA, scoreB, status)

		// 5. Bracket advancement (only for bracket matches)
		if (match.bracket_info_id) {
			await matchRepo.advanceWinnerInBracket(matchId, winnerTeamId)
			await matchRepo.advanceLoserInBracket(matchId, loserTeamId)

			// 6. Check for GF bracket reset (D-12)
			// GF reset: LB winner beats WB winner in the GF → they must play again
			const bracketInfo = await matchRepo.getMatchBracketInfo(matchId)
			if (
				bracketInfo !== null &&
				bracketInfo.bracket === "GF" &&
				bracketInfo.winner_goes_to_info_id === null
			) {
				// This is the final GF match (no further winner_goes_to).
				// Convention: team_b is the LB winner (from double_elimination generator).
				// If the LB winner (team_b) won, create a reset match.
				if (winnerTeamId === match.team_b_id) {
					await matchRepo.createResetMatch(matchId, eventId)
				}
			}
		}

		return { phaseId: match.phase_id, winnerTeamId }
	})
}
