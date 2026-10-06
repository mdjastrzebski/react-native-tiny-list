# Repository Guidelines

## Purpose: an educational codebase

This repo exists to teach how virtualized lists work. Code here should make the core ideas easy to read and reason about: measuring item sizes, computing the render window from the scroll offset, and standing in for unrendered items with spacers. Good performance is still welcome, but never at the cost of code a reader can't follow.

When making changes:

- **Use good algorithms and structure, behind clear names.** Prefer binary search over a linear scan, cached offsets over recomputing them, and reasonable memoization over needless re-renders. Extract each technique into a small, well-named function (for example `findFirstItemAfterOffset`) so the calling code still reads as a description of the idea.
- **Keep core logic in small, pure functions** (for example `computeRenderWindow` in `src/TinyList/render-window.ts`) that can be read and unit-tested apart from React.
- **Add concise comments that guide the reader through the main flow.** Someone reading only the comments should be able to follow what the code does, step by step. For each meaningful block, answer whichever of these isn't obvious from the code:
  - **What?** What this block does, in plain words (for example, "Find the first item visible below the scroll offset").
  - **Why?** Why it is needed or done this way (for example, why a spacer stands in for unrendered items).
  - **How?** For algorithms, how it works, with one short comment per step (for example, each step of the render-window loop).

  Always explain surprising React Native behavior (for example, the final drag offset arriving only in `onScrollEndDrag`). Keep each comment to a line or two and don't restate what the code already says clearly: long or redundant comments hurt readability as much as missing ones.
- **Don't trade clarity for small wins.** Skip micro-optimizations and clever tricks that make the code harder to follow for little gain. Known flaws such as flicker or blank areas while scrolling fast are acceptable when fixing them would obscure the core idea; document them instead.
- **Name things after the library being modelled.** When a component follows a real library (see `refs/`), reuse its class, type, function and prop names (for example `RecyclerViewManager`, `RenderStackManager`, `getItemType`), so a reader can find the same pieces in the real source afterwards. Mention the real name in the doc comment when a name has to differ.
- **Put large techniques in their own component.** Machinery such as cell recycling, velocity-based offset projection or scroll anchoring (see `refs/`) belongs in a separate, clearly named component, not bolted onto an existing simpler one.

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
