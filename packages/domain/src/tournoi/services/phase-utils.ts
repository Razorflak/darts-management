import type { GroupPhase, Phase } from "../schemas.js"

export function isGroupPhase(p: Phase): p is GroupPhase {
	return p.type === "round_robin" || p.type === "double_loss_groups"
}
