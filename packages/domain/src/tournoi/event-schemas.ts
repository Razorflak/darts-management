import { z } from "zod"
import { EntitySchema } from "../organisation/schemas.js"
import {
	DraftTournamentSchema,
	TournamentSchema,
} from "./tournament-schemas.js"

export const EventSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	status: z.enum(["ready", "started", "finished"]),
	starts_at: z.coerce.date(),
	ends_at: z.coerce.date(),
	location: z.string(),
	registration_opens_at: z.coerce.date(),
	entity: EntitySchema,
	tournaments: z.array(TournamentSchema).min(1),
})
export type Event = z.infer<typeof EventSchema>

export const DraftEventSchema = EventSchema.partial().extend({
	id: EventSchema.shape.id,
	status: z.enum(["draft"]),
	entity: EntitySchema.nullish(),
	tournaments: z.array(DraftTournamentSchema),
})
export type DraftEvent = z.infer<typeof DraftEventSchema>

export const EventListItemSchema = EventSchema.omit({
	entity: true,
	tournaments: true,
	status: true,
}).extend({
	status: z.enum(["draft", "ready", "started", "finished"]),
	entity_name: z.string(),
	tournament_count: z.number(),
})
export type EventListItem = z.infer<typeof EventListItemSchema>
