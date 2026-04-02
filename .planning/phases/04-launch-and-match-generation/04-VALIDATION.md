---
phase: 4
slug: launch-and-match-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `packages/domain/vitest.config.ts` / `packages/db/vitest.config.ts` |
| **Quick run command** | `pnpm test --filter @darts-management/domain` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --filter @darts-management/domain`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | LAUNCH-01 | unit | `pnpm test --filter @darts-management/domain` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | LAUNCH-02 | unit | `pnpm test --filter @darts-management/domain` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | LAUNCH-03 | unit | `pnpm test --filter @darts-management/domain` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 2 | LAUNCH-04 | integration | `pnpm test --filter @darts-management/db` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 2 | LAUNCH-05 | integration | `pnpm test --filter @darts-management/db` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/domain/src/tournoi/services/__tests__/match-generation.test.ts` — stubs pour LAUNCH-01, LAUNCH-02, LAUNCH-03
- [ ] `packages/db/src/repositories/__tests__/launch-repository.test.ts` — stubs pour LAUNCH-04, LAUNCH-05

*Si aucun : "L'infrastructure existante couvre toutes les exigences de phase."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Atomic rollback si échec génération | LAUNCH-03 | Nécessite une injection de panne DB en cours de transaction | 1. Déclencher un lancement avec une équipe invalide intercalée. 2. Vérifier qu'aucun match n'est créé dans la DB. |
| Attribution d'arbitre sans conflit | LAUNCH-05 | Dépend des données de joueurs enregistrés en base | 1. Enregistrer 10 équipes. 2. Activer arbitrage. 3. Lancer et vérifier que chaque match a un arbitre ≠ des joueurs du match. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
