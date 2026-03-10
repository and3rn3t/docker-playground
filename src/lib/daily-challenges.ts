import type { DailyChallenge, AchievementCheckData } from './types'

// Seed-based pseudo-random number generator for deterministic daily selection
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function dateSeed(date: string): number {
  let hash = 0
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash + date.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const dailyChallengePool: Omit<DailyChallenge, 'id' | 'date'>[] = [
  {
    title: 'Container Sprint',
    description: 'Run 3 containers from different images',
    objectives: [
      {
        id: 'run-3',
        description: 'Have 3 running containers from different images',
        check: (data: AchievementCheckData) => {
          const running = data.containers.filter((c) => c.status === 'running')
          const uniqueImages = new Set(running.map((c) => c.image))
          return uniqueImages.size >= 3
        },
      },
    ],
  },
  {
    title: 'Image Hunter',
    description: 'Pull 2 new images today',
    objectives: [
      {
        id: 'pull-2',
        description: 'Have at least 5 images in your library',
        check: (data: AchievementCheckData) => data.images.length >= 5,
      },
    ],
  },
  {
    title: 'Clean Machine',
    description: 'Stop all running containers and remove at least one',
    objectives: [
      {
        id: 'no-running',
        description: 'Have no running containers',
        check: (data: AchievementCheckData) =>
          data.containers.length > 0 &&
          data.containers.every((c) => c.status !== 'running'),
      },
    ],
  },
  {
    title: 'Port Explorer',
    description: 'Run 2 containers with different port mappings',
    objectives: [
      {
        id: 'ports',
        description: 'Have 2 running containers with port mappings',
        check: (data: AchievementCheckData) =>
          data.containers.filter((c) => c.status === 'running' && c.ports.length > 0).length >= 2,
      },
    ],
  },
  {
    title: 'Tutorial Time',
    description: 'Make progress on any tutorial',
    objectives: [
      {
        id: 'tutorial-progress',
        description: 'Have at least 1 completed tutorial',
        check: (data: AchievementCheckData) =>
          Object.values(data.tutorialProgresses).some((p) => p.completed),
      },
    ],
  },
  {
    title: 'Command Marathon',
    description: 'Execute 20 commands today',
    objectives: [
      {
        id: 'commands-20',
        description: 'Have executed at least 20 total commands',
        check: (data: AchievementCheckData) => data.totalCommandsExecuted >= 20,
      },
    ],
  },
  {
    title: 'Name Tag',
    description: 'Run containers with custom names',
    objectives: [
      {
        id: 'named-containers',
        description: 'Have 2 containers with custom names',
        check: (data: AchievementCheckData) =>
          data.containers.filter((c) => !c.name.match(/^[a-z]+-[a-z]+$/)).length >= 2,
      },
    ],
  },
]

export function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getDailyChallenge(date?: string): DailyChallenge {
  const dateStr = date ?? getTodayString()
  const rand = seededRandom(dateSeed(dateStr))
  const index = Math.floor(rand() * dailyChallengePool.length)
  const challenge = dailyChallengePool[index]

  return {
    ...challenge,
    id: `daily-${dateStr}`,
    date: dateStr,
  }
}

export function isDailyChallengeComplete(
  challenge: DailyChallenge,
  data: AchievementCheckData
): boolean {
  return challenge.objectives.every((obj) => obj.check(data))
}
