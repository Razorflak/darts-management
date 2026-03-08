import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404)
	const roles = await getUserRoles(locals.user!.id)
	if (
		!roles.some(
			(r) =>
				r.entityId === (tRow.entity_id as string) &&
				["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(r.role)
		)
	)
		error(403)

	const { team_id } = z.object({ team_id: z.string().uuid() }).parse(await request.json())
	await sql`
		DELETE FROM tournament_registration
		WHERE tournament_id = ${params.tid} AND team_id = ${team_id}
	`
	return json({ ok: true })
}
