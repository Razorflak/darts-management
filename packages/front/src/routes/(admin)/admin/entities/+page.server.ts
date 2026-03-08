import { error } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { PageServerLoad } from "./$types"
import { z } from "zod"
import { EntityRowSchema, type EntityRow } from "$lib/server/schemas/entity-schemas.js"

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
