import { z } from "zod"

export const MatchStatusSchema = z.enum([
	"pending",
	"ongoing",
	"done",
	"walkover",
	"bye",
])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

// Used by generators to produce match insert rows (no DB fields like created_at)
export const MatchInsertRowSchema = z.object({
	id: z.uuid(),
	phase_id: z.uuid(),
	event_match_id: z.number().int().positive(),
	group_number: z.number().int().nullable(),
	round_number: z.number().int(),
	position: z.number().int(),
	team_a_id: z.uuid().nullable(),
	team_b_id: z.uuid().nullable(),
	referee_team_id: z.uuid().nullable(),
	advances_to_match_id: z.uuid().nullable(),
	advances_to_slot: z.enum(["a", "b"]).nullable(),
	status: MatchStatusSchema,
	sets_to_win: z.number().int().positive(),
	legs_per_set: z.number().int().positive(),
})
export type MatchInsertRow = z.infer<typeof MatchInsertRowSchema>

// Full match row from DB (includes created_at, score)
export const MatchRowSchema = MatchInsertRowSchema.extend({
	score_a: z.number().int().nullable(),
	score_b: z.number().int().nullable(),
	created_at: z.coerce.date(),
})
export type MatchRow = z.infer<typeof MatchRowSchema>
