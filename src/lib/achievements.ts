import { Achievement, AchievementCheckData } from './types'

export const achievements: Achievement[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first tutorial',
    icon: 'rocket',
    rarity: 'common',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some((p) => p.completed)
    },
  },
  {
    id: 'docker-novice',
    title: 'Docker Novice',
    description: 'Complete the "Getting Started" tutorial',
    icon: 'graduation-cap',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['getting-started']?.completed === true
    },
  },
  {
    id: 'container-master',
    title: 'Container Master',
    description: 'Complete the "Managing Multiple Containers" tutorial',
    icon: 'cube',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['multi-container']?.completed === true
    },
  },
  {
    id: 'lifecycle-expert',
    title: 'Lifecycle Expert',
    description: 'Complete the "Container Lifecycle Management" tutorial',
    icon: 'arrows-clockwise',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['container-lifecycle']?.completed === true
    },
  },
  {
    id: 'advanced-operator',
    title: 'Advanced Operator',
    description: 'Complete the "Advanced Container Operations" tutorial',
    icon: 'gear',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['advanced-operations']?.completed === true
    },
  },
  {
    id: 'dedicated-learner',
    title: 'Dedicated Learner',
    description: 'Complete 3 tutorials',
    icon: 'book-open',
    rarity: 'rare',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).filter((p) => p.completed).length >= 3
    },
    progress: (data) => {
      const current = Object.values(data.tutorialProgresses).filter((p) => p.completed).length
      return { current, target: 3 }
    },
  },
  {
    id: 'docker-scholar',
    title: 'Docker Scholar',
    description: 'Complete all available tutorials',
    icon: 'trophy',
    rarity: 'epic',
    requirement: (data) => {
      const allTutorialIds = [
        'getting-started',
        'multi-container',
        'container-lifecycle',
        'advanced-operations',
        'image-tagging',
        'cleanup-workflows',
        'docker-networking',
        'volumes-deep-dive',
        'container-debugging',
        'port-mapping',
        'env-vars-config',
        'dockerfile-basics',
        'compose-quickstart',
        'advanced-networking',
        'image-management',
      ]
      return allTutorialIds.every((id) => data.tutorialProgresses[id]?.completed === true)
    },
    progress: (data) => {
      const allTutorialIds = [
        'getting-started',
        'multi-container',
        'container-lifecycle',
        'advanced-operations',
        'image-tagging',
        'cleanup-workflows',
        'docker-networking',
        'volumes-deep-dive',
        'container-debugging',
        'port-mapping',
        'env-vars-config',
        'dockerfile-basics',
        'compose-quickstart',
        'advanced-networking',
        'image-management',
      ]

      const current = allTutorialIds.filter(
        (id) => data.tutorialProgresses[id]?.completed === true
      ).length
      return { current, target: allTutorialIds.length }
    },
  },
  {
    id: 'command-explorer',
    title: 'Command Explorer',
    description: 'Execute 50 Docker commands',
    icon: 'terminal',
    rarity: 'common',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 50
    },
    progress: (data) => {
      return { current: Math.min(data.totalCommandsExecuted, 50), target: 50 }
    },
  },
  {
    id: 'command-veteran',
    title: 'Command Veteran',
    description: 'Execute 200 Docker commands',
    icon: 'terminal-window',
    rarity: 'rare',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 200
    },
    progress: (data) => {
      return { current: Math.min(data.totalCommandsExecuted, 200), target: 200 }
    },
  },
  {
    id: 'marathon-runner',
    title: 'Marathon Runner',
    description: 'Run 10 containers simultaneously',
    icon: 'lightning',
    rarity: 'epic',
    requirement: (data) => {
      return data.containers.filter((c) => c.status === 'running').length >= 10
    },
    progress: (data) => {
      const current = data.containers.filter((c) => c.status === 'running').length
      return { current: Math.min(current, 10), target: 10 }
    },
  },
  {
    id: 'image-collector',
    title: 'Image Collector',
    description: 'Have 10 different Docker images',
    icon: 'stack',
    rarity: 'rare',
    requirement: (data) => {
      return data.images.length >= 10
    },
    progress: (data) => {
      return { current: Math.min(data.images.length, 10), target: 10 }
    },
  },
  {
    id: 'speed-learner',
    title: 'Speed Learner',
    description: 'Complete a tutorial in under 5 minutes',
    icon: 'timer',
    rarity: 'epic',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some((p) => {
        if (!p.completed || !p.completedAt) return false
        const duration = p.completedAt - p.startedAt
        return duration < 5 * 60 * 1000
      })
    },
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete a tutorial without any wrong commands',
    icon: 'seal-check',
    rarity: 'legendary',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some(
        (p) => p.completed && p.wrongCommandCount === 0
      )
    },
  },
  {
    id: 'clean-slate',
    title: 'Clean Slate',
    description: 'Remove all containers and images at once',
    icon: 'broom',
    rarity: 'rare',
    requirement: (data) => {
      return data.containers.length === 0 && data.images.length === 0
    },
  },
  {
    id: 'tag-master',
    title: 'Tag Master',
    description: 'Complete the "Image Tagging & Organization" tutorial',
    icon: 'tag',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['image-tagging']?.completed === true
    },
  },
  {
    id: 'tidy-operator',
    title: 'Tidy Operator',
    description: 'Complete the "System Cleanup & Maintenance" tutorial',
    icon: 'broom',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['cleanup-workflows']?.completed === true
    },
  },
  {
    id: 'freeze-frame',
    title: 'Freeze Frame',
    description: 'Pause and unpause a container',
    icon: 'pause',
    rarity: 'common',
    requirement: (data) => {
      return data.containers.some((c) => c.status === 'paused')
    },
  },
  {
    id: 'name-game',
    title: 'Name Game',
    description: 'Rename a container using docker rename',
    icon: 'pencil',
    rarity: 'common',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 10
    },
  },
  {
    id: 'network-engineer',
    title: 'Network Engineer',
    description: 'Complete the "Docker Networking" tutorial',
    icon: 'graph',
    rarity: 'epic',
    requirement: (data) => {
      return data.tutorialProgresses['docker-networking']?.completed === true
    },
  },
  {
    id: 'volume-virtuoso',
    title: 'Volume Virtuoso',
    description: 'Complete the "Docker Volumes Deep-Dive" tutorial',
    icon: 'database',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['volumes-deep-dive']?.completed === true
    },
  },
  {
    id: 'bug-hunter',
    title: 'Bug Hunter',
    description: 'Complete the "Container Debugging" tutorial',
    icon: 'bug',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['container-debugging']?.completed === true
    },
  },
  {
    id: 'port-master',
    title: 'Port Master',
    description: 'Complete the "Port Mapping Mastery" tutorial',
    icon: 'plug',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['port-mapping']?.completed === true
    },
  },
  {
    id: 'config-wizard',
    title: 'Config Wizard',
    description: 'Complete the "Environment Variables & Config" tutorial',
    icon: 'gear',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['env-vars-config']?.completed === true
    },
  },
  {
    id: 'snapshot-artist',
    title: 'Snapshot Artist',
    description: 'Create an image from a running container using docker commit',
    icon: 'camera',
    rarity: 'rare',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 10 && data.images.length >= 5
    },
  },
  {
    id: 'halfway-there',
    title: 'Halfway There',
    description: 'Complete 8 tutorials',
    icon: 'star-half',
    rarity: 'rare',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).filter((p) => p.completed).length >= 8
    },
    progress: (data) => {
      const current = Object.values(data.tutorialProgresses).filter((p) => p.completed).length
      return { current, target: 8 }
    },
  },
  // Tiered command achievements
  {
    id: 'command-bronze',
    title: 'Command Apprentice',
    description: 'Execute 25 Docker commands',
    icon: 'terminal',
    rarity: 'common',
    tier: 'bronze',
    requirement: (data) => data.totalCommandsExecuted >= 25,
    progress: (data) => ({ current: Math.min(data.totalCommandsExecuted, 25), target: 25 }),
  },
  {
    id: 'command-silver',
    title: 'Command Specialist',
    description: 'Execute 100 Docker commands',
    icon: 'terminal',
    rarity: 'rare',
    tier: 'silver',
    requirement: (data) => data.totalCommandsExecuted >= 100,
    progress: (data) => ({ current: Math.min(data.totalCommandsExecuted, 100), target: 100 }),
  },
  {
    id: 'command-gold',
    title: 'Command Master',
    description: 'Execute 500 Docker commands',
    icon: 'terminal',
    rarity: 'epic',
    tier: 'gold',
    requirement: (data) => data.totalCommandsExecuted >= 500,
    progress: (data) => ({ current: Math.min(data.totalCommandsExecuted, 500), target: 500 }),
  },
  // Tiered container achievements
  {
    id: 'container-bronze',
    title: 'Container Novice',
    description: 'Run 3 containers simultaneously',
    icon: 'cube',
    rarity: 'common',
    tier: 'bronze',
    requirement: (data) => data.containers.filter((c) => c.status === 'running').length >= 3,
    progress: (data) => ({
      current: Math.min(data.containers.filter((c) => c.status === 'running').length, 3),
      target: 3,
    }),
  },
  {
    id: 'container-silver',
    title: 'Container Wrangler',
    description: 'Run 5 containers simultaneously',
    icon: 'cube',
    rarity: 'rare',
    tier: 'silver',
    requirement: (data) => data.containers.filter((c) => c.status === 'running').length >= 5,
    progress: (data) => ({
      current: Math.min(data.containers.filter((c) => c.status === 'running').length, 5),
      target: 5,
    }),
  },
  {
    id: 'container-gold',
    title: 'Container Orchestrator',
    description: 'Run 15 containers simultaneously',
    icon: 'cube',
    rarity: 'legendary',
    tier: 'gold',
    requirement: (data) => data.containers.filter((c) => c.status === 'running').length >= 15,
    progress: (data) => ({
      current: Math.min(data.containers.filter((c) => c.status === 'running').length, 15),
      target: 15,
    }),
  },
  // Tiered tutorial achievements
  {
    id: 'tutorial-bronze',
    title: 'Quick Study',
    description: 'Complete 2 tutorials',
    icon: 'book-open',
    rarity: 'common',
    tier: 'bronze',
    requirement: (data) => Object.values(data.tutorialProgresses).filter((p) => p.completed).length >= 2,
    progress: (data) => ({
      current: Object.values(data.tutorialProgresses).filter((p) => p.completed).length,
      target: 2,
    }),
  },
  {
    id: 'tutorial-silver',
    title: 'Studious Learner',
    description: 'Complete 5 tutorials',
    icon: 'book-open',
    rarity: 'rare',
    tier: 'silver',
    requirement: (data) => Object.values(data.tutorialProgresses).filter((p) => p.completed).length >= 5,
    progress: (data) => ({
      current: Object.values(data.tutorialProgresses).filter((p) => p.completed).length,
      target: 5,
    }),
  },
  {
    id: 'tutorial-gold',
    title: 'Docker Professor',
    description: 'Complete 12 tutorials',
    icon: 'book-open',
    rarity: 'epic',
    tier: 'gold',
    requirement: (data) => Object.values(data.tutorialProgresses).filter((p) => p.completed).length >= 12,
    progress: (data) => ({
      current: Object.values(data.tutorialProgresses).filter((p) => p.completed).length,
      target: 12,
    }),
  },
  // Tiered image achievements
  {
    id: 'image-bronze',
    title: 'Image Apprentice',
    description: 'Have 5 Docker images',
    icon: 'stack',
    rarity: 'common',
    tier: 'bronze',
    requirement: (data) => data.images.length >= 5,
    progress: (data) => ({ current: Math.min(data.images.length, 5), target: 5 }),
  },
  {
    id: 'image-silver',
    title: 'Image Curator',
    description: 'Have 15 Docker images',
    icon: 'stack',
    rarity: 'rare',
    tier: 'silver',
    requirement: (data) => data.images.length >= 15,
    progress: (data) => ({ current: Math.min(data.images.length, 15), target: 15 }),
  },
  {
    id: 'image-gold',
    title: 'Image Hoarder',
    description: 'Have 25 Docker images',
    icon: 'stack',
    rarity: 'epic',
    tier: 'gold',
    requirement: (data) => data.images.length >= 25,
    progress: (data) => ({ current: Math.min(data.images.length, 25), target: 25 }),
  },
]

