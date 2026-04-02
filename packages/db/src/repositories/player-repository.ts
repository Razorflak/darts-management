import {
	formatPlayerInfo,
	type PartnerSearchResult,
	PartnerSearchResultSchema,
	type PlayerSearchResult,
	PlayerSearchResultSchema,
} from "@darts-management/domain"
import { z } from "zod"
import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

type ProfileInput = {
	user_id: string
	first_name: string
	last_name: string
	department: string
	birth_date: Date | null
	licence_no: string | null
}

type LinkOrCreateResult =
	| { created: true }
	| { updated: true }
	| { conflict: "homonym" | "licence" }

const internalRepoPlayer = {
	search: async (sql: Sql, query: string): Promise<PlayerSearchResult[]> => {
		return z.array(PlayerSearchResultSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT id, first_name, last_name, birth_date::text, licence_no, department
				FROM player
				WHERE first_name ILIKE ${`%${query}%`}
				   OR last_name  ILIKE ${`%${query}%`}
				   OR licence_no ILIKE ${`%${query}%`}
				ORDER BY last_name, first_name
				LIMIT 10
			`,
		)
	},

	searchPartners: async (
		sql: Sql,
		currentPlayerId: string,
		query: string,
	): Promise<PartnerSearchResult[]> => {
		return z.array(PartnerSearchResultSchema).parse(
			await sql<Record<string, unknown>[]>`
				SELECT id, first_name, last_name, department
				FROM player
				WHERE id != ${currentPlayerId}
				  AND (
				    first_name ILIKE ${`%${query}%`}
				    OR last_name  ILIKE ${`%${query}%`}
				    OR department ILIKE ${`%${query}%`}
				  )
				ORDER BY last_name, first_name
				LIMIT 10
			`,
		)
	},

	exists: async (
		sql: Sql,
		player: { first_name: string; last_name: string; department: string },
	): Promise<boolean> => {
		const rows = await sql<{ id: string }[]>`
			SELECT id FROM player
			WHERE LOWER(first_name) = ${player.first_name.toLowerCase()}
			  AND LOWER(last_name)  = ${player.last_name.toLowerCase()}
			  AND LOWER(department) = ${player.department.toLowerCase()}
			LIMIT 1
		`
		return rows.length > 0
	},

	create: async (
		sql: Sql,
		data: { first_name: string; last_name: string; department: string },
	): Promise<string> => {
		const formatted = formatPlayerInfo(data)
		const [row] = await sql<{ id: string }[]>`
			INSERT INTO player (first_name, last_name, department)
			VALUES (${formatted.first_name}, ${formatted.last_name}, ${formatted.department})
			RETURNING id
		`
		return row.id
	},

	linkOrCreate: async (
		sql: Sql,
		data: ProfileInput,
	): Promise<LinkOrCreateResult> => {
		const {
			first_name,
			last_name,
			department,
			birth_date,
			licence_no,
			user_id,
		} = data

		const existing = await sql<
			{
				id: string
				user_id: string | null
				birth_date: string | null
				licence_no: string | null
			}[]
		>`
			SELECT id, user_id, birth_date, licence_no FROM player
			WHERE department = ${department}
			  AND first_name = ${first_name}
			  AND last_name  = ${last_name}
			LIMIT 1
		`

		if (existing.length > 0) {
			const p = existing[0]
			const birthDatesMatch =
				(!birth_date && !p.birth_date) ||
				(birth_date &&
					p.birth_date &&
					new Date(birth_date).getTime() === new Date(p.birth_date).getTime())
			const licenceMatch =
				(!licence_no && !p.licence_no) || licence_no === p.licence_no

			if (birthDatesMatch && licenceMatch) {
				await sql`UPDATE player SET user_id = ${user_id} WHERE id = ${p.id}`
				return { updated: true }
			}
			if (birth_date && p.birth_date) return { conflict: "homonym" }
			if (licence_no || p.licence_no) return { conflict: "licence" }
			return { conflict: "homonym" }
		}

		await sql`
			INSERT INTO player (user_id, first_name, last_name, department, birth_date, licence_no)
			VALUES (${user_id}, ${first_name}, ${last_name}, ${department},
			        ${birth_date ?? null}, ${licence_no ?? null})
		`
		return { created: true }
	},
}

export const playerRepository = createRepository(defaultSql, internalRepoPlayer)
export const getPlayerRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalRepoPlayer)
