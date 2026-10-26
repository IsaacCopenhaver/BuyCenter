---
name: plan-with-me
description: >
  ALWAYS invoke when the user describes a new feature, page,
  or significant change. Do not write code or produce a plan
  without this skill. Use when the user says "build", "create",
  "add", "implement", or describes any non-trivial task.
---

## Steps
1. Interview me relentlessly about every aspect of this task.
   Walk down each branch of the design tree, resolving
   dependencies between decisions one by one.
   If a question can be answered by exploring the codebase,
   explore the codebase instead of asking me.
   For each question, provide your recommended answer.

2. Once we reach shared understanding, produce a plan:
   - Summary of what we agreed on
   - Task breakdown with file paths
   - Blocking relationships between tasks
   - Open questions we deliberately deferred

3. Wait for my approval before writing any code.

---
name: scaffold-component
description: >
  ALWAYS invoke when the user asks to create, scaffold, or
  generate a React component. Do not create components
  directly without this skill.
disable-model-invocation: true
argument-hint: "[ComponentName]"
---

## Steps
1. Read REFERENCE.md for naming conventions and directory map
2. Create directory: src/features/[feature]/components/[ComponentName]/
3. Generate:
   - [ComponentName].tsx — typed props interface, functional component
   - [ComponentName].test.tsx — describe block + placeholder test
   - index.ts — barrel export
4. Default to Server Components. Add 'use client' ONLY if
   useState, useEffect, or event handlers are required
5. Use Tailwind classes from design tokens in REFERENCE.md.
   Do not use arbitrary values
6. Run tsc --noEmit to verify compilation
7. Report: files created, props interface, client/server decision + reason

---
name: css-first
description: >
  ALWAYS invoke when the user asks to style a component, handle
  responsive layout, add animations, or implement any visual behavior.
  Also invoke when reviewing components that use JS for layout concerns.
  Do not write layout/animation/responsive JS without this skill.
---

## CSS-first rules
- container queries over JS/resize-observer breakpoints
- scroll-driven animations over JS scroll listeners
- content-visibility: auto over JS virtualization for lists under 10,000 items
- :has() selector over JS parent-state toggling
- Tailwind classes from design tokens only; no arbitrary values
- Logical properties (margin-inline, padding-block) over physical ones

## Steps
1. Read the component requirements
2. For each visual behavior, check if CSS handles it natively
3. Only reach for JS when CSS genuinely cannot handle the behavior:
   - Drag-and-drop
   - Complex gesture handling
   - Canvas/WebGL rendering
   - Lists exceeding 10,000 items
4. For each CSS solution, include browser support notes
5. Output as component code with styles
6. If reviewing existing code, output as a unified diff