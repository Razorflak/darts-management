import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, `/login?redirectTo=/events/${params.id}`)
	}
	return {}
}
