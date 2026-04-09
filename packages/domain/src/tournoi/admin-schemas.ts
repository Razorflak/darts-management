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
	is_seeded: z.boolean(),
})
export type AdminTournament = z.infer<typeof AdminTournamentSchema>

// Match display row for post-launch tables (joined with team names)
export const MatchDisplaySchema = z.object({
	id: z.uuid(),
	event_match_id: z.number().int(),
	group_number: z.number().int().nullable(),
	round_number: z.number().int(),
	position: z.number().int(),
	team_a_id: z.string().nullable(),
	team_b_id: z.string().nullable(),
	team_a_name: z.string().nullable(),
	team_b_name: z.string().nullable(),
	referee_name: z.string().nullable(),
	status: z.string(),
	score_a: z.number().int().nullable(),
	score_b: z.number().int().nullable(),
	sets_to_win: z.number().int(),
	legs_per_set: z.number().int(),
	phase_id: z.uuid(),
	phase_type: z.string(),
	phase_position: z.number().int(),
	bracket: z.enum(["W", "L", "GF"]).nullable(),
	loser_goes_to_event_match_id: z.number().int().nullable(),
})
export type MatchDisplay = z.infer<typeof MatchDisplaySchema>

// Launch preview: phase structure summary for /launch page
export const LaunchPhasePreviewSchema = z.object({
	id: z.uuid(),
	position: z.number().int(),
	type: z.string(),
	players_per_group: z.number().int().nullable(),
	qualifiers_per_group: z.number().int().nullable(),
	qualifiers_count: z.number().int().nullable(),
	sets_to_win: z.number().int(),
	legs_per_set: z.number().int(),
})
export type LaunchPhasePreview = z.infer<typeof LaunchPhasePreviewSchema>

// One competition day entry on /admin/events/[id], derived from tournament.start_at
export const CheckinDaySchema = z.object({
	date: z.string(), // 'YYYY-MM-DD' (start_at::date::text)
	tournament_ids: z.array(z.uuid()),
	tournament_names: z.array(z.string()),
	any_ready: z.boolean(), // true if at least one tournament of the day is still 'ready'
	any_checkin: z.boolean(), // true if at least one tournament of the day is in 'check-in'
})
export type CheckinDay = z.infer<typeof CheckinDaySchema>
