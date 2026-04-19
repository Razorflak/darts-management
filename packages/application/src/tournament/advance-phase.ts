import {
	getMatchRepositoryWithSql,
	sql,
	tournamentRepository,
} from "@darts-management/db"
import {
	assignTeamsToPhase,
	separateGroupsForBracket,
} from "@darts-management/domain"
import { trace } from "@opentelemetry/api"
import { loadPhaseQualifiers } from "./phase/compute-qualifiers.js"

type Sql = typeof sql

/**
 * Checks if a phase is complete and, if so, seeds the next phase.
 * For round-robin phases, qualifiers are computed from standings.
 * For bracket phases, the winner of the final match is advanced.
 *
 * Must be called after submitMatchResult with the same phaseId and winnerTeamId.
 */
export async function advancePhase(phaseId: string): Promise<void> {
	trace.getActiveSpan()?.setAttribute("phase.id", phaseId)

	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const matchRepo = getMatchRepositoryWithSql(tx)

		// 1. Check if phase is complete
		const { total, finished } = await matchRepo.checkPhaseComplete(phaseId)
		if (total === 0 || total !== finished) return

		// 2. Fetch phase type and config
		const phaseRows = await tx<{ qualifiers_per_group: number | null }[]>`
			SELECT qualifiers_per_group
			FROM phase
			WHERE id = ${phaseId}
		`
		if (phaseRows.length === 0) return
		const { qualifiers_per_group } = phaseRows[0]

		// 3. Seed next phase based on phase type
		const qualifiersPerGroup = qualifiers_per_group ?? 1
		const qualifiedTeams = await loadPhaseQualifiers(
			tx,
			phaseId,
			qualifiersPerGroup,
		)
		console.log("Qualified teams for next phase:", qualifiedTeams)
		const teamsNewSeed = separateGroupsForBracket(qualifiedTeams)
		const nextPhase = await tournamentRepository.getNextPhaseByPhaseId(phaseId)
		if (!nextPhase) {
			throw new Error("No next phase found")
		}
		const nextPhaseMatches = await matchRepo.getByPhaseId(nextPhase.id)
		const teamIds = teamsNewSeed
			.sort((a, b) => a.seed - b.seed)
			.map((t) => t.teamId)

		const input = {
			roundRobinInfos: nextPhaseMatches
				.filter((m) => m.roundRobinInfo !== null)
				.map((m) => m.roundRobinInfo!),
			bracketInfos: nextPhaseMatches
				.filter((m) => m.bracketInfo !== null)
				.map((m) => m.bracketInfo!),
			matches: nextPhaseMatches.map((m) => ({
				id: m.id,
				event_match_id: m.event_match_id,
				round_robin_info_id: m.roundRobinInfo?.id ?? null,
				bracket_info_id: m.bracketInfo?.id ?? null,
				team_a_id: null,
				team_b_id: null,
				status: "pending" as const,
			})),
		}

		const seeded = assignTeamsToPhase(input, teamIds)

		await matchRepo.bulkUpdateTeams(
			seeded.matches.map((m) => ({
				matchId: m.id,
				teamAId: m.team_a_id,
				teamBId: m.team_b_id,
				status: m.status !== "pending" ? m.status : undefined,
			})),
		)
	})
}
