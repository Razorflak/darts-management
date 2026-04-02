import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

const statement = {
	...defaultStatements,
	entity: ["create", "update", "delete", "read"],
	event: ["create", "update", "delete", "read"],
	tournament: ["create", "update", "delete", "manage"],
	user_role: ["assign"],
} as const

export const ac = createAccessControl(statement)

export const joueur = ac.newRole({
	event: ["read"],
	entity: ["read"],
})

export const organisateur = ac.newRole({
	event: ["create", "update", "read"],
	entity: ["read"],
	tournament: ["create", "update", "manage"],
})

export const adminTournoi = ac.newRole({
	event: ["create", "update", "read"],
	entity: ["read"],
	tournament: ["create", "update", "delete", "manage"],
})

export const adminFederal = ac.newRole({
	...adminAc.statements,
	entity: ["create", "update", "delete", "read"],
	event: ["create", "update", "delete", "read"],
	tournament: ["create", "update", "delete", "manage"],
	user_role: ["assign"],
})
