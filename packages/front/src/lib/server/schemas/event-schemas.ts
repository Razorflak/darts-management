import { z } from 'zod'

// ------------------------------------------------------------------
// Event list row (events/+page.server.ts)
// ------------------------------------------------------------------
export const EventRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.enum(['draft', 'ready', 'started', 'finished']),
	starts_at: z.string(),
	ends_at: z.string(),
	location: z.string(),
	registration_opens_at: z.string().nullable(),
	entity_name: z.string(),
	tournament_count: z.number().int(),
})
export type EventRow = z.infer<typeof EventRowSchema>

// ------------------------------------------------------------------
// Event detail row (edit/+page.server.ts event query)
// ------------------------------------------------------------------
export const EventDetailRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	entity_id: z.string(),
	starts_at: z.string().nullable(),
	ends_at: z.string().nullable(),
	location: z.string(),
	registration_opens_at: z.string().nullable(),
	status: z.string(),
})
export type EventDetailRow = z.infer<typeof EventDetailRowSchema>

// ------------------------------------------------------------------
// Tournament row (edit/+page.server.ts tournament query)
// ------------------------------------------------------------------
export const TournamentRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	club: z.string().nullable(),
	category: z.string().nullable(),
	quota: z.number().int(),
	start_time: z.string(),
	start_date: z.string().nullable(),
	auto_referee: z.boolean(),
})
export type TournamentRow = z.infer<typeof TournamentRowSchema>

// ------------------------------------------------------------------
// BracketTier schema (used inside PhaseRowSchema for tiers JSONB)
// ------------------------------------------------------------------
const BracketTierSchema = z.object({
	id: z.string(),
	round: z.number().int(),
	legs: z.number().int(),
})

// ------------------------------------------------------------------
// Phase row (edit/+page.server.ts phase query)
// tiers is JSONB — postgres.js may return it already parsed (object)
// or as a JSON string. Use z.preprocess to handle both cases.
// ------------------------------------------------------------------
export const PhaseRowSchema = z.object({
	id: z.string(),
	tournament_id: z.string(),
	position: z.number().int(),
	type: z.string(),
	entrants: z.number().int(),
	players_per_group: z.number().int().nullable(),
	qualifiers_per_group: z.number().int().nullable(),
	qualifiers: z.number().int().nullable(),
	tiers: z.preprocess(
		(val) => (typeof val === 'string' ? JSON.parse(val) : val),
		z.array(BracketTierSchema).nullable(),
	),
})
export type PhaseRow = z.infer<typeof PhaseRowSchema>

// ------------------------------------------------------------------
// Entity row for event wizard (edit/+page.server.ts entity query)
// ------------------------------------------------------------------
export const EventEntityRowSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
})
export type EventEntityRow = z.infer<typeof EventEntityRowSchema>
