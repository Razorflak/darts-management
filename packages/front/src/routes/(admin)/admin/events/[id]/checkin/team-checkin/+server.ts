import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, "Non authentifié")

	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT entity_id, organizer_id FROM event WHERE id = ${params.id}
	`
	if (!eventRow) error(404, "Événement introuvable")

	const roles = await getUserRoles(locals.user.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === (eventRow.entity_id as string) &&
			[
				"adminTournoi",
				"adminClub",
				"adminComite",
				"adminLigue",
				"adminFederal",
				"organisateur",
			].includes(r.role),
	)
	const isOrganizer =
		(eventRow.organizer_id as string | null) === locals.user.id
	if (!hasAccess && !isOrganizer) error(403, "Accès refusé")

	const { registration_ids, checked_in } = z
		.object({
			registration_ids: z.array(z.uuid()).min(1),
			checked_in: z.boolean(),
		})
		.parse(await request.json())

	// Update checked_in on the specified tournament_registration rows
	// Only affects registrations belonging to check-in tournaments of this event
	await sql`
		UPDATE tournament_registration
		SET checked_in = ${checked_in}
		WHERE id = ANY(${registration_ids}::uuid[])
			AND tournament_id IN (
				SELECT id FROM tournament
				WHERE event_id = ${params.id}
					AND status = 'check-in'
			)
	`

	return json({ ok: true })
}
