import {
	getLaunchRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"

type Sql = typeof sql

export async function cancelLaunch(
	tournamentId: string,
	userRoles: Array<{ entityId: string; role: string }>,
): Promise<void> {
	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const launchRepo = getLaunchRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		// Load tournament to check authz — entity_id is returned from joined event table
		const tournament = await launchRepo.loadTournamentForLaunch(tournamentId)

		// Cancel requires adminComite or higher
		const hasAccess = userRoles.some(
			(r) =>
				r.entityId === tournament.entity_id &&
				["adminComite", "adminLigue", "adminFederal"].includes(r.role),
		)
		if (!hasAccess) throw new Error("Forbidden")

		// Delete all matches for this tournament
		await launchRepo.deleteMatchesByTournament(tournamentId)

		// Revert status to 'check-in' (preserves registrations per CONTEXT.md)
		await tournamentRepo.updateStatus(tournamentId, "check-in")
	})
}
