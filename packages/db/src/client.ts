import { setDefaultResultOrder } from "node:dns"
import { SpanStatusCode, trace } from "@opentelemetry/api"
import postgres from "postgres"

// Résout les soucis de perf vers supaBase
setDefaultResultOrder("ipv6first")

const tracer = trace.getTracer("darts-management/db")

function withTiming(inner: postgres.Sql): postgres.Sql {
	const showQuery = process.env.DEBUG_SQL === "true"

	return new Proxy(inner, {
		get(target, prop) {
			const value = Reflect.get(target, prop)
			if (prop === "begin" && typeof value === "function") {
				return (callback: (tx: postgres.Sql) => unknown) =>
					value.call(target, (tx: postgres.Sql) => callback(withTiming(tx)))
			}
			return typeof value === "function" ? value.bind(target) : value
		},
		apply(target, thisArg, args) {
			// Les appels helper sql(rows, "col1", ...) retournent un Builder,
			// pas une Promise — les bypasser sans span.
			const isTaggedTemplate = Array.isArray(
				(args[0] as TemplateStringsArray)?.raw,
			)
			if (!isTaggedTemplate) {
				return Reflect.apply(
					target as (...a: unknown[]) => unknown,
					thisArg,
					args,
				)
			}

			return tracer.startActiveSpan("db.sql", (span) => {
				if (showQuery) {
					span.setAttribute(
						"db.statement",
						(args[0] as TemplateStringsArray).raw.join("$?"),
					)
				}
				// @ts-expect-error
				return Reflect.apply(
					target as (...a: unknown[]) => unknown,
					thisArg,
					args,
				).then(
					(rows: unknown) => {
						span.setStatus({ code: SpanStatusCode.OK })
						span.end()
						return rows
					},
					(err: unknown) => {
						span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
						span.recordException(err as Error)
						span.end()
						throw err
					},
				)
			})
		},
	}) as unknown as postgres.Sql
}

export function createSql(databaseUrl: string): postgres.Sql {
	const isPooler = databaseUrl.includes(":6543")

	const inner = postgres(databaseUrl, {
		max: 5,
		idle_timeout: 20,
		max_lifetime: 1800,
		prepare: !isPooler,
	})

	return withTiming(inner)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("[db] DATABASE_URL is not set")

export const sql = createSql(databaseUrl)
