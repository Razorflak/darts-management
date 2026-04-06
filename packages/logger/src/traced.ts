import { SpanStatusCode, trace } from "@opentelemetry/api"

const tracer = trace.getTracer("darts-management")

export function traced<TArgs extends unknown[], TReturn>(
	name: string,
	fn: (...args: TArgs) => Promise<TReturn>,
	attributes?: Record<string, string>,
): (...args: TArgs) => Promise<TReturn> {
	return (...args: TArgs): Promise<TReturn> =>
		tracer.startActiveSpan(name, async (span) => {
			if (attributes) {
				for (const [key, value] of Object.entries(attributes)) {
					span.setAttribute(key, value)
				}
			}
			try {
				const result = await fn(...args)
				span.setStatus({ code: SpanStatusCode.OK })
				return result
			} catch (err) {
				span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
				span.recordException(err as Error)
				throw err
			} finally {
				span.end()
			}
		})
}
