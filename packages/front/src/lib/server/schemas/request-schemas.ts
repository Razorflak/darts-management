import { z } from "zod"

export const SubmitMatchResultRequestSchema = z
	.object({
		match_id: z.string().uuid(),
		score_a: z.number().int().min(0).optional(),
		score_b: z.number().int().min(0).optional(),
		walkover: z.enum(["a", "b"]).optional(),
	})
	.refine(
		(data) =>
			data.walkover !== undefined ||
			(data.score_a !== undefined && data.score_b !== undefined),
		{ message: "Either walkover or both score_a and score_b must be provided" },
	)

export type SubmitMatchResultRequest = z.infer<
	typeof SubmitMatchResultRequestSchema
>

export const MatchLookupRequestSchema = z.object({
	event_id: z.string().uuid(),
	event_match_id: z.coerce.number().int().positive(),
})

export type MatchLookupRequest = z.infer<typeof MatchLookupRequestSchema>
