import { z } from "zod"

const EntityTypeSchema = z.enum(["federation", "ligue", "comite", "club"])

// ------------------------------------------------------------------
// Simple entity row (admin/entities/new/+page.server.ts)
// ------------------------------------------------------------------
export const EntityRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: EntityTypeSchema,
})
export type EntityRow = z.infer<typeof EntityRowSchema>

// ------------------------------------------------------------------
// Entity with parent (admin/+page.server.ts)
// ------------------------------------------------------------------
export const EntityWithParentSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: EntityTypeSchema,
	parent_id: z.string().nullable(),
	parent_name: z.string().nullable(),
})
export type EntityWithParent = z.infer<typeof EntityWithParentSchema>
