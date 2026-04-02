import { z } from "zod"
import { CategorySchema } from "../tournoi/schemas.js"

export const TournamentRegistrationSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	team_id: z.uuid(),
	checked_in: z.boolean(),
	registered_at: z.coerce.date(),
})
export type TournamentRegistration = z.infer<
	typeof TournamentRegistrationSchema
>

// Used by public event page: tournament info + registration state for current visitor
export const TournamentWithRegistrationSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	check_in_required: z.boolean(),
	registration_count: z.number().int(),
	is_registered: z.boolean(), // true if current user's player is registered
})
export type TournamentWithRegistration = z.infer<
	typeof TournamentWithRegistrationSchema
>

// Used by roster views (public + admin)
const RosterMemberSchema = z.object({
	player_id: z.uuid(),
	first_name: z.string(),
	last_name: z.string(),
	department: z.string().nullable(),
})

export const RosterEntrySchema = z.object({
	registration_id: z.uuid(),
	team_id: z.uuid(),
	members: z.preprocess(
		(val) => (typeof val === "string" ? JSON.parse(val) : val),
		z.array(RosterMemberSchema),
	),
	checked_in: z.boolean(),
	registered_at: z.coerce.date(),
})
export type RosterEntry = z.infer<typeof RosterEntrySchema>

// One tournament's check-in state for a player, used by the cross-day checkin page
export const CheckinRegistrationSchema = z.object({
	registration_id: z.uuid(),
	team_id: z.uuid(),
	tournament_id: z.uuid(),
	tournament_name: z.string(),
	checked_in: z.boolean(),
})
export type CheckinRegistration = z.infer<typeof CheckinRegistrationSchema>

// One player row on the cross-day checkin page
export const CheckinPlayerSchema = z.object({
	player_id: z.uuid(),
	first_name: z.string(),
	last_name: z.string(),
	registrations: z.array(CheckinRegistrationSchema),
})
export type CheckinPlayer = z.infer<typeof CheckinPlayerSchema>
