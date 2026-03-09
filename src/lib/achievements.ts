import { Achievement } from './types'

export const achievements: Achievement[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first tutorial',
    icon: 'rocket',
    rarity: 'common',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some(p => p.completed)
    }
  },
  {
    id: 'docker-novice',
    title: 'Docker Novice',
    description: 'Complete the "Getting Started" tutorial',
    icon: 'graduation-cap',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['getting-started']?.completed === true
    }
  },
  {
    id: 'container-master',
    title: 'Container Master',
    description: 'Complete the "Managing Multiple Containers" tutorial',
    icon: 'cube',
    rarity: 'common',
    requirement: (data) => {
      return data.tutorialProgresses['multi-container']?.completed === true
    }
  },
  {
    id: 'lifecycle-expert',
    title: 'Lifecycle Expert',
    description: 'Complete the "Container Lifecycle Management" tutorial',
    icon: 'arrows-clockwise',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['container-lifecycle']?.completed === true
    }
  },
  {
    id: 'advanced-operator',
    title: 'Advanced Operator',
    description: 'Complete the "Advanced Container Operations" tutorial',
    icon: 'gear',
    rarity: 'rare',
    requirement: (data) => {
      return data.tutorialProgresses['advanced-operations']?.completed === true
    }
  },
  {
    id: 'dedicated-learner',
    title: 'Dedicated Learner',
    description: 'Complete 3 tutorials',
    icon: 'book-open',
    rarity: 'rare',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).filter(p => p.completed).length >= 3
    }
  },
  {
    id: 'docker-scholar',
    title: 'Docker Scholar',
    description: 'Complete all available tutorials',
    icon: 'trophy',
    rarity: 'epic',
    requirement: (data) => {
      const allTutorialIds = ['getting-started', 'multi-container', 'container-lifecycle', 'advanced-operations']
      return allTutorialIds.every(id => data.tutorialProgresses[id]?.completed === true)
    }
  },
  {
    id: 'command-explorer',
    title: 'Command Explorer',
    description: 'Execute 50 Docker commands',
    icon: 'terminal',
    rarity: 'common',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 50
    }
  },
  {
    id: 'command-veteran',
    title: 'Command Veteran',
    description: 'Execute 200 Docker commands',
    icon: 'terminal-window',
    rarity: 'rare',
    requirement: (data) => {
      return data.totalCommandsExecuted >= 200
    }
  },
  {
    id: 'marathon-runner',
    title: 'Marathon Runner',
    description: 'Run 10 containers simultaneously',
    icon: 'lightning',
    rarity: 'epic',
    requirement: (data) => {
      return data.containers.filter(c => c.status === 'running').length >= 10
    }
  },
  {
    id: 'image-collector',
    title: 'Image Collector',
    description: 'Have 10 different Docker images',
    icon: 'stack',
    rarity: 'rare',
    requirement: (data) => {
      return data.images.length >= 10
    }
  },
  {
    id: 'speed-learner',
    title: 'Speed Learner',
    description: 'Complete a tutorial in under 5 minutes',
    icon: 'timer',
    rarity: 'epic',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some(p => {
        if (!p.completed || !p.completedAt) return false
        const duration = p.completedAt - p.startedAt
        return duration < 5 * 60 * 1000
      })
    }
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete a tutorial without any wrong commands',
    icon: 'seal-check',
    rarity: 'legendary',
    requirement: (data) => {
      return Object.values(data.tutorialProgresses).some(p => p.completed)
    }
  },
  {
    id: 'clean-slate',
    title: 'Clean Slate',
    description: 'Remove all containers and images at once',
    icon: 'broom',
    rarity: 'rare',
    requirement: (data) => {
      return data.containers.length === 0 && data.images.length === 0
    }
  }
]

export function checkAchievements(
  currentUnlocked: string[],
  data: {
    tutorialProgresses: Record<string, any>
    containers: any[]
    images: any[]
    totalCommandsExecuted: number
  }
): string[] {
  const newUnlocked: string[] = []
  
  for (const achievement of achievements) {
    if (!currentUnlocked.includes(achievement.id) && achievement.requirement(data)) {
      newUnlocked.push(achievement.id)
    }
  }
  
  return newUnlocked
}

export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find(a => a.id === id)
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
