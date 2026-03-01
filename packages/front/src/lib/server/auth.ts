// Server-only — never import this from +page.svelte or +layout.svelte
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} from "$env/static/private"
import { createAuth } from "@darts-management/db"
import { sql } from "./db.js"

export const auth = createAuth(sql, {
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  smtp: {
    host: SMTP_HOST ?? "localhost",
    port: Number(SMTP_PORT ?? "1025"),
    secure: SMTP_SECURE === "true",
    user: SMTP_USER || undefined,
    pass: SMTP_PASS || undefined,
    from: EMAIL_FROM ?? "noreply@ffd.fr",
  },
})
