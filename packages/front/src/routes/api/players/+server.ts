import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { formatPlayerInfo } from "$lib/player/format"
import { sql } from "$lib/server/db.js"
import type { RequestHandler } from "./$types"

const CreatePlayerSchema = z.object({
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	department: z.string(),
})
export type CreatePlayerRequest = z.infer<typeof CreatePlayerSchema>

/** "jean-pierre" → "Jean-Pierre", "marie anne" → "Marie Anne" */

export const isNewPlayerAlreadyExist = async (player: CreatePlayerRequest) => {
	const existingPlayer = await sql<Record<string, unknown>[]>`
    SELECT id FROM player
    WHERE LOWER(first_name) = ${player.first_name.toLowerCase()}
    AND LOWER(last_name) = ${player.last_name.toLowerCase()}
    AND LOWER(department) = ${player.department.toLowerCase()}
    LIMIT 1
`
	return existingPlayer.length > 0
}

export const createNewPlayer = async (
	player: CreatePlayerRequest,
): Promise<string> => {
	const [newPlayer] = await sql<Record<string, unknown>[]>`
    INSERT INTO player (first_name, last_name, department)
    VALUES (
        ${player.first_name},
        ${player.last_name},
        ${player.department}
    )
    RETURNING id
`
	return newPlayer.id as string
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.player) error(401, "Non authentifié")

	const raw = CreatePlayerSchema.parse(await request.json())

	const { first_name, last_name, department } = formatPlayerInfo(raw)

	// Duplicate check (case-insensitive)
	const existing = await isNewPlayerAlreadyExist({
		first_name,
		last_name,
		department,
	})
	if (existing) {
		error(
			409,
			"Un joueur avec ce nom existe déjà. Vérifiez la liste des joueurs existants.",
		)
	}

	const newIdPlayer = createNewPlayer({
		first_name,
		last_name,
		department,
	})

	return json({ id: newIdPlayer }, { status: 201 })
}
