import { DockerContainer, DockerImage, CommandResult } from './types'

export interface DockerState {
  containers: DockerContainer[]
  images: DockerImage[]
}

export function parseCommand(
  command: string,
  state: DockerState,
  updateState: (newState: DockerState) => void
): CommandResult {
  const parts = command.trim().split(/\s+/)
  const mainCommand = parts[0]?.toLowerCase()
  const subCommand = parts[1]?.toLowerCase()

  if (mainCommand !== 'docker' && mainCommand !== '') {
    return {
      success: false,
      output: '',
      error: `Command not found: ${mainCommand}. Try 'docker' commands or 'help'.`
    }
  }

  if (command.trim() === 'help' || (mainCommand === 'docker' && subCommand === 'help')) {
    return {
      success: true,
      output: getHelpText()
    }
  }

  if (command.trim() === 'clear') {
    return {
      success: true,
      output: 'CLEAR_TERMINAL'
    }
  }

  if (!subCommand) {
    return {
      success: false,
      output: '',
      error: 'docker: command required. Type "help" for available commands.'
    }
  }

  switch (subCommand) {
    case 'ps':
      return handlePs(parts, state)
    case 'images':
      return handleImages(state)
    case 'run':
      return handleRun(parts, state, updateState)
    case 'stop':
      return handleStop(parts, state, updateState)
    case 'start':
      return handleStart(parts, state, updateState)
    case 'rm':
      return handleRm(parts, state, updateState)
    case 'rmi':
      return handleRmi(parts, state, updateState)
    case 'pull':
      return handlePull(parts, state, updateState)
    case 'exec':
      return handleExec(parts, state)
    case 'logs':
      return handleLogs(parts, state)
    case 'inspect':
      return handleInspect(parts, state)
    default:
      return {
        success: false,
        output: '',
        error: `Unknown command: docker ${subCommand}. Type "help" for available commands.`
      }
  }
}

function handlePs(parts: string[], state: DockerState): CommandResult {
  const showAll = parts.includes('-a') || parts.includes('--all')
  const containers = showAll 
    ? state.containers 
    : state.containers.filter(c => c.status === 'running')

  if (containers.length === 0) {
    return {
      success: true,
      output: 'CONTAINER ID   IMAGE          COMMAND    CREATED        STATUS    PORTS    NAMES\n(no containers)'
    }
  }

  const header = 'CONTAINER ID   IMAGE          COMMAND       CREATED        STATUS         PORTS           NAMES'
  const rows = containers.map(c => {
    const id = c.id.substring(0, 12)
    const created = formatTimestamp(c.created)
    const status = c.status === 'running' ? 'Up' : 'Exited'
    const ports = c.ports.join(', ') || '-'
    return `${id.padEnd(15)}${c.image.padEnd(15)}${c.command.padEnd(14)}${created.padEnd(15)}${status.padEnd(15)}${ports.padEnd(16)}${c.name}`
  })

  return {
    success: true,
    output: [header, ...rows].join('\n')
  }
}

function handleImages(state: DockerState): CommandResult {
  if (state.images.length === 0) {
    return {
      success: true,
      output: 'REPOSITORY     TAG       IMAGE ID       CREATED        SIZE\n(no images)'
    }
  }

  const header = 'REPOSITORY     TAG       IMAGE ID       CREATED        SIZE'
  const rows = state.images.map(img => {
    const id = img.id.substring(0, 12)
    const created = formatTimestamp(img.created)
    return `${img.name.padEnd(15)}${img.tag.padEnd(10)}${id.padEnd(15)}${created.padEnd(15)}${img.size}`
  })

  return {
    success: true,
    output: [header, ...rows].join('\n')
  }
}

function handleRun(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const detached = parts.includes('-d') || parts.includes('--detach')
  const nameIndex = parts.indexOf('--name')
  let containerName = nameIndex > -1 ? parts[nameIndex + 1] : undefined
  
  let imageName = ''
  for (let i = 2; i < parts.length; i++) {
    if (parts[i] === '-d' || parts[i] === '--detach' || parts[i] === '--name') {
      if (parts[i] === '--name') i++
      continue
    }
    if (parts[i]?.startsWith('-p')) {
      i++
      continue
    }
    imageName = parts[i] || ''
    break
  }

  if (!imageName) {
    return {
      success: false,
      output: '',
      error: 'docker run: image name required. Usage: docker run [OPTIONS] IMAGE'
    }
  }

  const image = state.images.find(img => `${img.name}:${img.tag}` === imageName || img.name === imageName)
  if (!image) {
    return {
      success: false,
      output: '',
      error: `Unable to find image '${imageName}' locally. Try 'docker pull ${imageName}' first.`
    }
  }

  if (!containerName) {
    containerName = generateContainerName()
  }

  if (state.containers.find(c => c.name === containerName)) {
    return {
      success: false,
      output: '',
      error: `Container name '${containerName}' already exists. Use --name to specify a different name.`
    }
  }

  const portIndex = parts.findIndex(p => p === '-p')
  const ports = portIndex > -1 ? [parts[portIndex + 1] || ''] : []

  const newContainer: DockerContainer = {
    id: generateId(),
    name: containerName,
    image: `${image.name}:${image.tag}`,
    status: 'running',
    ports,
    created: Date.now(),
    command: image.name.includes('nginx') ? 'nginx -g daemon off;' : '/bin/sh'
  }

  updateState({
    ...state,
    containers: [...state.containers, newContainer]
  })

  return {
    success: true,
    output: detached ? newContainer.id : `Container '${containerName}' started with ID ${newContainer.id.substring(0, 12)}`
  }
}

