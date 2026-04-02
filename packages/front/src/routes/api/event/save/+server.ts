import { saveDraftEvent } from "@darts-management/application"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { getUserRoles } from "$lib/server/authz"
import { DraftEventSchema } from "$lib/server/schemas/event-schemas.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))
	const body = await request.json()
	const parsed = DraftEventSchema.safeParse(body)
	if (!parsed.success)
		return json(getJsonStringError(errors.ERR_0002, parsed.error.message), {
			status: 400,
		})
	const event = parsed.data
	const roles = await getUserRoles(locals.user.id)
	try {
		await saveDraftEvent(event, locals.user.id, roles)
		return json({ ok: true, eventId: event.id })
	} catch (err) {
		if (err instanceof Error && err.message === "Forbidden")
			return error(403, getJsonStringError(errors.ERR_0006))
		const message = err instanceof Error ? err.message : undefined
		return error(500, getJsonStringError(errors.ERR_0001, message))
	}
}
