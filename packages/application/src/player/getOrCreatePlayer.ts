import { playerRepository } from "@darts-management/db"
import type { MinimalPlayer } from "@darts-management/domain"

export const getOrCreatePlayer = async (
	player: { id: string } | MinimalPlayer,
): Promise<string> => {
	if ("id" in player) return player.id
	if (await playerRepository.exists(player)) {
		throw new Error("PlayerAlreadyExists")
	}
	return await playerRepository.create(player)
}