function handleStop(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return {
      success: false,
      output: '',
      error: 'docker stop: container name or ID required'
    }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return {
      success: false,
      output: '',
      error: `No such container: ${containerRef}`
    }
  }

  if (container.status !== 'running') {
    return {
      success: false,
      output: '',
      error: `Container ${containerRef} is not running`
    }
  }

  updateState({
    ...state,
    containers: state.containers.map(c => 
      c.id === container.id ? { ...c, status: 'stopped' } : c
    )
  })

  return {
    success: true,
    output: containerRef
  }
}

function handleStart(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return {
      success: false,
      output: '',
      error: 'docker start: container name or ID required'
    }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return {
      success: false,
      output: '',
      error: `No such container: ${containerRef}`
    }
  }

  if (container.status === 'running') {
    return {
      success: false,
      output: '',
      error: `Container ${containerRef} is already running`
    }
  }

  updateState({
    ...state,
    containers: state.containers.map(c => 
      c.id === container.id ? { ...c, status: 'running' } : c
    )
  })

  return {
    success: true,
    output: containerRef
  }
}

function handleRm(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const force = parts.includes('-f') || parts.includes('--force')
  const containerRef = parts.find(p => p !== 'docker' && p !== 'rm' && p !== '-f' && p !== '--force')
  
  if (!containerRef) {
    return {
      success: false,
      output: '',
      error: 'docker rm: container name or ID required'
    }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return {
      success: false,
      output: '',
      error: `No such container: ${containerRef}`
    }
  }

  if (container.status === 'running' && !force) {
    return {
      success: false,
      output: '',
      error: `Cannot remove running container ${containerRef}. Stop it first or use -f flag.`
    }
  }

  updateState({
    ...state,
    containers: state.containers.filter(c => c.id !== container.id)
  })

  return {
    success: true,
    output: containerRef
  }
}

function handleRmi(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const imageRef = parts[2]
  if (!imageRef) {
    return {
      success: false,
      output: '',
      error: 'docker rmi: image name or ID required'
    }
  }

  const image = state.images.find(img => 
    img.id.startsWith(imageRef) || 
    img.name === imageRef || 
    `${img.name}:${img.tag}` === imageRef
  )

  if (!image) {
    return {
      success: false,
      output: '',
      error: `No such image: ${imageRef}`
    }
  }

  const containersUsingImage = state.containers.filter(c => c.image === `${image.name}:${image.tag}`)
  if (containersUsingImage.length > 0) {
    return {
      success: false,
      output: '',
      error: `Image is being used by containers: ${containersUsingImage.map(c => c.name).join(', ')}`
    }
  }

  updateState({
    ...state,
    images: state.images.filter(img => img.id !== image.id)
  })

  return {
    success: true,
    output: `Untagged: ${image.name}:${image.tag}\nDeleted: ${image.id.substring(0, 12)}`
  }
}

function handlePull(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const imageRef = parts[2]
  if (!imageRef) {
    return {
      success: false,
      output: '',
      error: 'docker pull: image name required'
    }
  }

  const [name, tag = 'latest'] = imageRef.split(':')

  if (state.images.find(img => img.name === name && img.tag === tag)) {
    return {
      success: false,
      output: '',
      error: `Image ${name}:${tag} already exists`
    }
  }

  const newImage: DockerImage = {
    id: generateId(),
    name: name || '',
    tag,
    size: generateSize(),
    created: Date.now(),
    layers: generateLayers(name || '')
  }

  updateState({
    ...state,
    images: [...state.images, newImage]
  })

  return {
    success: true,
    output: `${tag}: Pulling from ${name}\n${newImage.layers.map(l => `${l}: Pull complete`).join('\n')}\nStatus: Downloaded newer image for ${name}:${tag}`
  }
}

function handleExec(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[3]
  if (!containerRef) {
    return {
      success: false,
      output: '',
      error: 'docker exec: container name or ID required'
    }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return {
      success: false,
      output: '',
      error: `No such container: ${containerRef}`
    }
  }

  if (container.status !== 'running') {
    return {
      success: false,
      output: '',
      error: `Container ${containerRef} is not running`
    }
  }

  const execCommand = parts.slice(4).join(' ')
  return {
    success: true,
    output: `Executing in ${container.name}: ${execCommand}\n(simulated output - in reality this would run the command inside the container)`
  }
}

