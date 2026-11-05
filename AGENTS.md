# Project rules — every agent must follow them

## UI

1. When changing the UI, including web, mobile, or desktop, update the prototype under `design/` first, then update the real project code, keeping both in sync.
2. Every UI implementation must treat the prototype under `design/` as the single source of truth.
3. For small UI changes and tweaks, update the `design/` prototype and the project source together. For larger UI changes, update the prototype under `design/` first and wait for my confirmation. Only after I confirm it is correct should you change the code to match `design/`.

## Commits

1. Commit messages must follow the standard Git convention, for example `fix: xxxx` or `feat: xxxx`.
2. If the current change is large or spans multiple feature modules, split it into separate commits.
3. Unless told otherwise, commit directly on the current branch. Do not create a new branch. The default branch is `main`.