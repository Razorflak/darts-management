import { cancelLaunch } from "@darts-management/application"
import { errors, getJsonStringError } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { getUserRoles } from "$lib/server/authz"
import type { RequestHandler } from "./$types"

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))

	const body = await request.json()
	const { tournament_id } = body
	if (!tournament_id)
		return error(
			400,
			getJsonStringError(errors.ERR_0002, "tournament_id requis"),
		)

	const roles = await getUserRoles(locals.user.id)

	try {
		await cancelLaunch(tournament_id, roles)
		return json({ ok: true })
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Erreur inconnue"
		if (msg === "Forbidden")
			return error(403, getJsonStringError(errors.ERR_0006))
		return json({ error: "L'annulation a echoue." }, { status: 500 })
	}
}
