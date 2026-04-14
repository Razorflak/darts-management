import { traced } from "@darts-management/logger"
import type { Sql } from "postgres"

// biome-ignore lint/suspicious/noExplicitAny: generic repository utility requires any
type RepositoryFn = (sql: Sql, ...args: any[]) => Promise<any>

type Repository = Record<string, RepositoryFn>

type BoundRepository<T extends Repository> = {
	[K in keyof T]: T[K] extends (sql: Sql, ...args: infer Args) => infer R
		? (...args: Args) => R
		: never
}

export const createRepository = <T extends Repository>(
	sql: Sql,
	repositoryObject: T,
): BoundRepository<T> => {
	// biome-ignore lint/suspicious/noExplicitAny: generic repository utility requires any
	const repo = {} as Record<string, (...args: any[]) => Promise<any>>
	for (const [name, fn] of Object.entries(repositoryObject)) {
		// biome-ignore lint/suspicious/noExplicitAny: generic repository utility requires any
		repo[name] = traced(`db.${name}`, (...args: any[]) => fn(sql, ...args))
	}
	return repo as BoundRepository<T>
}
