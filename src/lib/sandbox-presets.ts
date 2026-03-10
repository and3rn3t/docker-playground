import type { DockerContainer, DockerImage, DockerNetwork } from '@/lib/types'
import { generateId as generateFullId } from '@/lib/utils'

export interface SandboxPreset {
  id: string
  title: string
  description: string
  icon: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  containers: Omit<DockerContainer, 'created'>[]
  images: Omit<DockerImage, 'created'>[]
  networks: Omit<DockerNetwork, 'created'>[]
  hints: string[]
}

const generateId = () => generateFullId(12)

export const sandboxPresets: SandboxPreset[] = [
  {
    id: 'microservices',
    title: 'Microservices App',
    description: 'A 3-tier web app with frontend, API, and database containers connected via a custom network.',
    icon: '🏗️',
    difficulty: 'intermediate',
    containers: [
      {
        id: generateId(),
        name: 'frontend',
        image: 'nginx:alpine',
        status: 'running',
        ports: ['3000:80'],
        env: { BACKEND_URL: 'http://api:8080' },
        volumes: [],
        command: 'nginx -g "daemon off;"',
        networks: ['app-network'],
      },
      {
        id: generateId(),
        name: 'api',
        image: 'node:18-alpine',
        status: 'running',
        ports: ['8080:8080'],
        env: { DATABASE_URL: 'postgres://db:5432/app', NODE_ENV: 'production' },
        volumes: [],
        command: 'node server.js',
        networks: ['app-network'],
      },
      {
        id: generateId(),
        name: 'db',
        image: 'postgres:15',
        status: 'running',
        ports: ['5432:5432'],
        env: { POSTGRES_DB: 'app', POSTGRES_USER: 'admin', POSTGRES_PASSWORD: '***' },
        volumes: ['pgdata:/var/lib/postgresql/data'],
        command: 'postgres',
        networks: ['app-network'],
      },
    ],
    images: [
      { id: generateId(), name: 'nginx', tag: 'alpine', size: '23MB', layers: [generateId(), generateId()] },
      { id: generateId(), name: 'node', tag: '18-alpine', size: '120MB', layers: [generateId(), generateId(), generateId()] },
      { id: generateId(), name: 'postgres', tag: '15', size: '380MB', layers: [generateId(), generateId(), generateId(), generateId()] },
    ],
    networks: [
      { id: generateId(), name: 'app-network', driver: 'bridge', containers: [] },
    ],
    hints: [
      'Try "docker ps" to see all running services.',
      'Use "docker logs api" to check the API server output.',
      'Stop the database with "docker stop db" and see what happens.',
      'Inspect the network with "docker network inspect app-network".',
      'Try adding a Redis cache: "docker run -d --name cache --network app-network redis".',
    ],
  },
  {
    id: 'dev-environment',
    title: 'Development Environment',
    description: 'A local dev setup with a Node.js app, Redis cache, and hot-reloading.',
    icon: '💻',
    difficulty: 'beginner',
    containers: [
      {
        id: generateId(),
        name: 'app',
        image: 'node:20',
        status: 'running',
        ports: ['3000:3000'],
        env: { NODE_ENV: 'development', REDIS_HOST: 'redis' },
        volumes: ['./src:/app/src'],
        command: 'npm run dev',
        networks: ['dev-net'],
      },
      {
        id: generateId(),
        name: 'redis',
        image: 'redis:7-alpine',
        status: 'running',
        ports: ['6379:6379'],
        env: {},
        volumes: [],
        command: 'redis-server',
        networks: ['dev-net'],
      },
    ],
    images: [
      { id: generateId(), name: 'node', tag: '20', size: '340MB', layers: [generateId(), generateId(), generateId()] },
      { id: generateId(), name: 'redis', tag: '7-alpine', size: '30MB', layers: [generateId(), generateId()] },
    ],
    networks: [
      { id: generateId(), name: 'dev-net', driver: 'bridge', containers: [] },
    ],
    hints: [
      'Try "docker exec app ls /app/src" to see mounted source files.',
      'Run "docker logs -f app" to follow the dev server output.',
      'Restart the app with "docker restart app".',
      'Check Redis with "docker exec redis redis-cli PING".',
    ],
  },
  {
    id: 'ci-pipeline',
    title: 'CI/CD Pipeline',
    description: 'Simulates a CI runner with builder and test containers — experiment with image builds and test workflows.',
    icon: '🚀',
    difficulty: 'advanced',
    containers: [
      {
        id: generateId(),
        name: 'ci-runner',
        image: 'alpine:3.18',
        status: 'running',
        ports: [],
        env: { CI: 'true', BUILD_NUMBER: '42' },
        volumes: [],
        command: 'sh -c "while true; do sleep 30; done"',
        networks: ['ci-network'],
      },
      {
        id: generateId(),
        name: 'test-db',
        image: 'postgres:15',
        status: 'running',
        ports: [],
        env: { POSTGRES_DB: 'test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' },
        volumes: [],
        command: 'postgres',
        networks: ['ci-network'],
      },
      {
        id: generateId(),
        name: 'build-cache',
        image: 'redis:7-alpine',
        status: 'running',
        ports: [],
        env: {},
        volumes: ['cache-vol:/data'],
        command: 'redis-server --appendonly yes',
        networks: ['ci-network'],
      },
    ],
    images: [
      { id: generateId(), name: 'alpine', tag: '3.18', size: '7MB', layers: [generateId()] },
      { id: generateId(), name: 'postgres', tag: '15', size: '380MB', layers: [generateId(), generateId(), generateId(), generateId()] },
      { id: generateId(), name: 'redis', tag: '7-alpine', size: '30MB', layers: [generateId(), generateId()] },
    ],
    networks: [
      { id: generateId(), name: 'ci-network', driver: 'bridge', containers: [] },
    ],
    hints: [
      'Use "docker exec ci-runner env" to see CI environment variables.',
      'Try building an image while the pipeline runs.',
      'Stop the test-db and observe the effect on the pipeline.',
      'Use "docker inspect ci-runner" to see container configuration.',
      'Clean up stopped containers with "docker container prune".',
    ],
  },
  {
    id: 'empty',
    title: 'Blank Canvas',
    description: 'Start from scratch — no containers, no images, pure exploration.',
    icon: '🎨',
    difficulty: 'beginner',
    containers: [],
    images: [],
    networks: [],
    hints: [
      'Start by pulling an image: "docker pull nginx".',
      'Create your first container: "docker run -d --name myapp nginx".',
      'Check what\'s running: "docker ps".',
      'View your images: "docker images".',
    ],
  },
]

export function getPresetById(id: string): SandboxPreset | undefined {
  return sandboxPresets.find((p) => p.id === id)
}
