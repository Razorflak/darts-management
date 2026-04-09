import { tournamentRepository } from "@darts-management/db"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

const SeedOrderPayload = z.object({
	tournament_id: z.string().uuid(),
	seeds: z.array(
		z.object({
			registration_id: z.string().uuid(),
			seed: z.number().int().positive(),
		}),
	),
})

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))

	const body = await request.json()
	const parsed = SeedOrderPayload.safeParse(body)
	if (!parsed.success)
		return error(400, getJsonStringError(errors.ERR_0002, parsed.error.message))

	const { tournament_id, seeds } = parsed.data

	const [row] = await sql<
		{ entity_id: string; status: string }[]
	>`SELECT e.entity_id, t.status FROM tournament t JOIN event e ON e.id = t.event_id WHERE t.id = ${tournament_id}`
	if (!row) return error(404, "Tournoi introuvable")

	if (row.status === "started" || row.status === "finished")
		return json(
			{ error: "Tournoi déjà lancé, modification impossible." },
			{ status: 409 },
		)

	const roles = await getUserRoles(locals.user.id)
	const hasAccess = roles.some(
		(r) =>
			r.entityId === row.entity_id &&
			[
				"adminTournoi",
				"adminClub",
				"adminComite",
				"adminLigue",
				"adminFederal",
			].includes(r.role),
	)
	if (!hasAccess) return error(403, getJsonStringError(errors.ERR_0006))

	await tournamentRepository.updateSeedOrder(tournament_id, seeds)

	return json({ ok: true })
}
