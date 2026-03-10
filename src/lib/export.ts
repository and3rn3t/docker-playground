import type { TerminalLine, DockerContainer, DockerImage, DockerNetwork, TutorialProgress, UnlockedAchievement, SavedDockerfile } from '@/lib/types'
import { getAchievementById } from '@/lib/achievements'

// ── Terminal History Export ────────────────────────────────────────

export function exportTerminalAsText(lines: TerminalLine[]): string {
  return lines
    .map((line) => {
      switch (line.type) {
        case 'command':
          return `$ ${line.content}`
        case 'error':
          return `ERROR: ${line.content}`
        case 'success':
          return line.content
        default:
          return line.content
      }
    })
    .join('\n')
}

export function exportTerminalAsMarkdown(lines: TerminalLine[]): string {
  const header = '# Docker Playground — Terminal History\n\n'
  const timestamp = `_Exported on ${new Date().toLocaleString()}_\n\n`
  const body = lines
    .map((line) => {
      switch (line.type) {
        case 'command':
          return '```\n$ ' + line.content + '\n```'
        case 'error':
          return `> **Error:** ${line.content}`
        case 'success':
          return `**${line.content}**`
        default:
          return line.content
      }
    })
    .join('\n\n')

  return header + timestamp + body
}

// ── Dockerfile / Compose File Download ─────────────────────────────

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadDockerfile(dockerfile: SavedDockerfile) {
  downloadFile(dockerfile.name || 'Dockerfile', dockerfile.content, 'text/plain')
}

export function downloadComposeFile(content: string, filename = 'docker-compose.yml') {
  downloadFile(filename, content, 'text/yaml')
}

export function downloadTerminalHistory(lines: TerminalLine[], format: 'text' | 'markdown') {
  if (format === 'markdown') {
    downloadFile('terminal-history.md', exportTerminalAsMarkdown(lines), 'text/markdown')
  } else {
    downloadFile('terminal-history.txt', exportTerminalAsText(lines), 'text/plain')
  }
}

// ── State Snapshot (Export / Import) ──────────────────────────────

export interface PlaygroundSnapshot {
  version: 1
  exportedAt: number
  containers: DockerContainer[]
  images: DockerImage[]
  networks: DockerNetwork[]
  tutorialProgresses: Record<string, TutorialProgress>
  unlockedAchievements: UnlockedAchievement[]
  totalCommandsExecuted: number
  savedDockerfiles: SavedDockerfile[]
}

export function createSnapshot(data: {
  containers: DockerContainer[]
  images: DockerImage[]
  networks: DockerNetwork[]
  tutorialProgresses: Record<string, TutorialProgress>
  unlockedAchievements: UnlockedAchievement[]
  totalCommandsExecuted: number
  savedDockerfiles: SavedDockerfile[]
}): PlaygroundSnapshot {
  return {
    version: 1,
    exportedAt: Date.now(),
    ...data,
  }
}

export function downloadSnapshot(snapshot: PlaygroundSnapshot) {
  downloadFile(
    'docker-playground-snapshot.json',
    JSON.stringify(snapshot, null, 2),
    'application/json',
  )
}

export function parseSnapshot(json: string): { success: true; snapshot: PlaygroundSnapshot } | { success: false; error: string } {
  try {
    const data = JSON.parse(json)
    if (data.version !== 1 || !Array.isArray(data.containers) || !Array.isArray(data.images)) {
      return { success: false, error: 'Invalid snapshot format' }
    }
    return { success: true, snapshot: data as PlaygroundSnapshot }
  } catch {
    return { success: false, error: 'Invalid JSON' }
  }
}

// ── Progress Summary ──────────────────────────────────────────────

export function generateProgressSummary(data: {
  tutorialProgresses: Record<string, TutorialProgress>
  unlockedAchievements: UnlockedAchievement[]
  totalCommandsExecuted: number
}) {
  const completed = Object.values(data.tutorialProgresses).filter((p) => p.completed).length
  const total = Object.keys(data.tutorialProgresses).length

  const achievementLines = data.unlockedAchievements.map((ua) => {
    const a = getAchievementById(ua.achievementId)
    return a ? `- ${a.title} (${a.rarity})` : `- ${ua.achievementId}`
  })

  return [
    '# Docker Playground — Progress Summary',
    '',
    `_Generated on ${new Date().toLocaleString()}_`,
    '',
    `## Stats`,
    `- Tutorials completed: ${completed} / ${total}`,
    `- Achievements unlocked: ${data.unlockedAchievements.length}`,
    `- Commands executed: ${data.totalCommandsExecuted}`,
    '',
    `## Achievements`,
    ...achievementLines,
  ].join('\n')
}

// ── Copy to Clipboard ─────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
