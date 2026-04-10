// Server-only — never import this from +page.svelte or +layout.svelte

import { createAuth } from "@darts-management/db"
import { env } from "$env/dynamic/private"
import { sql } from "./db.js"

export const auth = createAuth(sql, {
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	smtp: {
		host: env.SMTP_HOST ?? "localhost",
		port: Number(env.SMTP_PORT ?? "1025"),
		secure: env.SMTP_SECURE === "true",
		user: env.SMTP_USER || undefined,
		pass: env.SMTP_PASS || undefined,
		from: env.EMAIL_FROM ?? "noreply@ffd.fr",
	},
})
