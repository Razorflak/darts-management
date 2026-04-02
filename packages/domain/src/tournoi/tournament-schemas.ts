import { z } from "zod"
import { PhaseSchema } from "./phase-schemas.js"

export const CategorySchema = z.enum([
	"male",
	"female",
	"junior",
	"veteran",
	"open",
	"mix",
	"double",
	"double_female",
	"double_mix",
])
export type Category = z.infer<typeof CategorySchema>

export const TournamentSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	category: CategorySchema,
	start_at: z.coerce.date().nullable(),
	phases: z.array(PhaseSchema).min(1),
	auto_referee: z.boolean(),
	check_in_required: z.boolean(),
	status: z.enum(["ready", "check-in", "started", "finished"]),
})
export type Tournament = z.infer<typeof TournamentSchema>

export const DraftTournamentSchema = TournamentSchema.partial().extend({
	id: TournamentSchema.shape.id,
	name: TournamentSchema.shape.name,
	phases: z.array(PhaseSchema).default([]),
	check_in_required: z.boolean().default(false),
})
export type DraftTournament = z.infer<typeof DraftTournamentSchema>
