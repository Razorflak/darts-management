// Server-only — never import this from +page.svelte or +layout.svelte
import { createAuthz } from "@darts-management/db"
import { sql } from "./db"

export const { checkRole, getUserRoles, canPromote } = createAuthz(sql)