export function checkAchievements(currentUnlocked: string[], data: AchievementCheckData): string[] {
  const newUnlocked: string[] = []

  for (const achievement of achievements) {
    if (!currentUnlocked.includes(achievement.id) && achievement.requirement(data)) {
      newUnlocked.push(achievement.id)
    }
  }

  return newUnlocked
}

export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id)
}

export function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'text-muted-foreground'
    case 'rare':
      return 'text-primary'
    case 'epic':
      return 'text-secondary'
    case 'legendary':
      return 'text-accent'
    default:
      return 'text-muted-foreground'
  }
}

export function getRarityGlow(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common':
      return ''
    case 'rare':
      return 'glow-primary'
    case 'epic':
      return 'glow-primary'
    case 'legendary':
      return 'glow-accent'
    default:
      return ''
  }
}

export function getTierColor(tier?: Achievement['tier']): string {
  switch (tier) {
    case 'bronze':
      return 'text-orange-400'
    case 'silver':
      return 'text-slate-300'
    case 'gold':
      return 'text-yellow-400'
    default:
      return ''
  }
}

export function getTierLabel(tier?: Achievement['tier']): string {
  switch (tier) {
    case 'bronze':
      return '🥉'
    case 'silver':
      return '🥈'
    case 'gold':
      return '🥇'
    default:
      return ''
  }
}
