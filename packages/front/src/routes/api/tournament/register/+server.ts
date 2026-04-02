import { getOrCreatePlayer, registerTeam } from "@darts-management/application"
import { MinimalPlayerSchema, PlayerSchema } from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { errors, getJsonStringError } from "$lib/error"
import type { RequestHandler } from "./$types"

const RegistrationRequestSchema = z.object({
	tournament_id: z.uuid(),
	team: z
		.array(z.union([PlayerSchema.pick({ id: true }), MinimalPlayerSchema]))
		.min(1)
		.max(2),
})

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json()
	const { data, error: parseError } = RegistrationRequestSchema.safeParse(body)

	if (parseError) {
		return error(400, getJsonStringError(errors.ERR_0002, parseError.message))
	}

	const { tournament_id, team } = data

	const playerIds = await Promise.all(
		team.map(async (player) => getOrCreatePlayer(player)),
	)

	try {
		const registrationId = await registerTeam(tournament_id, playerIds)
		return json({ ok: true, registration_id: registrationId })
	} catch (err) {
		if (err instanceof Error) {
			if (err.message.startsWith("AlreadyRegistered:")) {
				const name = err.message.slice("AlreadyRegistered:".length)
				error(409, `Le joueur ${name} est déjà inscrit à ce tournoi`)
			}
			if (err.message === "TeamAlreadyRegistered")
				error(409, "Équipe déjà inscrite")
		}
		throw err
	}
}
