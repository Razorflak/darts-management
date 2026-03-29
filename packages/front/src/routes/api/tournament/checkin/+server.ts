import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

const CheckinRequestSchema = z.object({
	registration_id: z.string().uuid(),
	tournament_id: z.string().uuid(),
	checked_in: z.boolean(),
})

export const POST: RequestHandler = async ({ request, locals, params }) => {
	//TODO: Mw de gestion des droits et des roles
	// const [tRow] = await sql<Record<string, unknown>[]>`
	// 	SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
	// 	WHERE t.id = ${params.tid} AND e.id = ${params.id}
	// `
	// if (!tRow) error(404, "Tournoi introuvable")
	// const roles = await getUserRoles(locals.user!.id)
	// const hasAccess = roles.some(
	// 	(r) =>
	// 		r.entityId === (tRow.entity_id as string) &&
	// 		["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(
	// 			r.role
	// 		)
	// )
	// if (!hasAccess) error(403, "Accès refusé")

	const body = await request.json()
	const { data, error: parseError } = CheckinRequestSchema.safeParse(body)

	if (parseError) {
		return error(400, "Requête invalide: " + parseError.message)
	}

	await sql`
		UPDATE tournament_registration
		SET checked_in = ${data.checked_in}
		WHERE id = ${data.registration_id} 
	`
	return json({ ok: true })
}
