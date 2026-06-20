# RiskJS — Project Context for AI Agents

## What this is
A Preact web clone of the classic Risk board game. Core loop (deploy → attack → fortify), dice combat, the classic 42-territory map, and several optional modes (fog of war, capital mode, portals, blizzards) are implemented. Built for local multiplayer; online multiplayer is a future goal.

## Stack
- **Framework**: Preact + TypeScript (strict)
- **Build**: Vite 5
- **Styles**: SASS CSS Modules (`.module.scss` per component, `src/index.scss` for globals)
- **Tests**: Vitest 2
- **Package manager**: pnpm

## Commands
```bash
pnpm install --ignore-scripts   # restore deps (CI-safe, esbuild binary via optional dep)
pnpm run build                  # tsc + vite build
pnpm run test                   # vitest run
pnpm run lint                   # eslint ./src
pnpm run dev                    # local dev server
```

## Key conventions
- CSS Modules: component styles go in `ComponentName.module.scss`, imported as `styles` and applied via `classnames`
- Global styles (element selectors, CSS variables, fonts) go in `src/index.scss` — **never** in a `.module.scss` file or they will be silently dropped in production
- Mobile breakpoint: `@media (max-width: 640px)`
- SVG troop icons: position with explicit `x`/`y` attributes, not CSS `transform: translate(-50%, -50%)` — unreliable on mobile WebKit
- Preact hooks come from `preact/hooks`, not `react`
- Path alias `@` maps to `/src`

## Key files
| Path | Role |
|------|------|
| `src/controllers/GameController.ts` | Turn logic, attack, deploy, fortify, card handling |
| `src/controllers/GameLogic.ts` | `initState()`, `autoSetupTroops()` |
| `src/controllers/MapController.ts` | BFS pathfinding, adjacency, blizzard checks |
| `src/models/GameState.ts` | Central state shape |
| `src/components/Game.tsx` | Top-level game component, state owner |
| `src/App.tsx` | App shell, new-game / resume flow |
| `src/components/menu/GameOver.tsx` | New-game setup form (also shown on game over) |
| `src/assets/maps/classic/config.json` | Classic Risk map config (territories, adjacency, portals) |

## Git
- Remote: `git@github.com:denis-jasselette/riskjs.git`
- Branch naming: `issue-<number>-<short-slug>`
- Merges: squash only
- CI must pass before merge (GitHub Actions: build + test + lint)

## Lockfile rule
Commit `pnpm-lock.yaml` only when you added new packages (`pnpm add`). If you only ran `pnpm install` to restore existing deps, do not commit it.

## Pre-existing known issue
`react-modal` has a type mismatch with Preact's JSX types. Suppress with `// @ts-ignore` on the `<ReactModal>` JSX line in `GameOver.tsx` — do not try to fix it by changing the import.
