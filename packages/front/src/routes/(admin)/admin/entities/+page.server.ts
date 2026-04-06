import { error } from "@sveltejs/kit"
import { z } from "zod"
import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import {
	type EntityRow,
	EntityRowSchema,
} from "$lib/server/schemas/entity-schemas.js"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401, "Non authentifié")

	const userRoles = await getUserRoles(locals.user.id)
	const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
	if (!isAdminFederal) error(403, "Accès réservé aux administrateurs fédéraux.")

	const rawEntities = await sql<Record<string, unknown>[]>`
    SELECT id, name, type FROM entity ORDER BY type, name
  `

	const entities: EntityRow[] = z.array(EntityRowSchema).parse(rawEntities)
	return { entities }
}
