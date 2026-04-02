import { z } from "zod"

export const BracketTierSchema = z.object({
	round: z.enum([
		"4096",
		"2048",
		"1024",
		"512",
		"256",
		"128",
		"64",
		"32",
		"16",
		"8",
		"4",
		"2",
		"1",
	]),
	legs: z.number().int().positive(),
})
export type BracketTier = z.infer<typeof BracketTierSchema>

const CommonPhaseSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	position: z.number().int(),
})

export const PhaseTypeSchema = z.enum([
	"round_robin",
	"double_loss_groups",
	"single_elimination",
	"double_elimination",
])
export type PhaseType = z.infer<typeof PhaseTypeSchema>

export const GroupPhaseSchema = CommonPhaseSchema.extend({
	type: z.enum(["round_robin", "double_loss_groups"]),
	players_per_group: z.number().int(),
	qualifiers_per_group: z.number().int(),
})
export type GroupPhase = z.infer<typeof GroupPhaseSchema>

export const EliminationPhaseSchema = CommonPhaseSchema.extend({
	type: z.enum(["single_elimination", "double_elimination"]),
	tiers: z.array(BracketTierSchema).min(1),
	qualifiers_count: z.number().int().nonnegative(),
})
export type EliminationPhase = z.infer<typeof EliminationPhaseSchema>

export const SwissPhaseSchema = CommonPhaseSchema.extend({
	type: z.literal("swiss"),
	entrants: z.number().int().positive(),
	rounds: z.number().int().positive(),
})
export type SwissPhase = z.infer<typeof SwissPhaseSchema>

export const PhaseSchema = z.discriminatedUnion("type", [
	GroupPhaseSchema,
	EliminationPhaseSchema,
	//SwissPhaseSchema
])
export type Phase = z.infer<typeof PhaseSchema>

export const PhaseTierSchema = z.object({
	id: z.uuid(),
	phase_id: z.uuid(),
	position: z.number().int(),
	sets_to_win: z.number().int().positive(),
	legs_per_set: z.number().int().positive(),
	qualifiers_count: z.number().int().nullable(),
})
export type PhaseTier = z.infer<typeof PhaseTierSchema>
