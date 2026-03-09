# Contributing to Docker Playground

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` (Vite default).

## Project Structure

| Path | Purpose |
|------|---------|
| `src/components/` | Application components (Terminal, ContainerCard, etc.) |
| `src/components/ui/` | shadcn/ui primitives — **do not modify** |
| `src/lib/docker-parser.ts` | Command parser — all state mutations flow through here |
| `src/lib/tutorials.ts` | Tutorial step definitions |
| `src/lib/achievements.ts` | Achievement definitions and unlock logic |
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/hooks/` | Custom React hooks |

## Key Conventions

- **Icons**: Use `@phosphor-icons/react` only
- **Styling**: Tailwind CSS v4 + `cn()` from `@/lib/utils`
- **State**: `useKV` for persistent, `useState` for ephemeral
- **Imports**: Use the `@/` path alias for `src/`
- **Animations**: Framer Motion, durations < 400ms

## Adding a Docker Command

1. Add a `case` in the `switch` block in `parseCommand()` (`src/lib/docker-parser.ts`)
2. Create a `handleXxx()` function
3. Update `getHelpText()`
4. Return a `CommandResult`

## Adding a Tutorial

1. Add a `Tutorial` object to the array in `src/lib/tutorials.ts`
2. Each step needs: `id`, `title`, `description`, `expectedCommand`, `hints`, `successMessage`
3. Optionally add a `validation` function for state checks
4. Add a matching achievement in `src/lib/achievements.ts` if desired

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
