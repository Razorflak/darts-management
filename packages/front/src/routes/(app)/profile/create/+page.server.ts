import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, "/login")
	if (locals.player) redirect(302, "/profile")
	const redirectTo = url.searchParams.get("redirectTo") ?? "/"
	const safeRedirectTo = redirectTo.startsWith("/") ? redirectTo : "/"
	return { redirectTo: safeRedirectTo }
}
