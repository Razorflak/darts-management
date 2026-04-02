import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { formatPlayerInfo } from "@darts-management/domain"
import { playerRepository } from "@darts-management/db"
import type { RequestHandler } from "./$types"

const CreatePlayerSchema = z.object({
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	department: z.string(),
})

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.player) error(401, "Non authentifié")

	const raw = CreatePlayerSchema.parse(await request.json())
	const formatted = formatPlayerInfo(raw)

	if (await playerRepository.exists(formatted)) {
		error(
			409,
			"Un joueur avec ce nom existe déjà. Vérifiez la liste des joueurs existants.",
		)
	}

	const id = await playerRepository.create(formatted)
	return json({ id }, { status: 201 })
}
