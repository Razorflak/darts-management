import { trace } from "@opentelemetry/api"
import pino from "pino"
import { createOtelStream } from "./otel-stream.js"

const isDev = process.env.NODE_ENV !== "production"

export const logger = pino(
	{
		level: process.env.LOG_LEVEL ?? "info",
		mixin() {
			const span = trace.getActiveSpan()
			if (!span?.isRecording()) return {}
			const { traceId, spanId } = span.spanContext()
			return { traceId, spanId }
		},
	},
	pino.multistream(
		isDev
			? [
					{
						stream: pino.transport({
							target: "pino-pretty",
							options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
						}),
						level: "debug",
					},
					{ stream: createOtelStream(), level: "info" },
				]
			: [
					{ stream: process.stdout, level: "info" },
					{ stream: createOtelStream(), level: "info" },
				],
	),
)
