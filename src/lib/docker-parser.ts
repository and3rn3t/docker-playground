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

  if (mainCommand !== 'docker' && mainCommand !== '') {
    return {
      success: false,
      output: '',
      error: `Command not found: ${mainCommand}. Try 'docker' commands or 'help'.`
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
    case 'rename':
      return handleRename(parts, state, updateState)
    case 'pause':
      return handlePause(parts, state, updateState)
    case 'unpause':
      return handleUnpause(parts, state, updateState)
    case 'tag':
      return handleTag(parts, state, updateState)
    case 'history':
      return handleHistory(parts, state)
    case 'system':
      return handleSystem(parts, state, updateState)
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
  const quiet = parts.includes('-q') || parts.includes('--quiet')
  const noTrunc = parts.includes('--no-trunc')

  // Parse --filter flags
  const filters: { key: string; value: string }[] = []
  for (let i = 2; i < parts.length; i++) {
    if ((parts[i] === '--filter' || parts[i] === '-f') && parts[i + 1]) {
      const [key, ...rest] = parts[i + 1].split('=')
      filters.push({ key: key || '', value: rest.join('=') })
      i++
    }
  }

  let containers = showAll 
    ? state.containers 
    : state.containers.filter(c => c.status === 'running')

  // Apply filters
  for (const filter of filters) {
    switch (filter.key) {
      case 'status':
        containers = containers.filter(c => c.status === filter.value)
        break
      case 'name':
        containers = containers.filter(c => c.name.includes(filter.value))
        break
      default:
        return {
          success: false,
          output: '',
          error: `Invalid filter '${filter.key}'. Supported filters: status, name`
        }
    }
  }

  if (containers.length === 0) {
    if (quiet) {
      return { success: true, output: '' }
    }
    return {
      success: true,
      output: 'CONTAINER ID   IMAGE          COMMAND    CREATED        STATUS    PORTS    NAMES\n(no containers)'
    }
  }

  if (quiet) {
    const ids = containers.map(c => noTrunc ? c.id : c.id.substring(0, 12))
    return { success: true, output: ids.join('\n') }
  }

  const header = 'CONTAINER ID   IMAGE          COMMAND       CREATED        STATUS         PORTS           NAMES'
  const rows = containers.map(c => {
    const id = noTrunc ? c.id : c.id.substring(0, 12)
    const created = formatTimestamp(c.created)
    const status = c.status === 'running' ? 'Up' : c.status === 'paused' ? 'Paused' : 'Exited'
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
  
  // Parse flags and collect ports, env vars, volumes, and image name
  const ports: string[] = []
  const env: Record<string, string> = {}
  const volumes: string[] = []
  let imageName = ''

  for (let i = 2; i < parts.length; i++) {
    const part = parts[i]
    if (part === '-d' || part === '--detach') continue
    if (part === '--name') { i++; continue }
    if (part === '-p' || part === '--publish') {
      const portMapping = parts[++i]
      if (!portMapping) {
        return { success: false, output: '', error: 'docker run: -p requires a port mapping argument (e.g. -p 8080:80)' }
      }
      ports.push(portMapping)
      continue
    }
    if (part === '-e' || part === '--env') {
      const envArg = parts[++i]
      if (!envArg) {
        return { success: false, output: '', error: 'docker run: -e requires a KEY=VALUE argument' }
      }
      const eqIndex = envArg.indexOf('=')
      if (eqIndex === -1) {
        env[envArg] = ''
      } else {
        env[envArg.substring(0, eqIndex)] = envArg.substring(eqIndex + 1)
      }
      continue
    }
    if (part === '-v' || part === '--volume') {
      const volArg = parts[++i]
      if (!volArg) {
        return { success: false, output: '', error: 'docker run: -v requires a volume argument (e.g. -v /host:/container)' }
      }
      volumes.push(volArg)
      continue
    }
    if (part?.startsWith('-')) continue
    imageName = part || ''
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

  // Validate port mappings
  for (const mapping of ports) {
    const portParts = mapping.split(':')
    if (portParts.length !== 2) {
      return { success: false, output: '', error: `Invalid port mapping '${mapping}'. Format: HOST_PORT:CONTAINER_PORT` }
    }
    const [hostPort, containerPort] = portParts
    const hostNum = Number(hostPort)
    const containerNum = Number(containerPort)
    if (!Number.isInteger(hostNum) || hostNum < 1 || hostNum > 65535) {
      return { success: false, output: '', error: `Invalid host port '${hostPort}'. Must be between 1 and 65535.` }
    }
    if (!Number.isInteger(containerNum) || containerNum < 1 || containerNum > 65535) {
      return { success: false, output: '', error: `Invalid container port '${containerPort}'. Must be between 1 and 65535.` }
    }

    // Check for port conflicts with running containers
    const conflict = state.containers.find(c => 
      c.status === 'running' && c.ports.some(p => p.split(':')[0] === hostPort)
    )
    if (conflict) {
      return { success: false, output: '', error: `Port ${hostPort} is already in use by container '${conflict.name}'.` }
    }
  }

  const newContainer: DockerContainer = {
    id: generateId(),
    name: containerName,
    image: `${image.name}:${image.tag}`,
    status: 'running',
    ports,
    env,
    volumes,
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
  const refs = parts.slice(2)
  if (refs.length === 0) {
    return {
      success: false,
      output: '',
      error: 'docker stop: container name or ID required'
    }
  }

  const results: string[] = []
  let updatedContainers = [...state.containers]

  for (const ref of refs) {
    const container = findContainer(ref, updatedContainers)
    if (!container) {
      return { success: false, output: '', error: `No such container: ${ref}` }
    }
    if (container.status !== 'running' && container.status !== 'paused') {
      return { success: false, output: '', error: `Container ${ref} is not running` }
    }
    updatedContainers = updatedContainers.map(c =>
      c.id === container.id ? { ...c, status: 'stopped' as const } : c
    )
    results.push(ref)
  }

  updateState({ ...state, containers: updatedContainers })
  return { success: true, output: results.join('\n') }
}

function handleStart(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const refs = parts.slice(2)
  if (refs.length === 0) {
    return {
      success: false,
      output: '',
      error: 'docker start: container name or ID required'
    }
  }

  const results: string[] = []
  let updatedContainers = [...state.containers]

  for (const ref of refs) {
    const container = findContainer(ref, updatedContainers)
    if (!container) {
      return { success: false, output: '', error: `No such container: ${ref}` }
    }
    if (container.status === 'running') {
      return { success: false, output: '', error: `Container ${ref} is already running` }
    }
    updatedContainers = updatedContainers.map(c =>
      c.id === container.id ? { ...c, status: 'running' as const } : c
    )
    results.push(ref)
  }

  updateState({ ...state, containers: updatedContainers })
  return { success: true, output: results.join('\n') }
}

function handleRm(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const force = parts.includes('-f') || parts.includes('--force')
  const refs = parts.filter(p => p !== 'docker' && p !== 'rm' && p !== '-f' && p !== '--force')
  
  if (refs.length === 0) {
    return {
      success: false,
      output: '',
      error: 'docker rm: container name or ID required'
    }
  }

  const results: string[] = []
  let updatedContainers = [...state.containers]

  for (const ref of refs) {
    const container = findContainer(ref, updatedContainers)
    if (!container) {
      return { success: false, output: '', error: `No such container: ${ref}` }
    }
    if (container.status === 'running' && !force) {
      return {
        success: false,
        output: '',
        error: `Cannot remove running container ${ref}. Stop it first or use -f flag.`
      }
    }
    updatedContainers = updatedContainers.filter(c => c.id !== container.id)
    results.push(ref)
  }

  updateState({ ...state, containers: updatedContainers })
  return { success: true, output: results.join('\n') }
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
      success: true,
      output: `${tag}: Pulling from ${name}\nDigest: sha256:${generateId()}${generateId()}\nStatus: Image is up to date for ${name}:${tag}`
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
        Ports: container.ports,
        Env: container.env,
        Volumes: container.volumes
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

function handleRename(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const oldName = parts[2]
  const newName = parts[3]
  if (!oldName || !newName) {
    return { success: false, output: '', error: 'docker rename: requires CONTAINER NEW_NAME' }
  }

  const container = findContainer(oldName, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${oldName}` }
  }

  if (state.containers.find(c => c.name === newName)) {
    return { success: false, output: '', error: `Container name '${newName}' is already in use.` }
  }

  updateState({
    ...state,
    containers: state.containers.map(c =>
      c.id === container.id ? { ...c, name: newName } : c
    )
  })

  return { success: true, output: '' }
}

function handlePause(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const ref = parts[2]
  if (!ref) {
    return { success: false, output: '', error: 'docker pause: container name or ID required' }
  }

  const container = findContainer(ref, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${ref}` }
  }

  if (container.status !== 'running') {
    return { success: false, output: '', error: `Container ${ref} is not running` }
  }

  updateState({
    ...state,
    containers: state.containers.map(c =>
      c.id === container.id ? { ...c, status: 'paused' as const } : c
    )
  })

  return { success: true, output: ref }
}

function handleUnpause(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const ref = parts[2]
  if (!ref) {
    return { success: false, output: '', error: 'docker unpause: container name or ID required' }
  }

  const container = findContainer(ref, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${ref}` }
  }

  if (container.status !== 'paused') {
    return { success: false, output: '', error: `Container ${ref} is not paused` }
  }

  updateState({
    ...state,
    containers: state.containers.map(c =>
      c.id === container.id ? { ...c, status: 'running' as const } : c
    )
  })

  return { success: true, output: ref }
}

function handleTag(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const sourceRef = parts[2]
  const targetRef = parts[3]
  if (!sourceRef || !targetRef) {
    return { success: false, output: '', error: 'docker tag: requires SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]' }
  }

  const sourceImage = state.images.find(img =>
    `${img.name}:${img.tag}` === sourceRef || img.name === sourceRef || img.id.startsWith(sourceRef)
  )
  if (!sourceImage) {
    return { success: false, output: '', error: `No such image: ${sourceRef}` }
  }

  const [targetName, targetTag = 'latest'] = targetRef.split(':')
  if (state.images.find(img => img.name === targetName && img.tag === targetTag)) {
    return { success: false, output: '', error: `Image ${targetName}:${targetTag} already exists` }
  }

  const taggedImage: DockerImage = {
    id: generateId(),
    name: targetName || '',
    tag: targetTag,
    size: sourceImage.size,
    created: Date.now(),
    layers: [...sourceImage.layers]
  }

  updateState({ ...state, images: [...state.images, taggedImage] })
  return { success: true, output: '' }
}

function handleHistory(parts: string[], state: DockerState): CommandResult {
  const imageRef = parts[2]
  if (!imageRef) {
    return { success: false, output: '', error: 'docker history: image name or ID required' }
  }

  const image = state.images.find(img =>
    `${img.name}:${img.tag}` === imageRef || img.name === imageRef || img.id.startsWith(imageRef)
  )
  if (!image) {
    return { success: false, output: '', error: `No such image: ${imageRef}` }
  }

  const header = 'IMAGE          CREATED        CREATED BY                          SIZE'
  const rows = image.layers.map((layer, i) => {
    const created = formatTimestamp(image.created)
    const cmd = i === 0 ? `FROM ${image.name}:${image.tag}` : `RUN step ${i}`
    const size = i === 0 ? image.size : `${Math.floor(Math.random() * 50) + 1}MB`
    return `${layer.padEnd(15)}${created.padEnd(15)}${cmd.padEnd(36)}${size}`
  })

  return { success: true, output: [header, ...rows].join('\n') }
}

function handleSystem(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const action = parts[2]
  if (action !== 'prune') {
    return { success: false, output: '', error: `docker system: unknown command '${action || ''}'. Available: prune` }
  }

  const stoppedContainers = state.containers.filter(c => c.status !== 'running' && c.status !== 'paused')
  const survivingContainers = state.containers.filter(c => c.status === 'running' || c.status === 'paused')
  const usedImageNames = new Set(survivingContainers.map(c => c.image))
  const unusedImages = state.images.filter(img => !usedImageNames.has(`${img.name}:${img.tag}`))

  const removedContainers = stoppedContainers.length
  const removedImages = unusedImages.length

  updateState({
    containers: survivingContainers,
    images: state.images.filter(img => usedImageNames.has(`${img.name}:${img.tag}`))
  })

  return {
    success: true,
    output: `Deleted ${removedContainers} stopped container(s)\nDeleted ${removedImages} unused image(s)\nTotal reclaimed space: ${removedContainers * 50 + removedImages * 100}MB`
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

function generateLayers(_imageName: string): string[] {
  const layerCount = Math.floor(Math.random() * 3) + 3
  return Array.from({ length: layerCount }, () => 
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
  docker ps [OPTIONS]         List containers (default: running only)
    Options: -a (all), -q (IDs only), --no-trunc, --filter key=value
    Filters: status=running|stopped|exited|paused, name=PATTERN
  docker run [OPTIONS] IMAGE  Create and start a container
    Options: -d (detached), --name NAME, -p HOST:CONTAINER,
             -e KEY=VALUE, -v HOST:CONTAINER
  docker stop CONTAINER...    Stop one or more running containers
  docker start CONTAINER...   Start one or more stopped containers
  docker rm [-f] CONTAINER... Remove one or more containers (-f forces)
  docker exec CONTAINER CMD   Execute command in running container
  docker logs CONTAINER       View container logs
  docker rename OLD NEW       Rename a container
  docker pause CONTAINER      Pause a running container
  docker unpause CONTAINER    Resume a paused container

Image Commands:
  docker images               List all images
  docker pull IMAGE[:TAG]     Pull an image (creates simulated image)
  docker rmi IMAGE            Remove an image
  docker tag SOURCE TARGET    Create a tag TARGET from SOURCE image
  docker history IMAGE        Show image layer history

Inspect & System:
  docker inspect NAME/ID      Show detailed information
  docker system prune         Remove stopped containers and unused images

Other:
  help                        Show this help message
  clear                       Clear terminal

Examples:
  docker pull nginx:latest
  docker run -d --name web -p 8080:80 nginx
  docker run -e NODE_ENV=production -v ./data:/data node:20-alpine
  docker ps --filter status=running
  docker stop web db
  docker rm web db
  docker tag nginx myregistry/nginx:v1
  docker system prune`
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