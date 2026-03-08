import { z } from "zod"

export const EntitySchema = z.object({
	id: z.uuid(),
	type: z.enum(["federation", "ligue", "comité", "club"]),
	name: z.string()
})
export type Entity = z.infer<typeof EntitySchema>

export const BracketTierSchema = z.object({
	round: z.enum(["4096", "2048", "1024", "512", "256", "128", "64", "32", "16", "8", "4", "2"]),
	legs: z.number().int().positive()
})
export type BracketTier = z.infer<typeof BracketTierSchema>

/** ######################## */
/** ######## PHASES ######## */
/** ######################## */

const CommonPhaseSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	position: z.number().int()
})

export const PhaseTypeSchema = z.enum([
	"round_robin",
	"double_loss_groups",
	"single_elimination",
	"double_elimination"
])
export type PhaseType = z.infer<typeof PhaseTypeSchema>

export const GroupPhaseSchema = CommonPhaseSchema.extend({
	type: z.enum(["round_robin", "double_loss_groups"]),
	players_per_group: z.number().int(),
	qualifiers_per_group: z.number().int()
})

export const EliminationPhaseSchema = CommonPhaseSchema.extend({
	type: z.enum(["single_elimination", "double_elimination"]),
	tiers: z.array(BracketTierSchema).min(1),
	qualifiers_count: z.number().int().nonnegative()
})

export const SwissPhaseSchema = CommonPhaseSchema.extend({
	type: z.literal("swiss"),
	entrants: z.number().int().positive(),
	rounds: z.number().int().positive()
})

export const PhaseSchema = z.discriminatedUnion("type", [
	GroupPhaseSchema,
	EliminationPhaseSchema
	//SwissPhaseSchema
])
export type Phase = z.infer<typeof PhaseSchema>

export type GroupPhase = z.infer<typeof GroupPhaseSchema>
export type EliminationPhase = z.infer<typeof EliminationPhaseSchema>
export type SwissPhase = z.infer<typeof SwissPhaseSchema>

/** ######################## */
/** ####### TOURNAMENTS ###### */
/** ######################## */

export const CategorySchema = z.enum([
	"male",
	"female",
	"junior",
	"veteran",
	"open",
	"mix",
	"double",
	"double_female",
	"double_mix"
])
export type Category = z.infer<typeof CategorySchema>

export const TournamentSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	start_at: z.coerce.date().nullable(),
	phases: z.array(PhaseSchema).min(1),
	auto_referee: z.boolean(),
	check_in_required: z.boolean()
})
export type Tournament = z.infer<typeof TournamentSchema>

export const DraftTournamentSchema = TournamentSchema.partial().extend({
	id: TournamentSchema.shape.id,
	name: TournamentSchema.shape.name,
	phases: z.array(PhaseSchema).default([]),
	check_in_required: z.boolean().default(false)
})
export type DraftTournament = z.infer<typeof DraftTournamentSchema>

/** ######################## */
/** ######## EVENT ######### */
/** ######################## */

export const EventSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	status: z.enum(["ready", "started", "finished"]),
	starts_at: z.coerce.date(),
	ends_at: z.coerce.date(),
	location: z.string(),
	registration_opens_at: z.coerce.date(),
	entity: EntitySchema,
	tournaments: z.array(TournamentSchema).min(1)
})
export type Event = z.infer<typeof EventSchema>

export const DraftEventSchema = EventSchema.partial().extend({
	id: EventSchema.shape.id,
	status: z.enum(["draft"]),
	entity: EntitySchema.nullish(),
	tournaments: z.array(DraftTournamentSchema)
})
export type DraftEvent = z.infer<typeof DraftEventSchema>

/** ######################## */
/** ####### EVENT LIST ###### */
/** ######################## */

export const EventListItemSchema = EventSchema.omit({
	entity: true,
	tournaments: true,
	status: true
}).extend({
	status: z.enum(["draft", "ready", "started", "finished"]),
	entity_name: z.string(),
	tournament_count: z.number()
})
export type EventListItem = z.infer<typeof EventListItemSchema>

/** ######################## */
/** ####### PLAYER ######### */
/** ######################## */

export const PlayerSchema = z.object({
	id: z.uuid(),
	user_id: z.string().nullable(),
	first_name: z.string(),
	last_name: z.string(),
	birth_date: z.string(), // DATE returned as text from postgres
	licence_no: z.string().nullable(),
	department: z.string().nullable()
})
export type Player = z.infer<typeof PlayerSchema>

export const TeamSchema = z.object({
	id: z.uuid(),
	created_at: z.coerce.date()
})
export type Team = z.infer<typeof TeamSchema>

export const TeamMemberSchema = z.object({
	team_id: z.uuid(),
	player_id: z.uuid()
})
export type TeamMember = z.infer<typeof TeamMemberSchema>

export const TournamentRegistrationSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	team_id: z.uuid(),
	checked_in: z.boolean(),
	registered_at: z.coerce.date()
})
export type TournamentRegistration = z.infer<typeof TournamentRegistrationSchema>

// Used by public event page: tournament info + registration state for current visitor
export const TournamentWithRegistrationSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	check_in_required: z.boolean(),
	registration_count: z.number().int(),
	is_registered: z.boolean() // true if current user's player is registered
})
export type TournamentWithRegistration = z.infer<typeof TournamentWithRegistrationSchema>

// Used by roster views (public + admin)
const RosterMemberSchema = z.object({
	player_id: z.uuid(),
	first_name: z.string(),
	last_name: z.string(),
	department: z.string().nullable()
})

export const RosterEntrySchema = z.object({
	registration_id: z.uuid(),
	team_id: z.uuid(),
	members: z.preprocess(
		(val) => (typeof val === "string" ? JSON.parse(val) : val),
		z.array(RosterMemberSchema)
	),
	checked_in: z.boolean(),
	registered_at: z.coerce.date()
})
export type RosterEntry = z.infer<typeof RosterEntrySchema>

// Used by admin player search endpoint
export const PlayerSearchResultSchema = z.object({
	id: z.uuid(),
	first_name: z.string(),
	last_name: z.string(),
	birth_date: z.string(), // DATE as text
	licence_no: z.string().nullable(),
	department: z.string().nullable()
})
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>

// Used by doubles partner search endpoint
export const PartnerSearchResultSchema = z.object({
	id: z.uuid(),
	first_name: z.string(),
	last_name: z.string(),
	department: z.string().nullable()
})
export type PartnerSearchResult = z.infer<typeof PartnerSearchResultSchema>

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
	organizer_id: z.uuid().nullable()
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
	entity_id: z.uuid()
})
export type AdminTournament = z.infer<typeof AdminTournamentSchema>
