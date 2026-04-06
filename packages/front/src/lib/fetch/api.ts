// Les méthodes sont juste la à titre indicatif pour éviter d'avoir à les chercher dans les ficchiers
export const apiRoutes = {
	EVENT_SAVE: { method: ["POST"], path: "/api/event/save" },
	EVENT_PUBLISH: { method: ["POST"], path: "/api/event/publish" },
	EVENT_DELETE: { method: ["DELETE"], path: "/api/event/delete" },
	PLAYERS_PARTER_SEARCH: {
		method: ["GET"],
		path: "/api/players/partner/search",
	},
	PLAYERS: { method: ["POST"], path: "/api/players" },
	PLAYERS_SEARCH: { method: ["GET"], path: "/api/players/search" },
	TOURNAMENT_CHECKIN: { method: ["POST"], path: "/api/tournament/checkin" },
	TOURNAMENT_CHECKIN_ALL: {
		method: ["POST"],
		path: "/api/tournament/checkin-all",
	},
	TOURNAMENT_CANCEL: { method: ["POST"], path: "/api/tournament/cancel" },
	TOURNAMENT_LAUNCH: { method: ["POST"], path: "/api/tournament/launch" },
	TOURNAMENT_REGISTER: { method: ["POST"], path: "/api/tournament/register" },
	TOURNAMENT_SEED_ORDER: {
		method: ["PATCH"],
		path: "/api/tournament/seed-order",
	},
	TOURNAMENT_STATUS: { method: ["PATCH"], path: "/api/tournament/status" },
	TOURNAMENT_UNEREGISER: {
		method: ["DELETE"],
		path: "/api/tournament/unregister",
	},
	PLAYERS_CREATE_PROFILE: {
		method: ["POST"],
		path: "/api/players/create-player-profile",
	},
	PLAYERS_UPDATE_PROFILE: {
		method: ["PUT"],
		path: "/api/players/profile",
	},
}
