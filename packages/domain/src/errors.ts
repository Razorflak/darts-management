export const errors = {
	ERR_0001: { code: "ERR_0001", message: "Une erreur inconnue est survenue" },
	ERR_0002: { code: "ERR_0002", message: "Requête invalide" },
	ERR_0003: {
		code: "ERR_0003",
		message:
			"Un joueur avec ce nom, prénom et département existe déjà. Veuillez contacter l'administrateur",
	},
	ERR_0004: {
		code: "ERR_0004",
		message:
			"Un joueur licencié existe déjà avec ces informations. Veuillez bien saisir toutes les informations pour pouvoir faire le lien avec le joueur existant ou contacter l'administrateur si vous pensez qu'il s'agit d'une erreur",
	},
	ERR_0005: { code: "ERR_0005", message: "Non authentifié" },
	ERR_0006: { code: "ERR_0006", message: "Accès refusé" },
	ERR_0007: { code: "ERR_0007", message: "Ressource introuvable" },
	ERR_0008: {
		code: "ERR_0008",
		message: "Cette équipe est déjà inscrite à ce tournoi",
	},
	ERR_0009: {
		code: "ERR_0009",
		message: "Ce joueur est déjà inscrit à ce tournoi",
	},
} as const

export const getJsonStringError = (
	err: (typeof errors)[keyof typeof errors],
	details?: string,
) =>
	JSON.stringify({ error: { code: err.code, message: err.message, details } })
