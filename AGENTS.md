# Repository Guidelines

## Purpose: an educational codebase

This repo exists to teach how virtualized lists work. Code here should make the core ideas easy to read and reason about: measuring item sizes, computing the render window from the scroll offset, and standing in for unrendered items with spacers. Readability comes before performance.

When making changes:

- **Prefer the obvious implementation.** A linear scan beats a binary search, a plain re-render beats a memoization layer, unless the simple version is unusably slow for the example app.
- **Accept known flaws** such as flicker, blank areas while scrolling fast, and layout jumps when estimates are off. Document them instead of hiding them behind complex fixes.
- **Keep core logic in small, pure functions** (for example `computeRenderWindow` in `src/NaiveList/render-window.ts`) that can be read and unit-tested apart from React.
- **Comment the why**, especially where React Native behavior is surprising (for example, the final drag offset arriving only in `onScrollEndDrag`).
- **Don't port optimizations from `refs/`** (cell recycling, offset projection, batching, scroll anchoring) unless the task is explicitly to demonstrate that technique, and then do it in a separate, clearly named component instead of complicating an existing one.

## Reference repos (`refs/`)

`refs/` holds git submodules of other list implementations, checked out at their `mdj/index` branches. They are read-only reference material: do not edit them, and do not import from them. Lint, typecheck, Prettier, Jest, Watchman and Metro all ignore `refs/`.

Each one has been indexed for agents. Before exploring a reference repo's source, read its `docs/agents/index.md`. It gives the architecture, an area map and where to look. Then open the area doc for the subsystem you need. Each repo also has its own `AGENTS.md` with build and test commands. The docs were generated from a specific commit. When a doc and the code disagree, trust the code.

| Repo | What it is | Agent index | Area docs | Project health |
|---|---|---|---|---|
| `refs/flash-list` | `@shopify/flash-list` v2: cell recycling, new architecture only | [index.md](refs/flash-list/docs/agents/index.md) | [areas/](refs/flash-list/docs/agents/areas/) | [project-health.md](refs/flash-list/docs/agents/project-health.md) |
| `refs/legend-list` | `@legendapp/list`: pure-TS virtualized list for React Native and React DOM | [index.md](refs/legend-list/docs/agents/index.md) | [areas/](refs/legend-list/docs/agents/areas/) | [project-health.md](refs/legend-list/docs/agents/project-health.md) |
| `refs/react-native` | React Native core; **only the list and virtualization stack is indexed** (`FlatList`, `SectionList`, `VirtualizedList`, viewability, MVCP, `VirtualView`, `VirtualColumn`/`VirtualRow`) | [index.md](refs/react-native/docs/agents/index.md) | [areas/](refs/react-native/docs/agents/areas/) | none |

Area docs by repo:

- **flash-list:** `public-api`, `recycler-core`, `layout-managers`, `scrolling`, `sticky-headers`, `viewability`, `benchmark`
- **legend-list:** `public-api`, `state`, `virtualization`, `scrolling`, `scroll-stability`, `initial-scroll`, `rendering-and-platform`, `integrations`
- **react-native:** `virtualized-list`, `flatlist-sectionlist`, `viewability`, `virtualview`, `virtualcollection`

Each `docs/agents/` folder also has `using.md` (usage and extension), `contributing.md` and, for flash-list and legend-list, `decisions.md`.

If a `refs/` directory is empty, run `git submodule update --init` to check out the submodules.
