import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

const CheckinSchema = z.object({
	registration_id: z.string().uuid(),
	checked_in: z.boolean()
})

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) error(401, "Non authentifié")

	const tournamentRows = await sql<Record<string, unknown>[]>`
		SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.id}
	`
	if (tournamentRows.length === 0) error(404, "Tournoi introuvable")
	const entityId = tournamentRows[0].entity_id as string
	const roles = await getUserRoles(locals.user.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === entityId &&
			["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(r.role)
	)
	if (!hasAccess) error(403, "Accès refusé")

	const body = CheckinSchema.parse(await request.json())

	await sql`
		UPDATE tournament_registration
		SET checked_in = ${body.checked_in}
		WHERE id = ${body.registration_id} AND tournament_id = ${params.id}
	`

	return json({ ok: true })
}
