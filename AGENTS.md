# Repository Guidelines

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
