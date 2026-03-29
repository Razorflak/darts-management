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
			"Un joueur licencié existe déjà avec ces informations. Veuillez bien saisir toutes les information pour pouvoir faire le lien avec le joueur existant ou contacter l'administrateur si vous pensez qu'il s'agit d'une erreur",
	},
}

export const getJsonStringError = (
	error: (typeof errors)[keyof typeof errors],
	details?: string,
) => {
	return JSON.stringify({
		error: { code: error.code, message: error.message, details },
	})
}
