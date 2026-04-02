import type { EntityRole } from "@darts-management/db"

export const ORGANISABLE_ROLES: EntityRole[] = [
	"organisateur",
	"adminClub",
	"adminComite",
	"adminLigue",
	"adminFederal",
]

export const ADMIN_ROLES: EntityRole[] = [
	"adminTournoi",
	"adminClub",
	"adminComite",
	"adminLigue",
	"adminFederal",
]
