import { z } from "zod"

// ------------------------------------------------------------------
// authz.ts checkRole query: SELECT COUNT(*) as count FROM user_entity_role
// ------------------------------------------------------------------
export const CheckRoleRowSchema = z.object({
	count: z.string(), // PostgreSQL COUNT returns text
})
export type CheckRoleRow = z.infer<typeof CheckRoleRowSchema>

// ------------------------------------------------------------------
// authz.ts getUserRoles query: SELECT entity_id, role FROM user_entity_role
// ------------------------------------------------------------------
const EntityRoleSchema = z.enum([
	"organisateur",
	"adminTournoi",
	"adminClub",
	"adminComite",
	"adminLigue",
	"adminFederal",
])
export const UserRoleRowSchema = z.object({
	entity_id: z.string(),
	role: EntityRoleSchema,
})
export type UserRoleRow = z.infer<typeof UserRoleRowSchema>
