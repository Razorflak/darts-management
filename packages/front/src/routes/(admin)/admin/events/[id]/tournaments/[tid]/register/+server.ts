import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import { findOrCreateSoloTeam } from "$lib/server/teams.js"
import type { RequestHandler } from "./$types"

const AdminRegisterSchema = z.discriminatedUnion("mode", [
	z.object({ mode: z.literal("existing"), player_id: z.string().uuid() }),
	z.object({
		mode: z.literal("new"),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		licence_no: z.string().optional(),
		department: z.string().optional()
	})
])

export const POST: RequestHandler = async ({ request, locals, params }) => {
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

	const body = AdminRegisterSchema.parse(await request.json())
	let playerId: string

	if (body.mode === "existing") {
		playerId = body.player_id
	} else {
		const [newPlayer] = await sql<Record<string, unknown>[]>`
			INSERT INTO player (first_name, last_name, birth_date, licence_no, department)
			VALUES (
				${body.first_name},
				${body.last_name},
				${body.birth_date},
				${body.licence_no ?? null},
				${body.department ?? null}
			)
			RETURNING id
		`
		playerId = newPlayer.id as string
	}

	const teamId = await findOrCreateSoloTeam(playerId)

	try {
		await sql`
			INSERT INTO tournament_registration (tournament_id, team_id)
			VALUES (${params.tid}, ${teamId})
		`
	} catch (err) {
		const pgErr = err as { code?: string }
		if (pgErr.code === "23505") error(409, "Équipe déjà inscrite")
		throw err
	}

	return json({ ok: true })
}
