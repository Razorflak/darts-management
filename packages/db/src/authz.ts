import type postgres from "postgres"
import { z } from "zod"
import { CheckRoleRowSchema, UserRoleRowSchema } from "./schemas.js"

export type EntityRole =
	| "organisateur"
	| "adminTournoi"
	| "adminClub"
	| "adminComite"
	| "adminLigue"
	| "adminFederal"

// Hiérarchie pour les règles de promotion (index = niveau, plus haut = plus de droits)
const ROLE_HIERARCHY: EntityRole[] = [
	"organisateur",
	"adminTournoi",
	"adminClub",
	"adminComite",
	"adminLigue",
	"adminFederal",
]

/**
 * Crée les fonctions d'autorisation scopées à une instance sql.
 */
export function createAuthz(sql: postgres.Sql) {
	/**
	 * Vérifie si un utilisateur a un rôle spécifique sur une entité donnée.
	 * Note : le rôle "joueur" est implicite pour tout utilisateur authentifié — ne pas appeler
	 * cette fonction pour vérifier joueur.
	 */
	async function checkRole(
		userId: string,
		entityId: string,
		role: EntityRole,
	): Promise<boolean> {
		const result = await sql<Record<string, unknown>[]>`
      SELECT COUNT(*) as count
      FROM user_entity_role
      WHERE user_id = ${userId}
        AND entity_id = ${entityId}
        AND role = ${role}
    `
		const rows = z.array(CheckRoleRowSchema).parse(result)
		return Number(rows[0]?.count ?? 0) > 0
	}

	/**
	 * Retourne tous les rôles d'un utilisateur (sur toutes les entités).
	 */
	async function getUserRoles(
		userId: string,
	): Promise<Array<{ entityId: string; role: EntityRole }>> {
		const result = await sql<Record<string, unknown>[]>`
      SELECT entity_id, role
      FROM user_entity_role
      WHERE user_id = ${userId}
    `
		const rows = z.array(UserRoleRowSchema).parse(result)
		return rows.map((r) => ({
			entityId: r.entity_id,
			role: r.role as EntityRole,
		}))
	}

	/**
	 * Vérifie si promoter peut assigner role à un autre user sur entityId.
	 * Règle : un admin peut promouvoir jusqu'à son propre niveau, uniquement sur les entités
	 * où il a ce niveau ou supérieur.
	 */
	async function canPromote(
		promoterId: string,
		entityId: string,
		targetRole: EntityRole,
	): Promise<boolean> {
		const promoterRoles = await getUserRoles(promoterId)
		const promoterEntityRoles = promoterRoles
			.filter((r) => r.entityId === entityId)
			.map((r) => r.role)

		const promoterMaxLevel = Math.max(
			-1,
			...promoterEntityRoles.map((r) => ROLE_HIERARCHY.indexOf(r)),
		)
		const targetLevel = ROLE_HIERARCHY.indexOf(targetRole)

		// adminFederal peut promouvoir sur n'importe quelle entité
		const isAdminFederal = promoterRoles.some((r) => r.role === "adminFederal")
		if (isAdminFederal)
			return targetLevel <= ROLE_HIERARCHY.indexOf("adminFederal")

		return promoterMaxLevel >= 0 && targetLevel <= promoterMaxLevel
	}

	return { checkRole, getUserRoles, canPromote }
}

// Singletons liés à l'instance sql du package
import { sql } from "./client.js"

const _authz = createAuthz(sql)
export const getUserRoles = _authz.getUserRoles
export const checkRole = _authz.checkRole
export const canPromote = _authz.canPromote
