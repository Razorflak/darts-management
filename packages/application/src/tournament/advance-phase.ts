import {
	getMatchRepositoryWithSql,
	sql,
	tournamentRepository,
} from "@darts-management/db"
import { separateGroupsForBracket } from "@darts-management/domain"
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
		const teamsNewSeed = separateGroupsForBracket(qualifiedTeams)
		const nextPhase = await tournamentRepository.getNextPhaseByPhaseId(phaseId)
		if (!nextPhase) {
			throw new Error("No next phase found")
		}
		const nextPhaseMatches = await matchRepo.getByPhaseId(nextPhase.id)
		const seededMatches = nextPhaseMatches
			.filter(
				(m) =>
					(m.bracketInfo?.seed_a && m.bracketInfo?.seed_b) ||
					(m.roundRobinInfo?.slot_a && m.roundRobinInfo?.slot_b),
			)
			.map((m) => {
				const matchSeedA = m.bracketInfo?.seed_a ?? m.roundRobinInfo?.slot_a
				const matchSeedB = m.bracketInfo?.seed_b ?? m.roundRobinInfo?.slot_b
				return {
					matchId: m.id,
					teamAId:
						teamsNewSeed.find((team) => team.seed === matchSeedA)?.teamId ?? "",
					teamBId:
						teamsNewSeed.find((team) => team.seed === matchSeedB)?.teamId ?? "",
				}
			})
		console.log("seededMatches", seededMatches, seededMatches.length)

		try {
			await matchRepo.bulkUpdateTeams(seededMatches)
		} catch (e) {
			console.error("Error updating teams for next phase", e)
		}
	})
}
