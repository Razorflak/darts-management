import { traced } from "@darts-management/logger"
import { deleteEvent as _deleteEvent } from "./event/delete-event.js"
import { publishEvent as _publishEvent } from "./event/publish-event.js"
import { saveDraftEvent as _saveDraftEvent } from "./event/save-draft-event.js"
import { createPlayerProfile as _createPlayerProfile } from "./player/createPlayerProfil.js"
import { getOrCreatePlayer as _getOrCreatePlayer } from "./player/getOrCreatePlayer.js"
import { cancelLaunch as _cancelLaunch } from "./tournament/cancel-launch.js"
import { launchTournament as _launchTournament } from "./tournament/launch-tournament.js"
import { registerTeam as _registerTeam } from "./tournament/register-team.js"
import { submitMatchResult as _submitMatchResult } from "./tournament/submit-match-result.js"

export { ADMIN_ROLES, ORGANISABLE_ROLES } from "./event/constants.js"

// Wrap all exported functions in traced for automatic telemetry

export const createPlayerProfile = traced(
	"app.createPlayerProfile",
	_createPlayerProfile,
)
export const deleteEvent = traced("app.deleteEvent", _deleteEvent)
export const getOrCreatePlayer = traced(
	"app.getOrCreatePlayer",
	_getOrCreatePlayer,
)
export const publishEvent = traced("app.publishEvent", _publishEvent)
export const saveDraftEvent = traced("app.saveDraftEvent", _saveDraftEvent)

export const cancelLaunch = traced("app.cancelLaunch", _cancelLaunch)
export const launchTournament = traced(
	"app.launchTournament",
	_launchTournament,
)
export const registerTeam = traced("app.registerTeam", _registerTeam)
export const submitMatchResult = traced(
	"app.submitMatchResult",
	_submitMatchResult,
)
