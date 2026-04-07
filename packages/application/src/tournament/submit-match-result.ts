import { getMatchRepositoryWithSql, sql } from "@darts-management/db"
import { type MatchResultPayload, validateScore } from "@darts-management/domain"
import { trace } from "@opentelemetry/api"

type Sql = typeof sql

export async function submitMatchResult(
	matchId: string,
	payload: MatchResultPayload,
	userRoles: Array<{ entityId: string; role: string }>,
): Promise<void> {
	trace.getActiveSpan()?.setAttribute("match.id", matchId)

	await sql.begin(async (rawTx) => {
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

		// 4. Determine winner/loser and update match
		let scoreA: number
		let scoreB: number
		let status: "done" | "walkover"
		let winnerTeamId: string
		let loserTeamId: string

		if ("walkover" in payload) {
			scoreA = 0
			scoreB = 0
			status = "walkover"
			// walkover 'a' means team_a forfeited → team_b wins
			winnerTeamId = payload.walkover === "a" ? (match.team_b_id ?? "") : (match.team_a_id ?? "")
			loserTeamId = payload.walkover === "a" ? (match.team_a_id ?? "") : (match.team_b_id ?? "")
		} else {
			scoreA = payload.score_a
			scoreB = payload.score_b
			status = "done"
			winnerTeamId = scoreA > scoreB ? (match.team_a_id ?? "") : (match.team_b_id ?? "")
			loserTeamId = scoreA > scoreB ? (match.team_b_id ?? "") : (match.team_a_id ?? "")
		}

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

		// 7. Check if phase is complete → seed next phase
		const { total, finished } = await matchRepo.checkPhaseComplete(match.phase_id)
		if (total > 0 && total === finished) {
			if (match.round_robin_info_id) {
				// Round-robin: compute standings and take top qualifiers per group
				const phaseConfig = await tx`
					SELECT qualifiers_per_group FROM phase WHERE id = ${match.phase_id}
				`
				const qualifiersPerGroup = (phaseConfig[0]?.qualifiers_per_group as number | null) ?? 1
				const qualifiedTeams = await matchRepo.getPhaseQualifiers(
					match.phase_id,
					qualifiersPerGroup,
				)
				if (qualifiedTeams.length > 0) {
					await matchRepo.seedNextPhase(match.phase_id, qualifiedTeams)
				}
			} else if (match.bracket_info_id) {
				// Bracket phase: the winner of the final advances to next phase (if any)
				if (winnerTeamId) {
					await matchRepo.seedNextPhase(match.phase_id, [winnerTeamId])
				}
			}
		}
	})
}
