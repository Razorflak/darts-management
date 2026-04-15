import { z } from "zod"
import { sql as defaultSql } from "../client.js"
import { createRepository } from "./utils.js"

type Sql = typeof defaultSql

export type EventSaveData = {
	id: string
	name: string
	entity_id: string
	starts_at: Date | null
	ends_at: Date | null
	location: string
	registration_opens_at: Date | null
	status: string
}

const EventOwnerSchema = z.object({
	organizer_id: z.string(),
	entity_id: z.uuid(),
	status: z.string(),
})
export type EventOwner = z.infer<typeof EventOwnerSchema>

const internalRepoEvent = {
	findOwner: async (sql: Sql, eventId: string) => {
		const rows = z
			.array(EventOwnerSchema)
			.parse(
				await sql`SELECT organizer_id, entity_id, status FROM event WHERE id = ${eventId}`,
			)
		return rows[0] ?? null
	},

	save: async (sql: Sql, data: EventSaveData, userId: string) => {
		await sql`
		INSERT INTO event (
			id, 
			name, 
			entity_id, 
			organizer_id, 
			starts_at, 
			ends_at, 
			location, 
			registration_opens_at, 
			status
		)
		VALUES (
			${data.id}, 
			${data.name.trim()}, 
			${data.entity_id}, 
			${userId},
			${data.starts_at}, 
			${data.ends_at}, 
			${data.location},
			${data.registration_opens_at}, 
			${data.status}
		)
		ON CONFLICT (id) DO UPDATE SET
			name                  = ${data.name.trim()},
			entity_id             = ${data.entity_id},
			status                = ${data.status},
			starts_at             = ${data.starts_at},
			ends_at               = ${data.ends_at},
			location              = ${data.location},
			registration_opens_at = ${data.registration_opens_at},
			updated_at            = now()
	`
	},

	updateStatus: async (sql: Sql, eventId: string, status: "ready") => {
		await sql`UPDATE event SET status = ${status} WHERE id = ${eventId}`
	},

	deleteById: (sql: Sql, eventId: string) =>
		sql`DELETE FROM event WHERE id = ${eventId}`,
}

export const eventRepository = createRepository(defaultSql, internalRepoEvent)
export const getEventRepositoryWithSql = (sql: Sql) =>
	createRepository(sql, internalRepoEvent)
