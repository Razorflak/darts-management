export type {
	BracketConfig,
	BracketMode,
	BracketNode,
	BracketSide,
	BracketTierConfig,
	SlotRef,
} from "./bracket.js"
export { buildBracket, generateBracket } from "./bracket.js"
export { assignTeamsToPhase0, PHASE_FORMAT_DEFAULTS } from "./defaults.js"
export { generateDoubleKoStructure } from "./double-ko-group.js"
export { assignReferees } from "./referee-assignment.js"
export {
	bergerRounds,
	computeGroupSizes,
	generateRoundRobinMatches,
	generateRoundRobinStructure,
} from "./round-robin.js"
export { snakeDistribute } from "./snake-seeding.js"
