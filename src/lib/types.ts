export interface DockerImage {
  id: string
  name: string
  tag: string
  size: string
  created: number
  layers: string[]
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'stopped' | 'exited'
  ports: string[]
  created: number
  command: string
}

export interface TerminalLine {
  id: string
  type: 'command' | 'output' | 'error' | 'success'
  content: string
  timestamp: number
}

export interface CommandResult {
  success: boolean
  output: string
  error?: string
}

export interface TutorialStep {
  id: string
  title: string
  description: string
  expectedCommand: string | string[]
  hints: string[]
  validation?: (state: { containers: DockerContainer[], images: DockerImage[] }) => boolean
  successMessage: string
}

export interface Tutorial {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  icon: string
  steps: TutorialStep[]
}

export interface TutorialProgress {
  tutorialId: string
  currentStepIndex: number
  completedSteps: string[]
  completed: boolean
  startedAt: number
  completedAt?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement: (data: AchievementCheckData) => boolean
}

export interface AchievementCheckData {
  tutorialProgresses: Record<string, TutorialProgress>
  containers: DockerContainer[]
  images: DockerImage[]
  totalCommandsExecuted: number
}

export interface UnlockedAchievement {
  achievementId: string
  unlockedAt: number
}