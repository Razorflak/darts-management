import { json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

const TournamentUnregisterRequestSchema = z.object({
	registration_id: z.uuid(),
})

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	//TODO: Mw de gestion des droits et des roles

	/* const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404)
	const roles = await getUserRoles(locals.user!.id)
	if (
		!roles.some(
			(r) =>
				r.entityId === (tRow.entity_id as string) &&
				["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(
					r.role
				)
		)
	)
		error(403) */

	const body = await request.json()
	const { data, error } = TournamentUnregisterRequestSchema.safeParse(body)

	if (error) {
		return json({ ok: false, error: error.message }, { status: 400 })
	}
	const { registration_id } = data

	await sql`
		DELETE FROM tournament_registration
		WHERE id = ${registration_id}
	`
	return json({ ok: true })
}
