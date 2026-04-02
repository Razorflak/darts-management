import { deleteEvent } from "@darts-management/application"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, "Non authentifié")

	const { event_id } = z
		.object({ event_id: z.string().uuid() })
		.parse(await request.json())

	const roles = await getUserRoles(locals.user.id)

	try {
		await deleteEvent(event_id, locals.user.id, roles)
		return json({ ok: true })
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "NotFound") return error(404, "Événement introuvable")
			if (err.message === "Forbidden") return error(403, "Accès refusé")
		}
		throw err
	}
}
