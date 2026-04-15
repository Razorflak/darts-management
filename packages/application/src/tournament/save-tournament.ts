import {
	getEventRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import type { DraftTournament } from "@darts-management/domain"

type Sql = typeof sql

export async function saveTournament(
	tournament: DraftTournament,
	eventId: string,
	userId: string,
): Promise<void> {
	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const eventRepo = getEventRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		const existing = await eventRepo.findOwner(eventId)
		if (!existing || existing.organizer_id !== userId)
			throw new Error("Forbidden")

		await tournamentRepo.upsertSingleTournament(eventId, tournament)
	})
}
