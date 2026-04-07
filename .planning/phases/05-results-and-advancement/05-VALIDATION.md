---
phase: 5
slug: results-and-advancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/domain/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @darts-management/domain test --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @darts-management/domain test --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | RESULT-01 | unit | `pnpm --filter @darts-management/domain test --run` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | RESULT-01 | unit | `pnpm --filter @darts-management/domain test --run` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | RESULT-02 | unit | `pnpm --filter @darts-management/domain test --run` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | RESULT-03 | integration | `pnpm test` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | RESULT-04 | integration | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/domain/src/tournoi/services/__tests__/result-service.test.ts` — stubs pour RESULT-01, RESULT-02
- [ ] `packages/domain/src/tournoi/services/__tests__/advancement-service.test.ts` — stubs pour RESULT-03, RESULT-04

*Existing vitest infrastructure covers the framework setup — only test stub files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Affichage des scores en temps réel dans PhaseMatchTable | RESULT-01 | Rendu UI SvelteKit difficile à tester en vitest | Saisir un score via l'admin, vérifier que la table se met à jour sans rechargement |
| Avancement visuel du vainqueur dans le bracket | RESULT-03 | Rendu visuel du bracket | Saisir un résultat, vérifier que le prochain slot du bracket affiche le vainqueur |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
