import type { EntityRole } from "@darts-management/db"
import { eventRepository } from "@darts-management/db"
import { ADMIN_ROLES } from "./constants.js"

export async function deleteEvent(
	eventId: string,
	userId: string,
	userRoles: Array<{ entityId: string; role: EntityRole }>,
): Promise<void> {
	const existing = await eventRepository.findOwner(eventId)
	if (!existing) throw new Error("NotFound")

	const isOrganizer = existing.organizer_id === userId
	if (!isOrganizer) {
		const hasAccess = userRoles.some(
			(r) => r.entityId === existing.entity_id && ADMIN_ROLES.includes(r.role),
		)
		if (!hasAccess) throw new Error("Forbidden")
	}

	await eventRepository.deleteById(eventId)
}
