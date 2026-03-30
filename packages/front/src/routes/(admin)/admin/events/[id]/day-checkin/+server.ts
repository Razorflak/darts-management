import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, "Non authentifié")

	// Verify admin access to this event's entity
	const [eventRow] = await sql<Record<string, unknown>[]>`
		SELECT e.entity_id, e.organizer_id FROM event e WHERE e.id = ${params.id}
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

	const { date } = z
		.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
		.parse(await request.json())

	// Transition all 'ready' tournaments of this day to 'check-in'
	// Tournaments already in 'check-in' are untouched (WHERE status = 'ready')
	await sql`
		UPDATE tournament
		SET status = 'check-in'
		WHERE event_id = ${params.id}
			AND start_at::date::text = ${date}
			AND status = 'ready'
	`

	return json({ redirect: `/admin/events/${params.id}/checkin?date=${date}` })
}
