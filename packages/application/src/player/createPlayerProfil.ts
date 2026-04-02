import { playerRepository } from "@darts-management/db"
import { formatPlayerInfo } from "@darts-management/domain"

type CreateProfile = {
	user_id: string
	first_name: string
	last_name: string
	department: string
	birth_date: Date | null
	licence_no: string | null
}

export const createPlayerProfile = async (data: CreateProfile) => {
	const formatted = formatPlayerInfo(data)
	return playerRepository.linkOrCreate({
		...data,
		...formatted,
		licence_no: formatted.licence_no ?? null,
	})
}
