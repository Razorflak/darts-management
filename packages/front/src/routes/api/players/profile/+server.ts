import { playerRepository } from "@darts-management/db"
import {
	errors,
	formatPlayerInfo,
	getJsonStringError,
} from "@darts-management/domain"
import { error, json } from "@sveltejs/kit"
import { z } from "zod"
import type { RequestHandler } from "./$types"

const UpdateProfileRequestSchema = z.object({
	first_name: z.string().min(1, "Le prénom est requis"),
	last_name: z.string().min(1, "Le nom est requis"),
	department: z.string().min(1, "Le département est requis"),
	birth_date: z.coerce.date().nullable(),
})

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return error(401, getJsonStringError(errors.ERR_0005))
	if (!locals.player) return error(404, getJsonStringError(errors.ERR_0007))

	const body = await request.json()
	const { data, error: parseError } = UpdateProfileRequestSchema.safeParse(body)
	if (parseError) {
		return error(
			400,
			getJsonStringError(errors.ERR_0002, parseError.issues[0].message),
		)
	}

	const formatted = formatPlayerInfo(data)
	await playerRepository.updateProfile(locals.player.id, {
		...data,
		...formatted,
	})

	return json({ success: true })
}
