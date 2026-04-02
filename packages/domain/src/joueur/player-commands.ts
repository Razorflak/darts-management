import { z } from "zod"

/** Profile form schemas — validates form data from /profile/create and /profile/edit */
export const CreateProfileSchema = z.object({
	first_name: z.string().min(1, "Prénom obligatoire"),
	last_name: z.string().min(1, "Nom obligatoire"),
	department: z.string().min(1, "Département obligatoire"),
	birth_date: z.string().nullable(),
	licence_no: z.string().nullable(),
})
export type CreateProfileInput = z.infer<typeof CreateProfileSchema>

export const UpdateProfileSchema = z.object({
	first_name: z.string().min(1, "Prénom obligatoire"),
	last_name: z.string().min(1, "Nom obligatoire"),
	department: z.string().min(1, "Département obligatoire"),
	birth_date: z.string().nullable(),
	// licence_no intentionally absent — not modifiable after initial entry
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
