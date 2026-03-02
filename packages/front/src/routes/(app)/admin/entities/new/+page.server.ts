import { getUserRoles } from "$lib/server/authz"
import { sql } from "$lib/server/db"
import { error, fail, redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { z } from "zod"
import { EntityRowSchema, type EntityRow } from "$lib/server/schemas/entity-schemas.js"

const PARENT_TYPE: Record<string, string | null> = {
  federation: null,
  ligue: "federation",
  comite: "ligue",
  club: "comite",
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401, "Non authentifié")

  const userRoles = await getUserRoles(locals.user.id)
  const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
  if (!isAdminFederal) error(403, "Accès réservé aux administrateurs fédéraux.")

  // Load all entities — client filters by type for the parent selector
  const rawEntities = await sql<Record<string, unknown>[]>`
    SELECT id, name, type FROM entity ORDER BY type, name
  `

  const allEntities: EntityRow[] = z.array(EntityRowSchema).parse(rawEntities)

  return { allEntities }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) error(401, "Non authentifié")

    const userRoles = await getUserRoles(locals.user.id)
    const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
    if (!isAdminFederal) error(403, "Accès refusé")

    const data = await request.formData()
    const name = String(data.get("name") ?? "").trim()
    const type = String(data.get("type") ?? "")
    const parentId = String(data.get("parent_id") ?? "").trim() || null

    const validTypes = ["federation", "ligue", "comite", "club"]
    if (!name) return fail(400, { error: "Le nom est requis.", name, type, parent_id: parentId })
    if (!validTypes.includes(type)) return fail(400, { error: "Type invalide.", name, type, parent_id: parentId })

    // Validate parent requirement
    const requiredParentType = PARENT_TYPE[type]
    if (requiredParentType !== null && !parentId) {
      return fail(400, {
        error: `Un parent de type "${requiredParentType}" est requis pour créer une ${type}.`,
        name,
        type,
        parent_id: parentId,
      })
    }
    if (requiredParentType === null && parentId) {
      return fail(400, {
        error: "Une fédération ne peut pas avoir de parent.",
        name,
        type,
        parent_id: parentId,
      })
    }

    try {
      await sql`
        INSERT INTO entity (name, type, parent_id)
        VALUES (${name}, ${type as "federation" | "ligue" | "comite" | "club"}, ${parentId})
      `
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création."
      return fail(500, { error: message, name, type, parent_id: parentId })
    }

    redirect(302, "/admin")
  },
}