function handleLogs(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return {
      success: false,
      output: '',
      error: 'docker logs: container name or ID required'
    }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return {
      success: false,
      output: '',
      error: `No such container: ${containerRef}`
    }
  }

  return {
    success: true,
    output: `Logs for ${container.name}:\n[${new Date(container.created).toISOString()}] Container started\n[${new Date().toISOString()}] Container ${container.status}\n(simulated logs - in reality this would show actual container output)`
  }
}

function handleInspect(parts: string[], state: DockerState): CommandResult {
  const ref = parts[2]
  if (!ref) {
    return {
      success: false,
      output: '',
      error: 'docker inspect: name or ID required'
    }
  }

  const container = findContainer(ref, state.containers)
  if (container) {
    return {
      success: true,
      output: JSON.stringify({
        Id: container.id,
        Name: container.name,
        Image: container.image,
        State: {
          Status: container.status,
          Running: container.status === 'running'
        },
        Created: new Date(container.created).toISOString(),
        Ports: container.ports
      }, null, 2)
    }
  }

  const image = state.images.find(img => 
    img.id.startsWith(ref) || 
    img.name === ref || 
    `${img.name}:${img.tag}` === ref
  )

  if (image) {
    return {
      success: true,
      output: JSON.stringify({
        Id: image.id,
        RepoTags: [`${image.name}:${image.tag}`],
        Created: new Date(image.created).toISOString(),
        Size: image.size,
        Layers: image.layers
      }, null, 2)
    }
  }

  return {
    success: false,
    output: '',
    error: `No such object: ${ref}`
  }
}

function findContainer(ref: string, containers: DockerContainer[]): DockerContainer | undefined {
  return containers.find(c => 
    c.id.startsWith(ref) || 
    c.name === ref
  )
}

function generateId(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function generateContainerName(): string {
  const adjectives = ['clever', 'happy', 'brave', 'gentle', 'wise', 'eager', 'calm', 'bold']
  const names = ['einstein', 'curie', 'tesla', 'lovelace', 'turing', 'hopper', 'ritchie', 'torvalds']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const name = names[Math.floor(Math.random() * names.length)]
  return `${adj}_${name}`
}

function generateSize(): string {
  const size = Math.floor(Math.random() * 500) + 50
  return `${size}MB`
}

function generateLayers(imageName: string): string[] {
  const layerCount = Math.floor(Math.random() * 3) + 3
  return Array.from({ length: layerCount }, (_, i) => 
    `${generateId().substring(0, 12)}`
  )
}

function formatTimestamp(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function getHelpText(): string {
  return `Docker Playground - Available Commands:

Container Commands:
  docker ps [-a]              List running containers (-a shows all)
  docker run [OPTIONS] IMAGE  Create and start a container
    Options: -d (detached), --name NAME, -p HOST:CONTAINER
  docker stop CONTAINER       Stop a running container
  docker start CONTAINER      Start a stopped container
  docker rm [-f] CONTAINER    Remove a container (-f forces removal)
  docker exec CONTAINER CMD   Execute command in running container
  docker logs CONTAINER       View container logs

Image Commands:
  docker images               List all images
  docker pull IMAGE[:TAG]     Pull an image (creates simulated image)
  docker rmi IMAGE            Remove an image
  docker inspect NAME/ID      Show detailed information

Other:
  help                        Show this help message
  clear                       Clear terminal

Examples:
  docker pull nginx:latest
  docker run -d --name web nginx:latest
  docker ps
  docker stop web
  docker rm web`
}

export function getInitialImages(): DockerImage[] {
  const now = Date.now()
  return [
    {
      id: generateId(),
      name: 'nginx',
      tag: 'latest',
      size: '187MB',
      created: now - 86400000 * 5,
      layers: ['e1f4f3c8d9a2', '5f70bf18a086', '1a73b54f6c3d', 'f4d65c0a8e94']
    },
    {
      id: generateId(),
      name: 'node',
      tag: '20-alpine',
      size: '119MB',
      created: now - 86400000 * 3,
      layers: ['a1d0c6e2f8b3', '7e9f2d4c5a8b', '3c8e1f9a7b2d']
    },
    {
      id: generateId(),
      name: 'postgres',
      tag: '16',
      size: '432MB',
      created: now - 86400000 * 7,
      layers: ['d4e5f6a7b8c9', '9a8b7c6d5e4f', '2b3c4d5e6f7a', '8f9e0d1c2b3a', '5c6d7e8f9a0b']
    },
    {
      id: generateId(),
      name: 'redis',
      tag: 'alpine',
      size: '41MB',
      created: now - 86400000 * 2,
      layers: ['7f8e9d0c1b2a', 'b3c4d5e6f7a8', '1a2b3c4d5e6f']
    }
  ]
}