import { json, error } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import { findOrCreateSoloTeam, findOrCreateDoublesTeam } from "$lib/server/teams.js"
import type { RequestHandler } from "./$types"

const PlayerSlotSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("existing"), id: z.string().uuid() }),
	z.object({
		type: z.literal("new"),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		licence_no: z.string().optional(),
		department: z.string().optional()
	})
])

const AdminRegisterSchema = z.discriminatedUnion("mode", [
	z.object({ mode: z.literal("existing"), player_id: z.string().uuid() }),
	z.object({
		mode: z.literal("new"),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		licence_no: z.string().optional(),
		department: z.string().optional()
	}),
	z.object({
		mode: z.literal("doubles"),
		player1: PlayerSlotSchema,
		player2: PlayerSlotSchema
	})
])

async function resolvePlayerId(
	slot: z.infer<typeof PlayerSlotSchema>
): Promise<string> {
	if (slot.type === "existing") return slot.id

	const [newPlayer] = await sql<Record<string, unknown>[]>`
		INSERT INTO player (first_name, last_name, birth_date, licence_no, department)
		VALUES (
			${slot.first_name},
			${slot.last_name},
			${slot.birth_date},
			${slot.licence_no ?? null},
			${slot.department ?? null}
		)
		RETURNING id
	`
	return newPlayer.id as string
}

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
	let teamId: string

	if (body.mode === "existing") {
		const playerId = body.player_id
		teamId = await findOrCreateSoloTeam(playerId)
	} else if (body.mode === "new") {
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
		teamId = await findOrCreateSoloTeam(newPlayer.id as string)
	} else {
		// mode === "doubles"
		const player1Id = await resolvePlayerId(body.player1)
		const player2Id = await resolvePlayerId(body.player2)
		teamId = await findOrCreateDoublesTeam(player1Id, player2Id)
	}

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
