import { getMatchRepositoryWithSql, sql } from "@darts-management/db"
import { trace } from "@opentelemetry/api"

type Sql = typeof sql

/**
 * Checks if a phase is complete and, if so, seeds the next phase.
 * For round-robin phases, qualifiers are computed from standings.
 * For bracket phases, the winner of the final match is advanced.
 *
 * Must be called after submitMatchResult with the same phaseId and winnerTeamId.
 */
export async function advancePhase(
	phaseId: string,
	winnerTeamId: string,
): Promise<void> {
	trace.getActiveSpan()?.setAttribute("phase.id", phaseId)

	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const matchRepo = getMatchRepositoryWithSql(tx)

		// 1. Check if phase is complete
		const { total, finished } = await matchRepo.checkPhaseComplete(phaseId)
		if (total === 0 || total !== finished) return

		// 2. Fetch phase type and config
		const phaseRows = await tx<
			{ type: string; qualifiers_per_group: number | null }[]
		>`
			SELECT type, qualifiers_per_group
			FROM phase
			WHERE id = ${phaseId}
		`
		if (phaseRows.length === 0) return
		const { type: phaseType, qualifiers_per_group } = phaseRows[0]

		// 3. Seed next phase based on phase type
		if (phaseType === "round_robin" || phaseType === "double_loss_groups") {
			const qualifiersPerGroup = qualifiers_per_group ?? 1
			const qualifiedTeams = await matchRepo.getPhaseQualifiers(
				phaseId,
				qualifiersPerGroup,
			)
			if (qualifiedTeams.length > 0) {
				await matchRepo.seedNextPhase(phaseId, qualifiedTeams)
			}
		} else {
			// bracket phases (single_elimination, double_elimination)
			if (winnerTeamId) {
				await matchRepo.seedNextPhase(phaseId, [
					{ teamId: winnerTeamId, groupId: 0 },
				])
			}
		}
	})
}
