import { matchRepository } from "@darts-management/db"
import { error, json } from "@sveltejs/kit"
import { MatchLookupRequestSchema } from "$lib/server/schemas/request-schemas.js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return error(401, "Non authentifié")

	const params = MatchLookupRequestSchema.safeParse({
		event_id: url.searchParams.get("event_id"),
		event_match_id: url.searchParams.get("event_match_id"),
	})
	if (!params.success)
		return json({ error: params.error.message }, { status: 400 })

	const match = await matchRepository.lookupMatchByEventMatchId(
		params.data.event_id,
		params.data.event_match_id,
	)
	if (!match) return error(404, "Match introuvable")

	return json(match)
}
