import { z } from "zod"

export const PlayerSchema = z.object({
	id: z.uuid(),
	user_id: z.string().nullable(),
	first_name: z.string(),
	last_name: z.string(),
	birth_date: z.coerce.date().nullable(),
	licence_no: z.string().nullable(),
	department: z.string(),
})
export type Player = z.infer<typeof PlayerSchema>

export const TeamSchema = z.object({
	id: z.uuid(),
	created_at: z.coerce.date(),
})

export const MinimalPlayerSchema = PlayerSchema.pick({
	first_name: true,
	last_name: true,
	department: true,
})
export type MinimalPlayer = z.infer<typeof MinimalPlayerSchema>

export type Team = z.infer<typeof TeamSchema>

export const TeamMemberSchema = z.object({
	team_id: z.uuid(),
	player_id: z.uuid(),
})
export type TeamMember = z.infer<typeof TeamMemberSchema>
