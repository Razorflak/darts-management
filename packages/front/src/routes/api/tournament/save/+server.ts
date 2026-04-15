import { saveTournament } from "@darts-management/application"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { SaveTournamentRequestSchema } from "$lib/server/schemas/request-schemas"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))

	const body = await request.json()
	const parsed = SaveTournamentRequestSchema.safeParse(body)
	if (!parsed.success)
		return json(getJsonStringError(errors.ERR_0002, parsed.error.message), {
			status: 400,
		})

	const { event_id, tournament } = parsed.data

	try {
		await saveTournament(tournament, event_id, locals.user.id)
		return json({ ok: true })
	} catch (err) {
		if (err instanceof Error && err.message === "Forbidden")
			return error(403, getJsonStringError(errors.ERR_0006))
		const message = err instanceof Error ? err.message : undefined
		return error(500, getJsonStringError(errors.ERR_0001, message))
	}
}
