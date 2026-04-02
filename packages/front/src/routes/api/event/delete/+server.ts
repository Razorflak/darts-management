import { deleteEvent } from "@darts-management/application"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))

	const { event_id } = z
		.object({ event_id: z.string().uuid() })
		.parse(await request.json())

	const roles = await getUserRoles(locals.user.id)

	try {
		await deleteEvent(event_id, locals.user.id, roles)
		return json({ ok: true })
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "NotFound")
				return error(404, getJsonStringError(errors.ERR_0007))
			if (err.message === "Forbidden")
				return error(403, getJsonStringError(errors.ERR_0006))
		}
		throw err
	}
}
