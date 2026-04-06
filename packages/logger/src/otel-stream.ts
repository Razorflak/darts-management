import { Writable } from "node:stream"
import { logs, SeverityNumber } from "@opentelemetry/api-logs"

const LEVEL_TO_SEVERITY: Record<number, SeverityNumber> = {
	10: SeverityNumber.TRACE,
	20: SeverityNumber.DEBUG,
	30: SeverityNumber.INFO,
	40: SeverityNumber.WARN,
	50: SeverityNumber.ERROR,
	60: SeverityNumber.FATAL,
}

export function createOtelStream(): Writable {
	const otelLogger = logs.getLogger("pino")
	return new Writable({
		write(chunk: Buffer, _encoding, callback) {
			try {
				const obj = JSON.parse(chunk.toString()) as Record<string, unknown>
				const {
					level,
					msg,
					time,
					pid: _pid,
					hostname: _hostname,
					...attrs
				} = obj
				otelLogger.emit({
					severityNumber:
						LEVEL_TO_SEVERITY[(level as number) ?? 30] ?? SeverityNumber.INFO,
					body: msg as string,
					timestamp: new Date((time as number) ?? Date.now()),
					attributes: attrs as Record<string, string | number | boolean>,
				})
			} catch {
				// ignore les lignes malformées
			}
			callback()
		},
	})
}
