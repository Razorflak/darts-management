// Server-only — never import this from +page.svelte or +layout.svelte
import { DATABASE_URL } from "$env/static/private"
import { createSql } from "@darts-management/db"

export const sql = createSql(DATABASE_URL)
