import type { DockerContainer, DockerImage } from './types'

export interface Challenge {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit: number // seconds
  icon: string
  objectives: ChallengeObjective[]
  hints: string[]
}

export interface ChallengeObjective {
  id: string
  description: string
  check: (state: { containers: DockerContainer[]; images: DockerImage[] }) => boolean
}

export interface ChallengeAttempt {
  challengeId: string
  startedAt: number
  completedAt?: number
  bestTime?: number // seconds
  completed: boolean
}

export const challenges: Challenge[] = [
  {
    id: 'speed-runner',
    title: 'Speed Runner',
    description: 'Pull an image, run a container, and verify it\'s running — as fast as you can!',
    difficulty: 'easy',
    timeLimit: 60,
    icon: '🏃',
    objectives: [
      {
        id: 'pull-image',
        description: 'Pull the ubuntu:latest image',
        check: ({ images }) => images.some(i => i.name === 'ubuntu' && i.tag === 'latest'),
      },
      {
        id: 'run-container',
        description: 'Run a container named "speedtest" from ubuntu:latest',
        check: ({ containers }) => containers.some(c => c.name === 'speedtest' && c.image === 'ubuntu:latest'),
      },
      {
        id: 'verify-running',
        description: 'Ensure the container is running',
        check: ({ containers }) => containers.some(c => c.name === 'speedtest' && c.status === 'running'),
      },
    ],
    hints: [
      'docker pull ubuntu:latest',
      'docker run -d --name speedtest ubuntu:latest',
    ],
  },
  {
    id: 'port-master',
    title: 'Port Mapper',
    description: 'Set up two web servers on different ports without conflicts.',
    difficulty: 'easy',
    timeLimit: 90,
    icon: '🔌',
    objectives: [
      {
        id: 'web1',
        description: 'Run nginx container "web1" on port 8080:80',
        check: ({ containers }) =>
          containers.some(c => c.name === 'web1' && c.ports.includes('8080:80') && c.status === 'running'),
      },
      {
        id: 'web2',
        description: 'Run nginx container "web2" on port 9090:80',
        check: ({ containers }) =>
          containers.some(c => c.name === 'web2' && c.ports.includes('9090:80') && c.status === 'running'),
      },
    ],
    hints: [
      'docker run -d --name web1 -p 8080:80 nginx:latest',
      'docker run -d --name web2 -p 9090:80 nginx:latest',
    ],
  },
  {
    id: 'cleanup-crew',
    title: 'Cleanup Crew',
    description: 'Stop all running containers and remove them. Leave zero containers behind!',
    difficulty: 'medium',
    timeLimit: 120,
    icon: '🧹',
    objectives: [
      {
        id: 'create-containers',
        description: 'First, create at least 3 containers',
        check: ({ containers }) => containers.length >= 3,
      },
      {
        id: 'stop-all',
        description: 'Stop all running containers',
        check: ({ containers }) => containers.length >= 3 && containers.every(c => c.status !== 'running'),
      },
      {
        id: 'remove-all',
        description: 'Remove all containers',
        check: ({ containers }) => containers.length === 0,
      },
    ],
    hints: [
      'Run 3 containers first, then stop and remove them',
      'docker stop <name> to stop, docker rm <name> to remove',
    ],
  },
  {
    id: 'network-architect',
    title: 'Network Architect',
    description: 'Create a custom network and connect two containers to it.',
    difficulty: 'medium',
    timeLimit: 120,
    icon: '🌐',
    objectives: [
      {
        id: 'create-network',
        description: 'Create a network named "app-net"',
        check: () => true, // validated via command success
      },
      {
        id: 'run-frontend',
        description: 'Run container "frontend" on app-net',
        check: ({ containers }) =>
          containers.some(c => c.name === 'frontend' && c.networks?.includes('app-net')),
      },
      {
        id: 'run-backend',
        description: 'Run container "backend" on app-net',
        check: ({ containers }) =>
          containers.some(c => c.name === 'backend' && c.networks?.includes('app-net')),
      },
    ],
    hints: [
      'docker network create app-net',
      'docker run -d --name frontend --network app-net nginx:latest',
      'docker run -d --name backend --network app-net node:20-alpine',
    ],
  },
  {
    id: 'image-tagger',
    title: 'Image Tagger',
    description: 'Pull, tag, and organize images like a pro.',
    difficulty: 'medium',
    timeLimit: 90,
    icon: '🏷️',
    objectives: [
      {
        id: 'pull-alpine',
        description: 'Pull alpine:latest',
        check: ({ images }) => images.some(i => i.name === 'alpine' && i.tag === 'latest'),
      },
      {
        id: 'tag-v1',
        description: 'Tag it as myapp:v1',
        check: ({ images }) => images.some(i => i.name === 'myapp' && i.tag === 'v1'),
      },
      {
        id: 'tag-v2',
        description: 'Tag it as myapp:v2',
        check: ({ images }) => images.some(i => i.name === 'myapp' && i.tag === 'v2'),
      },
    ],
    hints: [
      'docker pull alpine:latest',
      'docker tag alpine:latest myapp:v1',
      'docker tag alpine:latest myapp:v2',
    ],
  },
  {
    id: 'full-stack',
    title: 'Full Stack Deploy',
    description: 'Deploy a complete web stack: web server, app server, and database with proper networking.',
    difficulty: 'hard',
    timeLimit: 180,
    icon: '🚀',
    objectives: [
      {
        id: 'db',
        description: 'Run a postgres database named "db" with env POSTGRES_PASSWORD=secret',
        check: ({ containers }) =>
          containers.some(c => c.name === 'db' && c.image.includes('postgres') && c.env?.POSTGRES_PASSWORD === 'secret' && c.status === 'running'),
      },
      {
        id: 'app',
        description: 'Run a node app named "app" connected to the same network as db',
        check: ({ containers }) => {
          const db = containers.find(c => c.name === 'db')
          const app = containers.find(c => c.name === 'app' && c.image.includes('node'))
          if (!db || !app) return false
          return app.networks?.some(n => db.networks?.includes(n)) ?? false
        },
      },
      {
        id: 'web',
        description: 'Run an nginx proxy named "web" on port 80:80',
        check: ({ containers }) =>
          containers.some(c => c.name === 'web' && c.image.includes('nginx') && c.ports.includes('80:80') && c.status === 'running'),
      },
      {
        id: 'all-running',
        description: 'All three containers must be running',
        check: ({ containers }) => {
          const names = ['db', 'app', 'web']
          return names.every(n => containers.some(c => c.name === n && c.status === 'running'))
        },
      },
    ],
    hints: [
      'Create a network first: docker network create stack-net',
      'docker run -d --name db --network stack-net -e POSTGRES_PASSWORD=secret postgres:16',
      'docker run -d --name app --network stack-net node:20-alpine',
      'docker run -d --name web --network stack-net -p 80:80 nginx:latest',
    ],
  },
]

export function getChallengeById(id: string): Challenge | undefined {
  return challenges.find(c => c.id === id)
}

export function getDifficultyColor(difficulty: Challenge['difficulty']): string {
  switch (difficulty) {
    case 'easy': return 'text-green-500'
    case 'medium': return 'text-yellow-500'
    case 'hard': return 'text-red-500'
  }
}
