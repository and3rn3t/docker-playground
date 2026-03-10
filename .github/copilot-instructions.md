# Copilot Instructions — Docker Playground

## Project Overview

Docker Playground is an interactive web application that **simulates** Docker concepts and CLI commands in the browser. It does NOT run real Docker — it parses commands and updates in-memory state to teach users containerization fundamentals. Built with React 19, TypeScript, Vite, Tailwind CSS v4, and GitHub Spark.

## Architecture

- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS v4 with custom theme (theme.json → CSS variables)
- **UI Components**: Radix UI primitives + shadcn/ui pattern (`src/components/ui/`)
- **State**: `useLocalStorageState` hook for persistent state, React `useState` for ephemeral state
- **Animation**: Framer Motion
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Path alias**: `@/` maps to `src/`

## Key Directories

| Path | Purpose |
|------|---------|
| `src/components/` | Application-specific components (Terminal, ContainerCard, etc.) |
| `src/components/ui/` | Reusable shadcn/ui primitives — avoid modifying directly |
| `src/lib/` | Core logic: Docker command parser, tutorials, achievements, types |
| `src/hooks/` | Custom React hooks |
| `src/styles/` | Theme CSS variables |

## Core Domain Concepts

- **DockerContainer**: Simulated container with id, name, image, status (running/stopped/exited), ports
- **DockerImage**: Simulated image with id, name, tag, size, layers
- **TerminalLine**: A line of terminal output (command, output, error, or success)
- **Tutorial / TutorialStep**: Guided learning paths with command validation and hints
- **Achievement**: Gamification rewards unlocked by completing tutorials or executing commands

## Command Parser (`src/lib/docker-parser.ts`)

The command parser is the heart of the simulation. It:
1. Parses user input into Docker command + subcommand + flags
2. Validates against simulated state
3. Returns a `CommandResult` with success/failure and output text
4. Calls `updateState` to mutate containers/images arrays

Supported commands: `docker run`, `docker ps`, `docker images`, `docker stop`, `docker start`, `docker rm`, `docker rmi`, `docker pull`, `docker exec`, `docker logs`, `docker inspect`, `help`, `clear`.

## Coding Conventions

- Use TypeScript strict mode; prefer explicit types over `any`
- Use `@/` path alias for imports from `src/`
- Use Phosphor Icons (`@phosphor-icons/react`), not Lucide or Heroicons directly
- Use `cn()` from `@/lib/utils` to merge Tailwind classes
- Use Framer Motion `<motion.div>` for animations; keep durations under 400ms
- Use `sonner` for toast notifications
- Terminal output formatting: use monospace font, respect the TerminalLine type discriminator
- All simulated Docker data must go through the parser — never mutate containers/images directly from UI

## State Management

- **Persistent state** (survives refresh): Use `useLocalStorageState<T>(key, defaultValue)` from `@/hooks/useLocalStorageState`
- **Ephemeral state** (session only): Use React `useState`
- Key KV keys: `docker-containers`, `docker-images`, `tutorial-progresses`, `active-tutorial`, `unlocked-achievements`, `total-commands-executed`

## Adding New Docker Commands

1. Add a new case in the `switch` block in `parseCommand()` in `docker-parser.ts`
2. Create a `handleXxx()` function following the existing pattern
3. Update `getHelpText()` to document the new command
4. Add relevant `CommandResult` return values
5. If the command changes state, call `updateState()` with updated containers/images

## Adding New Tutorials

1. Add a new `Tutorial` object to the `tutorials` array in `src/lib/tutorials.ts`
2. Each step needs: `id`, `title`, `description`, `expectedCommand`, `hints`, `successMessage`
3. Optionally add `validation` function for state-based validation
4. Update achievement IDs if the tutorial should unlock an achievement

## UI Components

- **Do not modify** files in `src/components/ui/` — these are shadcn/ui primitives
- Application components live in `src/components/` and compose UI primitives
- Use `Card`, `Button`, `Dialog`, `Tabs` etc. from the UI library
- Keep components focused; extract hooks to `src/hooks/` when logic is reusable

## Testing Guidance

- The app is a simulation — test by verifying command parser output and state transitions
- Focus on edge cases: invalid commands, duplicate container names, port conflicts, missing images
- Tutorial validation functions should be tested with mock state objects

## Security Notes

- This is a client-side simulation; no real Docker daemon is involved
- User input goes through the command parser — ensure it handles malicious/unexpected input gracefully
- No server-side execution; all state is local (KV store)
