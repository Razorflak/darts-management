import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, "/login")
	if (!locals.player) redirect(302, "/profile/create")
	if (locals.player.licence_no) redirect(302, "/profile") // licence = read-only
	return { player: locals.player }
}
