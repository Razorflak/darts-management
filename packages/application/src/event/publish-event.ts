import type { EntityRole } from "@darts-management/db"
import {
	getEventRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import type { Event } from "@darts-management/domain"
import { ORGANISABLE_ROLES } from "./constants.js"

type Sql = typeof sql

export async function publishEvent(
	event: Omit<Event, "status">,
	userId: string,
	userRoles: Array<{ entityId: string; role: EntityRole }>,
): Promise<void> {
	const hasRole = userRoles.some(
		(r) => r.entityId === event.entity.id && ORGANISABLE_ROLES.includes(r.role),
	)
	if (!hasRole) throw new Error("Forbidden")

	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const eventRepo = getEventRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		const existing = await eventRepo.findOwner(event.id)
		if (existing && existing.organizer_id !== userId)
			throw new Error("Forbidden")

		// Status transition : draft → ready, sinon on conserve le statut existant
		const newStatus =
			!existing || existing.status === "draft" ? "ready" : existing.status

		await eventRepo.save(
			{
				id: event.id,
				name: event.name,
				entity_id: event.entity.id,
				starts_at: event.starts_at,
				ends_at: event.ends_at,
				location: event.location,
				registration_opens_at: event.registration_opens_at,
				status: newStatus,
			},
			userId,
		)

		await tournamentRepo.upsertTournaments(event.id, event.tournaments)
	})
}
