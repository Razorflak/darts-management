import {
	getTeamRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"

type Sql = typeof sql

export async function registerTeam(
	tournamentId: string,
	playerIds: string[],
): Promise<string> {
	return sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const teamRepo = getTeamRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		const duplicate = await tournamentRepo.findRegisteredPlayer(
			tournamentId,
			playerIds,
		)
		if (duplicate) {
			throw new Error(
				`AlreadyRegistered:${duplicate.first_name} ${duplicate.last_name}`,
			)
		}

		const teamId = await teamRepo.findOrCreate(playerIds)
		return await tournamentRepo.register(tournamentId, teamId)
	})
}
