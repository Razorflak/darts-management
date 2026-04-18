import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions"

const endpoint =
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS ?? ""

const sdk = new NodeSDK({
	resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "darts-management" }),
	traceExporter: new OTLPTraceExporter({
		url: `${endpoint}/v1/traces`,
		headers: { Authorization: headers },
	}),
	logRecordProcessors: [
		new BatchLogRecordProcessor(
			new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
		),
	],
})

sdk.start()

process.on("SIGTERM", () => {
	sdk.shutdown().catch(console.error)
})
