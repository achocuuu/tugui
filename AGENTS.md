# Tugui development instructions

## Direction and scope

### AI-assisted development

- Tugui is an AI-assisted solo indie game. The human developer acts primarily as Game Director, Technical Lead and Playtester. Codex handles substantial implementation, debugging, testing and refactoring, with ChatGPT supporting design and technical decisions.
- Work autonomously within the approved task scope. Make reasonable implementation decisions without requesting approval for every minor detail.
- The developer may handle simple code changes or debugging directly when more efficient. Do not require Codex for trivial edits.
- Keep code understandable, maintainable and testable so the developer can review, modify or debug it when needed.

## Working process

- Work in small, playable, reviewable increments. Prioritize working functionality over extensive documentation.
- Implement, debug and run automated tests autonomously within the approved task scope. Attempt up to two targeted fix-and-test cycles for unresolved failures. If the issue persists, its root cause remains unclear, or resolving it requires significant architectural or environment changes, stop and report the findings. Do not repeatedly retry failed approaches or modify system configuration without approval.
- Automated tests and builds are Codex's responsibility. The developer validates gameplay feel, usability and design through playtesting.
- Report briefly: what changed, tests performed, outstanding issues and how to playtest.
- Maintain `DEVLOG.txt` at the repository root. Append a timestamped entry of one or two lines per meaningful completed task, summarizing the result and validation status. Avoid verbose logs or recording individual commands.
- Explain technical details when requested or when an important architectural decision requires review.
- Ask for decisions when requirements materially affect gameplay, architecture, scope or dependencies. Do not invent major features.
- Never claim completion without appropriate validation. Clearly identify anything untested or blocked.
- Preserve existing Git and safety restrictions.

## Architecture
- Keep deterministic gameplay simulation in plain JavaScript, independent of Phaser, Canvas, and the DOM.
- Use Phaser for scenes, rendering, interpolation, input, audio, and scaling. Rendering and camera interpolation must never alter logical gameplay state.
- Prefer the simplest solution for the current milestone. Do not add physics engines, ECS, backends, databases, custom editors, or unnecessary abstractions.

## Gameplay invariants
- Tugi moves automatically between tile centers. Left/right turns change direction by 90 degrees.
- For each approaching tile, accept only the first new turn input; ignore subsequent input until the next tile. Inputs after a tile center apply to the following tile.
- Turning must never reset or delay automatic movement. Speed is a configurable difficulty variable.
- Tile buttons initially progress `raised → flat → hole`; entering an existing hole causes failure.

## Working process
- Work in small, reviewable increments. Explain each change's objective, affected files, and how to test it.
- Run relevant tests and report results and failures honestly. Validate gameplay invariants with deterministic simulation tests and browser behavior with appropriate manual checks.
- Never claim a feature is complete without appropriate validation; clearly state anything untested or blocked.

## Git and safety
- GitHub is the canonical source repository. Preserve rollback points and existing work.
- Do not commit, push, merge, rebase, reset, delete branches, or perform destructive Git operations without explicit authorization.
- Do not change files outside this repository.
- Do not install dependencies or request network access without approval.
