import type { z } from "zod"
import { PlayerSchema } from "./player-schemas.js"

// Used by admin player search endpoint
export const PlayerSearchResultSchema = PlayerSchema.omit({ user_id: true })
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>

// Used by doubles partner search endpoint
export const PartnerSearchResultSchema = PlayerSchema.pick({
	id: true,
	first_name: true,
	last_name: true,
	department: true,
})
export type PartnerSearchResult = z.infer<typeof PartnerSearchResultSchema>
