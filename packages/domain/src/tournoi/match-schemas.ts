import { z } from "zod"

export const MatchStatusSchema = z.enum([
	"pending",
	"ongoing",
	"done",
	"walkover",
	"bye",
])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

// ─── Info tables insert rows ──────────────────────────────────────────────────

export const RoundRobinInfoInsertRowSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	group_number: z.number().int(),
	round_number: z.number().int(),
	position: z.number().int(),
	slot_a: z.number().int().positive(),
	slot_b: z.number().int().positive(),
})
export type RoundRobinInfoInsertRow = z.infer<
	typeof RoundRobinInfoInsertRowSchema
>

export const BracketInfoInsertRowSchema = z.object({
	id: z.uuid(),
	tournament_id: z.uuid(),
	bracket: z.enum(["W", "L", "GF"]),
	round_number: z.number().int(),
	position: z.number().int(),
	group_number: z.number().int().nullable(),
	seed_a: z.number().int().nullable(),
	seed_b: z.number().int().nullable(),
	winner_goes_to_info_id: z.uuid().nullable(),
	winner_goes_to_slot: z.enum(["a", "b"]).nullable(),
	loser_goes_to_info_id: z.uuid().nullable(),
	loser_goes_to_slot: z.enum(["a", "b"]).nullable(),
})
export type BracketInfoInsertRow = z.infer<typeof BracketInfoInsertRowSchema>

// ─── Match insert row ─────────────────────────────────────────────────────────
// Utilisé par les générateurs pour produire les lignes à insérer.
// Les métadonnées structurelles (round, position, groupe, navigation bracket)
// sont dans les tables info référencées par round_robin_info_id / bracket_info_id.

export const MatchInsertRowSchema = z.object({
	id: z.uuid(),
	phase_id: z.uuid(),
	event_match_id: z.number().int().positive(),
	team_a_id: z.uuid().nullable(),
	team_b_id: z.uuid().nullable(),
	referee_team_id: z.uuid().nullable(),
	status: MatchStatusSchema,
	sets_to_win: z.number().int().positive(),
	legs_per_set: z.number().int().positive(),
	round_robin_info_id: z.uuid().nullable(),
	bracket_info_id: z.uuid().nullable(),
})
export type MatchInsertRow = z.infer<typeof MatchInsertRowSchema>

// ─── Generator result ─────────────────────────────────────────────────────────
// Type de retour unifié de tous les générateurs de matchs.

export const GeneratorResultSchema = z.object({
	matches: z.array(MatchInsertRowSchema),
	roundRobinInfos: z.array(RoundRobinInfoInsertRowSchema),
	bracketInfos: z.array(BracketInfoInsertRowSchema),
})
export type GeneratorResult = z.infer<typeof GeneratorResultSchema>

// ─── Full match row from DB ───────────────────────────────────────────────────

export const MatchRowSchema = MatchInsertRowSchema.extend({
	score_a: z.number().int().nullable(),
	score_b: z.number().int().nullable(),
	board: z.number().int().nullable(),
	created_at: z.coerce.date(),
})
export type MatchRow = z.infer<typeof MatchRowSchema>
