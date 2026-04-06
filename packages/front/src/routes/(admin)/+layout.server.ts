import { redirect } from "@sveltejs/kit"
import { getUserRoles } from "$lib/server/authz"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, "/login")
	}
	const roles = await getUserRoles(locals.user.id)
	const hasAdminAccess = roles.some((r) =>
		["adminFederal", "adminLigue", "adminComite", "adminClub"].includes(r.role),
	)
	if (!hasAdminAccess) {
		redirect(302, "/")
	}
	return { user: locals.user, session: locals.session }
}
