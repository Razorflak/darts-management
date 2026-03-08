# Summary quick-5

**Task:** Sidebar admin — lien rouge "Quitter l'administration"
**Date:** 2026-03-08
**Commit:** 419e85f

## What was done

- Added a red "Quitter l'administration" link at the bottom of the admin sidebar (desktop + mobile)
- Desktop: separated by border-t, icon-only when collapsed, `text-red-400` / `hover:bg-red-900/40`
- Mobile: same styling in the dropdown menu with separator
- Icon: logout arrow SVG inline
- Links to `/` (app homepage)
- `pnpm typecheck` passes
