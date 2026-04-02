import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import { formatPlayerInfo } from "@darts-management/domain"
import { errors, getJsonStringError } from "$lib/error"
import { playerRepository } from "@darts-management/db"
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
	const body = await request.json()
	const { data, error: parseError } = CreateProfileSchema.safeParse(body)
	if (parseError) {
		return error(400, getJsonStringError(errors.ERR_0002, parseError.message))
	}

	const formatted = formatPlayerInfo(data)
	const result = await playerRepository.linkOrCreate({
		...data,
		...formatted,
		licence_no: formatted.licence_no ?? null,
	})

	if ("conflict" in result) {
		const code = result.conflict === "licence" ? errors.ERR_0004 : errors.ERR_0003
		return error(409, getJsonStringError(code))
	}

	return json({ success: true, ...result })
}
