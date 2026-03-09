# Docker Playground

An interactive web application that **simulates** Docker concepts and CLI commands in the browser. Learn containerization fundamentals through hands-on experimentation — no Docker installation required.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and GitHub Spark.

## Features

- **Interactive Terminal** — Type real Docker commands and see simulated results with syntax highlighting
- **20 Docker Commands** — `run`, `ps`, `images`, `stop`, `start`, `rm`, `rmi`, `pull`, `exec`, `logs`, `inspect`, `rename`, `pause`, `unpause`, `tag`, `history`, `system prune`, and more
- **Container Visualization** — Visual cards showing container status, ports, environment variables, and volumes
- **Image Management** — Browse images, view layers, pull new images, tag and organize
- **6 Guided Tutorials** — From beginner basics to intermediate workflows with step-by-step validation
- **18 Achievements** — Gamification rewards for completing tutorials and mastering commands
- **Persistent State** — Progress, containers, and images survive page refreshes
- **Mobile Responsive** — Fully usable on mobile devices with adaptive layout

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Production build
npm run build
```

## Project Structure

```
src/
├── components/          # Application components
│   ├── ui/              # shadcn/ui primitives (do not modify)
│   ├── Terminal.tsx      # Command terminal with syntax highlighting
│   ├── ContainerCard.tsx # Container visualization card
│   ├── ImageCard.tsx     # Image display with layer details
│   ├── TutorialPanel.tsx # Active tutorial step guide
│   └── ...
├── hooks/               # Custom React hooks
│   ├── use-mobile.ts
│   └── useDockerState.ts # Core state management hook
├── lib/                 # Core logic
│   ├── docker-parser.ts  # Command parser & simulation engine
│   ├── tutorials.ts      # Tutorial definitions
│   ├── achievements.ts   # Achievement definitions & checks
│   ├── types.ts          # Shared TypeScript interfaces
│   └── utils.ts          # Utility functions
└── styles/              # Theme CSS variables
```

## Supported Commands

| Category | Commands |
|----------|----------|
| **Container** | `run`, `ps`, `stop`, `start`, `rm`, `exec`, `logs`, `rename`, `pause`, `unpause` |
| **Image** | `images`, `pull`, `rmi`, `tag`, `history` |
| **System** | `inspect`, `system prune` |
| **Other** | `help`, `clear` |

## Tech Stack

- **React 19** + TypeScript
- **Vite 7** for builds
- **Tailwind CSS v4** with custom theme
- **Radix UI** + shadcn/ui component primitives
- **Framer Motion** for animations
- **Phosphor Icons** for iconography
- **Vitest** for testing (98 tests)
- **GitHub Spark** for persistent state (`useKV`)

## License

See [LICENSE](LICENSE) for details.
