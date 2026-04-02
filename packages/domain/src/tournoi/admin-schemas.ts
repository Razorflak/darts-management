import { z } from "zod"
import { CategorySchema } from "./tournament-schemas.js"

// Used by admin event detail page load
export const AdminEventDetailSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	status: z.enum(["draft", "ready", "started", "finished"]),
	starts_at: z.coerce.date(),
	ends_at: z.coerce.date(),
	location: z.string(),
	entity_name: z.string(),
	entity_id: z.uuid(),
	organizer_id: z.string().nullable(),
})
export type AdminEventDetail = z.infer<typeof AdminEventDetailSchema>

// Used by admin roster page load
export const AdminTournamentSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	check_in_required: z.boolean(),
	event_id: z.uuid(),
	event_name: z.string(),
	status: z.enum(["ready", "check-in", "started", "finished"]),
	entity_id: z.uuid(),
})
export type AdminTournament = z.infer<typeof AdminTournamentSchema>

// One competition day entry on /admin/events/[id], derived from tournament.start_at
export const CheckinDaySchema = z.object({
	date: z.string(), // 'YYYY-MM-DD' (start_at::date::text)
	tournament_ids: z.array(z.uuid()),
	tournament_names: z.array(z.string()),
	any_ready: z.boolean(), // true if at least one tournament of the day is still 'ready'
	any_checkin: z.boolean(), // true if at least one tournament of the day is in 'check-in'
})
export type CheckinDay = z.infer<typeof CheckinDaySchema>
