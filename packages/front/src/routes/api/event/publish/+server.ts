import { publishEvent } from "@darts-management/application"
import { error, json } from "@sveltejs/kit"
import { errors, getJsonStringError } from "$lib/error"
import { getUserRoles } from "$lib/server/authz"
import { EventSchema } from "$lib/server/schemas/event-schemas.js"
import type { RequestHandler } from "./$types"

const PublishPayloadSchema = EventSchema.omit({ status: true })

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, "Non authentifié")
	const body = await request.json()
	const parsed = PublishPayloadSchema.safeParse(body)
	if (!parsed.success)
		return json(getJsonStringError(errors.ERR_0002, parsed.error.message), { status: 400 })
	const event = parsed.data
	const roles = await getUserRoles(locals.user.id)
	try {
		await publishEvent(event, locals.user.id, roles)
		return json({ ok: true, eventId: event.id })
	} catch (err) {
		if (err instanceof Error && err.message === "Forbidden")
			return json({ error: "Accès refusé." }, { status: 403 })
		const message = err instanceof Error ? err.message : "Erreur base de données."
		return json({ error: message }, { status: 500 })
	}
}
