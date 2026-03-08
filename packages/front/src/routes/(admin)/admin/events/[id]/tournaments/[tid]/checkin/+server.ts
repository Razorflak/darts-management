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
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404, "Tournoi introuvable")
	const roles = await getUserRoles(locals.user!.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === (tRow.entity_id as string) &&
			["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(r.role)
	)
	if (!hasAccess) error(403, "Accès refusé")

	const body = CheckinSchema.parse(await request.json())
	await sql`
		UPDATE tournament_registration
		SET checked_in = ${body.checked_in}
		WHERE id = ${body.registration_id} AND tournament_id = ${params.tid}
	`
	return json({ ok: true })
}
