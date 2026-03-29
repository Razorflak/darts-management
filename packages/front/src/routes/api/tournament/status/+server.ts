import { json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

const TournamentStatusSchema = z.enum([
	"ready",
	"check-in",
	"started",
	"finished",
])
const TournamentStatusUpdateRequestSchema = z.object({
	status: TournamentStatusSchema,
	tournament_id: z.uuid(),
})

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	//TODO: Mw de gestion des droits et des roles

	/* const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.status, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404, "Tournoi introuvable")
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
		error(403, "Accès refusé") */

	const body = await request.json()
	const { data, error } = TournamentStatusUpdateRequestSchema.safeParse(body)

	if (error) {
		return json({ ok: false, error: error.message }, { status: 400 })
	}
	const { status, tournament_id } = data

	await sql`
		UPDATE tournament SET status = ${status}, updated_at = now()
		WHERE id = ${tournament_id}
	`
	return json({ ok: true, status })
}
