import { fail, redirect } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { UpdateProfileSchema } from "$lib/server/schemas/event-schemas.js"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, "/login")
	if (!locals.player) redirect(302, "/profile/create")
	if (locals.player.licence_no) redirect(302, "/profile") // licence = read-only
	return { player: locals.player }
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(302, "/login")
		if (!locals.player) redirect(302, "/profile/create")
		if (locals.player.licence_no) redirect(302, "/profile") // bypass guard

		const data = await request.formData()
		const raw = {
			first_name: String(data.get("first_name") ?? "").trim(),
			last_name: String(data.get("last_name") ?? "").trim(),
			department: String(data.get("department") ?? "").trim(),
			birth_date: String(data.get("birth_date") ?? "").trim() || null,
		}

		const result = UpdateProfileSchema.safeParse(raw)
		if (!result.success) {
			return fail(400, { error: result.error.issues[0].message, values: raw })
		}
		const { first_name, last_name, department, birth_date } = result.data

		await sql`
			UPDATE player
			SET first_name = ${first_name},
			    last_name = ${last_name},
			    department = ${department},
			    birth_date = ${birth_date ?? null}
			WHERE id = ${locals.player.id}
		`

		redirect(303, "/profile")
	},
}
