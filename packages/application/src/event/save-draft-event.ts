import type { EntityRole } from "@darts-management/db"
import {
	getEventRepositoryWithSql,
	getTournamentRepositoryWithSql,
	sql,
} from "@darts-management/db"
import type { DraftEvent } from "@darts-management/domain"
import { ORGANISABLE_ROLES } from "./constants.js"

type Sql = typeof sql

export async function saveDraftEvent(
	event: DraftEvent,
	userId: string,
	userRoles: Array<{ entityId: string; role: EntityRole }>,
): Promise<void> {
	if (event.entity) {
		const hasRole = userRoles.some(
			(r) =>
				r.entityId === event.entity?.id && ORGANISABLE_ROLES.includes(r.role),
		)
		if (!hasRole) throw new Error("Forbidden")
	}

	await sql.begin(async (rawTx) => {
		const tx = rawTx as unknown as Sql
		const eventRepo = getEventRepositoryWithSql(tx)
		const tournamentRepo = getTournamentRepositoryWithSql(tx)

		const existing = await eventRepo.findOwner(event.id)
		if (existing && existing.organizer_id !== userId)
			throw new Error("Forbidden")

		await eventRepo.save(
			{
				id: event.id,
				name: event.name ?? "",
				entity_id: event.entity?.id ?? "",
				starts_at: event.starts_at ?? null,
				ends_at: event.ends_at ?? null,
				location: event.location ?? "",
				registration_opens_at: event.registration_opens_at ?? null,
				status: "draft",
			},
			userId,
		)

		await tournamentRepo.upsertTournamentsBatch(event.id, event.tournaments)
	})
}
