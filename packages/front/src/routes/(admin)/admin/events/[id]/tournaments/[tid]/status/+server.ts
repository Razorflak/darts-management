import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

const TournamentStatusSchema = z.enum(["ready", "check-in", "started", "finished"])

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const [tRow] = await sql<Record<string, unknown>[]>`
		SELECT t.id, t.status, e.entity_id FROM tournament t JOIN event e ON e.id = t.event_id
		WHERE t.id = ${params.tid} AND e.id = ${params.id}
	`
	if (!tRow) error(404, "Tournoi introuvable")
	const roles = await getUserRoles(locals.user!.id)
	if (
		!roles.some(
			(r) =>
				r.entityId === (tRow.entity_id as string) &&
				["adminTournoi", "adminClub", "adminComite", "adminLigue", "adminFederal"].includes(r.role)
		)
	)
		error(403, "Accès refusé")

	const { status } = z.object({ status: TournamentStatusSchema }).parse(await request.json())

	await sql`
		UPDATE tournament SET status = ${status}, updated_at = now()
		WHERE id = ${params.tid}
	`
	return json({ ok: true, status })
}
