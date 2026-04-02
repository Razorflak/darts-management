import type { Sql } from "postgres"

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
	const repo = {} as Record<string, (...args: any[]) => Promise<any>>
	for (const [name, fn] of Object.entries(repositoryObject)) {
		repo[name] = (...args: any[]) => fn(sql, ...args)
	}
	return repo as BoundRepository<T>
}
