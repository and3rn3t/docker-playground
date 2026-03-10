import type { DockerContainer, DockerImage, DockerNetwork } from './types'
import { generateId } from './utils'

export interface ComposeService {
  name: string
  image: string
  ports: string[]
  environment: Record<string, string>
  volumes: string[]
  networks: string[]
  depends_on: string[]
  command?: string
}

export interface ComposeConfig {
  services: ComposeService[]
  networks: string[]
  volumes: string[]
}

export interface ComposeParseResult {
  success: boolean
  config?: ComposeConfig
  errors: string[]
}

/**
 * Simple YAML-like parser for docker-compose.yml.
 * Supports a practical subset: services with image, ports, environment, volumes, networks, depends_on.
 */
export function parseComposeFile(content: string): ComposeParseResult {
  const lines = content.split('\n')
  const errors: string[] = []
  const services: ComposeService[] = []
  const topNetworks: string[] = []
  const topVolumes: string[] = []

  let currentSection: 'none' | 'services' | 'networks' | 'volumes' = 'none'
  let currentService: ComposeService | null = null
  let currentServiceProp: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNum = i + 1

    // Strip comments
    const commentIdx = raw.indexOf('#')
    const line = commentIdx >= 0 ? raw.substring(0, commentIdx) : raw

    if (line.trim() === '') continue

    const indent = line.length - line.trimStart().length
    const trimmed = line.trim()

    // Top-level keys (indent = 0)
    if (indent === 0) {
      if (currentService) {
        services.push(currentService)
        currentService = null
      }
      currentServiceProp = null

      if (trimmed === 'services:') {
        currentSection = 'services'
      } else if (trimmed === 'networks:') {
        currentSection = 'networks'
      } else if (trimmed === 'volumes:') {
        currentSection = 'volumes'
      } else if (trimmed.startsWith('version:') || trimmed.startsWith('name:')) {
        // skip version / name
      } else {
        errors.push(`Line ${lineNum}: Unknown top-level key '${trimmed}'`)
      }
      continue
    }

    // Service-level (indent = 2)
    if (indent === 2 && currentSection === 'services') {
      if (currentService) {
        services.push(currentService)
      }
      currentServiceProp = null

      if (trimmed.endsWith(':')) {
        const svcName = trimmed.slice(0, -1).trim()
        currentService = {
          name: svcName,
          image: '',
          ports: [],
          environment: {},
          volumes: [],
          networks: [],
          depends_on: [],
        }
      } else {
        errors.push(`Line ${lineNum}: Expected service name followed by ':'`)
      }
      continue
    }

    // Top-level networks / volumes items (indent = 2)
    if (indent === 2 && currentSection === 'networks') {
      if (trimmed.endsWith(':')) {
        topNetworks.push(trimmed.slice(0, -1).trim())
      } else {
        topNetworks.push(trimmed.replace(':', '').trim())
      }
      continue
    }
    if (indent === 2 && currentSection === 'volumes') {
      if (trimmed.endsWith(':')) {
        topVolumes.push(trimmed.slice(0, -1).trim())
      } else {
        topVolumes.push(trimmed.replace(':', '').trim())
      }
      continue
    }

    // Service properties (indent = 4)
    if (indent === 4 && currentService) {
      if (trimmed.startsWith('image:')) {
        currentService.image = trimmed.substring(6).trim().replace(/['"]/g, '')
        currentServiceProp = null
      } else if (trimmed.startsWith('command:')) {
        currentService.command = trimmed.substring(8).trim().replace(/['"]/g, '')
        currentServiceProp = null
      } else if (trimmed === 'ports:') {
        currentServiceProp = 'ports'
      } else if (trimmed === 'environment:') {
        currentServiceProp = 'environment'
      } else if (trimmed === 'volumes:') {
        currentServiceProp = 'volumes'
      } else if (trimmed === 'networks:') {
        currentServiceProp = 'networks'
      } else if (trimmed === 'depends_on:') {
        currentServiceProp = 'depends_on'
      } else if (trimmed.startsWith('container_name:') || trimmed.startsWith('restart:') || trimmed.startsWith('build:')) {
        // Silently skip unsupported but common keys
        currentServiceProp = null
      } else {
        // Could be env in KEY: VALUE form
        if (currentServiceProp === 'environment' && trimmed.includes(':')) {
          const eqIdx = trimmed.indexOf(':')
          const key = trimmed.substring(0, eqIdx).trim()
          const value = trimmed.substring(eqIdx + 1).trim().replace(/['"]/g, '')
          currentService.environment[key] = value
        } else {
          currentServiceProp = null
        }
      }
      continue
    }

    // List items (indent = 6)
    if (indent >= 6 && currentService && currentServiceProp) {
      if (trimmed.startsWith('- ')) {
        const value = trimmed.substring(2).trim().replace(/['"]/g, '')
        switch (currentServiceProp) {
          case 'ports':
            currentService.ports.push(value)
            break
          case 'volumes':
            currentService.volumes.push(value)
            break
          case 'networks':
            currentService.networks.push(value)
            break
          case 'depends_on':
            currentService.depends_on.push(value)
            break
        }
      } else if (currentServiceProp === 'environment' && trimmed.includes(':')) {
        // KEY: VALUE form at indent 6
        const eqIdx = trimmed.indexOf(':')
        const key = trimmed.substring(0, eqIdx).trim()
        const value = trimmed.substring(eqIdx + 1).trim().replace(/['"]/g, '')
        currentService.environment[key] = value
      } else if (currentServiceProp === 'environment' && trimmed.includes('=')) {
        // - KEY=VALUE form
        const stripped = trimmed.startsWith('- ') ? trimmed.substring(2) : trimmed
        const eqIdx = stripped.indexOf('=')
        const key = stripped.substring(0, eqIdx).trim()
        const value = stripped.substring(eqIdx + 1).trim().replace(/['"]/g, '')
        currentService.environment[key] = value
      }
      continue
    }
  }

  if (currentService) {
    services.push(currentService)
  }

  // Validate
  for (const svc of services) {
    if (!svc.image) {
      errors.push(`Service '${svc.name}': missing 'image' field`)
    }
  }

  if (services.length === 0 && errors.length === 0) {
    errors.push('No services defined. Add a services: section.')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    config: { services, networks: topNetworks, volumes: topVolumes },
    errors: [],
  }
}

/** Generate container/image/network state from a compose config */
export function simulateComposeUp(
  config: ComposeConfig,
  existingImages: DockerImage[],
): {
  containers: DockerContainer[]
  images: DockerImage[]
  networks: DockerNetwork[]
} {
  const genId = generateId
  const now = Date.now()

  // Create networks declared in compose
  const networks: DockerNetwork[] = config.networks.map(name => ({
    id: genId(),
    name,
    driver: 'bridge',
    containers: [],
    created: now,
  }))

  // Ensure images exist
  const newImages: DockerImage[] = []
  for (const svc of config.services) {
    const [name, tag = 'latest'] = svc.image.split(':')
    if (!existingImages.some(i => i.name === name && i.tag === tag) && !newImages.some(i => i.name === name && i.tag === tag)) {
      newImages.push({
        id: genId(),
        name,
        tag,
        size: `${Math.floor(50 + Math.random() * 300)}MB`,
        created: now,
        layers: Array.from({ length: 3 }, () => genId().substring(0, 12)),
      })
    }
  }

  // Create containers
  const containers: DockerContainer[] = config.services.map(svc => {
    const cId = genId()
    const svcNetworks = svc.networks.length > 0 ? svc.networks : (config.networks.length > 0 ? [config.networks[0]] : ['bridge'])

    // Add container to network objects
    for (const netName of svcNetworks) {
      const net = networks.find(n => n.name === netName)
      if (net) net.containers.push(cId)
    }

    return {
      id: cId,
      name: svc.name,
      image: svc.image.includes(':') ? svc.image : `${svc.image}:latest`,
      status: 'running' as const,
      ports: svc.ports,
      env: svc.environment,
      volumes: svc.volumes,
      created: now,
      command: svc.command || '/bin/sh',
      networks: svcNetworks,
    }
  })

  return { containers, images: newImages, networks }
}

export function getComposeTemplates(): { name: string; content: string }[] {
  return [
    {
      name: 'Web + Database',
      content: `services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    networks:
      - app-net
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-net

networks:
  app-net:

volumes:
  db-data:`,
    },
    {
      name: 'Node + Redis',
      content: `services:
  app:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      REDIS_URL: redis://cache:6379
    networks:
      - backend
    depends_on:
      - cache

  cache:
    image: redis:alpine
    networks:
      - backend

networks:
  backend:`,
    },
    {
      name: 'Full Stack',
      content: `services:
  frontend:
    image: nginx:latest
    ports:
      - "80:80"
    networks:
      - frontend-net
      - backend-net
    depends_on:
      - api

  api:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    networks:
      - backend-net
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend-net

networks:
  frontend-net:
  backend-net:

volumes:
  pgdata:`,
    },
    {
      name: 'Empty',
      content: `services:
  app:
    image: nginx:latest
    ports:
      - "8080:80"
`,
    },
  ]
}
