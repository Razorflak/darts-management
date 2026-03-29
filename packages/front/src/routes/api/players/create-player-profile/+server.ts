import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { errors, getJsonStringError } from "$lib/error"
import { formatPlayerInfo } from "$lib/player/format"
import { sql } from "$lib/server/db"
import type { RequestHandler } from "./$types"

const CreateProfileSchema = z.object({
	user_id: z.string(),
	first_name: z.string().min(1, "Le prénom est requis"),
	last_name: z.string().min(1, "Le nom est requis"),
	department: z.string().min(1, "Le département est requis"),
	birth_date: z
		.string()
		.trim()
		.nullable()
		.transform((str) => (str ? new Date(str) : null))
		.refine((date) => date === null || !isNaN(date.getTime()), {
			message: "La date de naissance doit être une date valide",
		}),
	licence_no: z.string().trim().nullable(),
})

export const POST: RequestHandler = async ({ request }) => {
	// 1. Validation des données d'entrée
	const body = await request.json()
	const { data, error: parseError } = CreateProfileSchema.safeParse(body)
	if (parseError) {
		return error(400, getJsonStringError(errors.ERR_0002, parseError.message))
	}
	const formattedData = formatPlayerInfo(data)
	const { first_name, last_name, department, birth_date, licence_no, user_id } =
		{ ...data, ...formattedData }

	// 2. Vérifier si un joueur existe déjà avec les mêmes nom/prénom/département
	const existing = await sql`
		SELECT id, user_id, birth_date, licence_no FROM player
		WHERE department = ${department}
		AND first_name = ${first_name}
		AND last_name = ${last_name}
		LIMIT 1
	`

	if (existing.length > 0) {
		const existingPlayer = existing[0]

		// 3. Vérifier si les dates de naissance correspondent
		const birthDatesMatch =
			(!birth_date && !existingPlayer.birth_date) ||
			(birth_date &&
				existingPlayer.birth_date &&
				new Date(birth_date).getTime() ===
					new Date(existingPlayer.birth_date).getTime())

		// 4. Vérifier si les numéros de licence correspondent
		const licenceMatch =
			(!licence_no && !existingPlayer.licence_no) ||
			licence_no === existingPlayer.licence_no

		// 5. CAS 1: Tout correspond → Mise à jour du user_id
		if (birthDatesMatch && licenceMatch) {
			await sql`
				UPDATE player
				SET user_id = ${user_id}
				WHERE id = ${existingPlayer.id}
			`
			return json({ success: true, updated: true })
		}

		// 6. CAS 2: Dates de naissance différentes → Homonymes → Erreur
		if (
			birth_date &&
			existingPlayer.birth_date &&
			new Date(birth_date).getTime() !==
				new Date(existingPlayer.birth_date).getTime()
		) {
			return error(409, getJsonStringError(errors.ERR_0003))
		}

		// 7. CAS 3: Joueur licencié avec informations incohérentes → Erreur spécifique
		if (licence_no || existingPlayer.licence_no) {
			return error(409, getJsonStringError(errors.ERR_0004))
		}

		// 8. CAS 4: Autres informations incohérentes → Erreur générique
		return error(409, getJsonStringError(errors.ERR_0003))
	}

	// 9. Création du nouveau joueur
	await sql`
		INSERT INTO player (user_id, first_name, last_name, department, birth_date, licence_no)
		VALUES (${user_id}, ${first_name}, ${last_name}, ${department},
		        ${birth_date ?? null}, ${licence_no ?? null})
	`

	return json({ success: true, created: true })
}
