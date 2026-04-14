import { submitMatchResult } from "@darts-management/application"
import { error, json } from "@sveltejs/kit"
import { getUserRoles } from "$lib/server/authz"
import { SubmitMatchResultRequestSchema } from "$lib/server/schemas/request-schemas.js"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, "Non authentifié")

	const body = await request.json()
	const parsed = SubmitMatchResultRequestSchema.safeParse(body)
	if (!parsed.success)
		return json({ error: parsed.error.message }, { status: 400 })

	const { match_id, score_a, score_b, walkover } = parsed.data
	const payload =
		walkover !== undefined
			? { walkover }
			// biome-ignore lint/style/noNonNullAssertion: score_a/score_b are required when walkover is absent (validated by Zod schema)
			: { score_a: score_a!, score_b: score_b! }

	const roles = await getUserRoles(locals.user.id)

	try {
		await submitMatchResult(match_id, payload, roles)
		return json({ ok: true })
	} catch (err) {
		const msg = err instanceof Error ? err.message : ""
		if (msg === "Forbidden") return error(403, "Accès refusé")
		if (msg === "NotFound") return error(404, "Match introuvable")
		if (msg === "MatchAlreadyDone")
			return json({ error: "Ce match a déjà un résultat" }, { status: 409 })
		if (msg.startsWith("ScoreInvalid:"))
			return json({ error: msg }, { status: 422 })
		throw err
	}
}
