import { z } from "zod"

export const EntitySchema = z.object({
	id: z.uuid(),
	type: z.enum(["federation", "ligue", "comité", "club"]),
	name: z.string(),
})
export type Entity = z.infer<typeof EntitySchema>
