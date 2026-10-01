---
name: react-composition
description: Build or refactor React components, hooks, and state in this starter. Use for React architecture and rendering issues.
---

# React Composition

Read the installed React and framework versions first. Favor explicit component variants and composition through children over many boolean flags. Keep state near its owner, split context values when subscriptions differ, and use effects for external synchronization rather than derived values.

Do not introduce memoization everywhere. Measure actual rerender costs. Keep browser globals out of server rendering. Effects must clean up timers, observers, subscriptions, and event listeners. Use accessible native elements. Keep framework routing in router-adapter.tsx so navigation and transition components remain portable.

Use React 19 ref-as-prop support where installed types permit it. A callback ref must return nothing or a cleanup, not the assigned node. Read https://react.dev/reference/react for current APIs.

Adapted from the fleet's React composition and architecture guidance.
