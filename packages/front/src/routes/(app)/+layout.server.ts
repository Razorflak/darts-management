import { getUserRoles } from "$lib/server/authz"
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, "/login")
	}
	const roles = await getUserRoles(locals.user.id)
	const hasAdminAccess = roles.some((r) =>
		["adminFederal", "adminLigue", "adminComite", "adminClub"].includes(r.role),
	)
	return {
		user: locals.user,
		session: locals.session,
		hasAdminAccess,
	}
}
