import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { sql } from "$lib/server/db.js"
import type { RequestHandler } from "./$types"

const CreatePlayerSchema = z.object({
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	department: z.string().optional(),
	birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

/** "jean-pierre" → "Jean-Pierre", "marie anne" → "Marie Anne" */
function toPascalCase(str: string): string {
	return str
		.trim()
		.split(" ")
		.filter(Boolean)
		.map((word) =>
			word
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
				.join("-")
		)
		.join(" ")
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.player) error(401, "Non authentifié")

	const raw = CreatePlayerSchema.parse(await request.json())

	const firstName = toPascalCase(raw.first_name)
	const lastName = raw.last_name.trim().toUpperCase()
	const department = raw.department?.trim() || null
	const birthDate = raw.birth_date ?? null

	// Duplicate check (case-insensitive)
	const [existing] = await sql<Record<string, unknown>[]>`
		SELECT id FROM player
		WHERE LOWER(first_name) = LOWER(${firstName})
		  AND LOWER(last_name)  = LOWER(${lastName})
		LIMIT 1
	`

	if (existing) {
		error(409, "Un joueur avec ce nom existe déjà. Vérifiez la liste des joueurs existants.")
	}

	const [created] = await sql<Record<string, unknown>[]>`
		INSERT INTO player (first_name, last_name, birth_date, department)
		VALUES (${firstName}, ${lastName}, ${birthDate}, ${department})
		RETURNING id
	`

	return json({ id: created.id as string }, { status: 201 })
}
