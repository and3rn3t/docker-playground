import { DockerContainer, DockerImage, DockerNetwork, DockerVolume, DockerService, CommandResult } from './types'
import { simulateBuild } from './dockerfile-parser'
import { searchCatalog } from './image-catalog'

export interface DockerState {
  containers: DockerContainer[]
  images: DockerImage[]
  networks: DockerNetwork[]
  volumes: DockerVolume[]
  services?: DockerService[]
}

export function parseCommand(
  command: string,
  state: DockerState,
  updateState: (newState: DockerState) => void
): CommandResult {
  const parts = command.trim().split(/\s+/)
  let mainCommand = parts[0]?.toLowerCase()
  const subCommand = parts[1]?.toLowerCase()

  // Support 'd' as alias for 'docker'
  if (mainCommand === 'd') {
    mainCommand = 'docker'
    parts[0] = 'docker'
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
    case 'network':
      return handleNetwork(parts, state, updateState)
    case 'volume':
      return handleVolume(parts, state, updateState)
    case 'cp':
      return handleCp(parts, state)
    case 'commit':
      return handleCommit(parts, state, updateState)
    case 'stats':
      return handleStats(state)
    case 'top':
      return handleTop(parts, state)
    case 'diff':
      return handleDiff(parts, state)
    case 'port':
      return handlePort(parts, state)
    case 'save':
      return handleSave(parts, state)
    case 'load':
      return handleLoad(parts, state, updateState)
    case 'export':
      return handleExport(parts, state)
    case 'import':
      return handleImport(parts, state, updateState)
    case 'build':
      return handleBuild(parts, state, updateState)
    case 'push':
      return handlePush(parts, state)
    case 'login':
      return handleLogin(parts)
    case 'logout':
      return handleLogout()
    case 'search':
      return handleSearch(parts)
    case 'service':
      return handleService(parts, state, updateState)
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
  const networks: string[] = []
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
    if (part === '--network' || part === '--net') {
      const netArg = parts[++i]
      if (!netArg) {
        return { success: false, output: '', error: 'docker run: --network requires a network name' }
      }
      networks.push(netArg)
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
      (c.status === 'running' || c.status === 'paused') && c.ports.some(p => p.split(':')[0] === hostPort)
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
    command: image.name.includes('nginx') ? 'nginx -g daemon off;' : '/bin/sh',
    networks: networks.length > 0 ? networks : ['bridge']
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
        Volumes: container.volumes,
        Networks: container.networks || ['bridge']
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
  const unusedNetworks = state.networks.filter(n => n.containers.length === 0)

  const removedContainers = stoppedContainers.length
  const removedImages = unusedImages.length
  const removedNetworks = unusedNetworks.length

  updateState({
    containers: survivingContainers,
    images: state.images.filter(img => usedImageNames.has(`${img.name}:${img.tag}`)),
    networks: state.networks.filter(n => n.containers.length > 0),
    volumes: state.volumes
  })

  return {
    success: true,
    output: `Deleted ${removedContainers} stopped container(s)\nDeleted ${removedImages} unused image(s)\nDeleted ${removedNetworks} unused network(s)\nTotal reclaimed space: ${removedContainers * 50 + removedImages * 100}MB`
  }
}

function handleNetwork(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const action = parts[2]
  if (!action) {
    return { success: false, output: '', error: 'docker network: subcommand required. Available: create, ls, rm, connect, disconnect' }
  }

  switch (action) {
    case 'create': {
      let driver = 'bridge'
      let networkName = ''
      for (let i = 3; i < parts.length; i++) {
        if (parts[i] === '--driver') {
          driver = parts[++i] || 'bridge'
        } else if (!parts[i].startsWith('-')) {
          networkName = parts[i]
        }
      }
      if (!networkName) {
        return { success: false, output: '', error: 'docker network create: network name required' }
      }
      if (state.networks.find(n => n.name === networkName)) {
        return { success: false, output: '', error: `network with name ${networkName} already exists` }
      }
      const newNetwork: DockerNetwork = {
        id: generateId(),
        name: networkName,
        driver,
        containers: [],
        created: Date.now()
      }
      updateState({ ...state, networks: [...state.networks, newNetwork] })
      return { success: true, output: newNetwork.id }
    }
    case 'ls': {
      if (state.networks.length === 0) {
        return { success: true, output: 'NETWORK ID     NAME           DRIVER    SCOPE\n(no networks)' }
      }
      const header = 'NETWORK ID     NAME           DRIVER    SCOPE'
      const rows = state.networks.map(n => {
        return `${n.id.substring(0, 12).padEnd(15)}${n.name.padEnd(15)}${n.driver.padEnd(10)}local`
      })
      return { success: true, output: [header, ...rows].join('\n') }
    }
    case 'rm': {
      const netRef = parts[3]
      if (!netRef) {
        return { success: false, output: '', error: 'docker network rm: network name or ID required' }
      }
      const network = state.networks.find(n => n.name === netRef || n.id.startsWith(netRef))
      if (!network) {
        return { success: false, output: '', error: `No such network: ${netRef}` }
      }
      if (network.containers.length > 0) {
        return { success: false, output: '', error: `network ${network.name} has active endpoints` }
      }
      updateState({ ...state, networks: state.networks.filter(n => n.id !== network.id) })
      return { success: true, output: netRef }
    }
    case 'connect': {
      const netName = parts[3]
      const containerRef = parts[4]
      if (!netName || !containerRef) {
        return { success: false, output: '', error: 'docker network connect: requires NETWORK CONTAINER' }
      }
      const network = state.networks.find(n => n.name === netName || n.id.startsWith(netName))
      if (!network) {
        return { success: false, output: '', error: `No such network: ${netName}` }
      }
      const container = findContainer(containerRef, state.containers)
      if (!container) {
        return { success: false, output: '', error: `No such container: ${containerRef}` }
      }
      if (network.containers.includes(container.id)) {
        return { success: false, output: '', error: `container ${container.name} is already connected to ${network.name}` }
      }
      updateState({
        ...state,
        networks: state.networks.map(n =>
          n.id === network.id ? { ...n, containers: [...n.containers, container.id] } : n
        ),
        containers: state.containers.map(c =>
          c.id === container.id ? { ...c, networks: [...(c.networks || []), network.name] } : c
        )
      })
      return { success: true, output: '' }
    }
    case 'disconnect': {
      const netName = parts[3]
      const containerRef = parts[4]
      if (!netName || !containerRef) {
        return { success: false, output: '', error: 'docker network disconnect: requires NETWORK CONTAINER' }
      }
      const network = state.networks.find(n => n.name === netName || n.id.startsWith(netName))
      if (!network) {
        return { success: false, output: '', error: `No such network: ${netName}` }
      }
      const container = findContainer(containerRef, state.containers)
      if (!container) {
        return { success: false, output: '', error: `No such container: ${containerRef}` }
      }
      if (!network.containers.includes(container.id)) {
        return { success: false, output: '', error: `container ${container.name} is not connected to ${network.name}` }
      }
      updateState({
        ...state,
        networks: state.networks.map(n =>
          n.id === network.id ? { ...n, containers: n.containers.filter(id => id !== container.id) } : n
        ),
        containers: state.containers.map(c =>
          c.id === container.id ? { ...c, networks: (c.networks || []).filter(n => n !== network.name) } : c
        )
      })
      return { success: true, output: '' }
    }
    default:
      return { success: false, output: '', error: `docker network: unknown command '${action}'. Available: create, ls, rm, connect, disconnect` }
  }
}

function handleVolume(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const action = parts[2]
  if (!action) {
    return { success: false, output: '', error: 'docker volume: subcommand required. Available: create, ls, rm' }
  }

  switch (action) {
    case 'create': {
      const volumeName = parts[3]
      if (!volumeName) {
        return { success: false, output: '', error: 'docker volume create: volume name required' }
      }
      if (state.volumes.find(v => v.name === volumeName)) {
        return { success: false, output: '', error: `volume with name ${volumeName} already exists` }
      }
      const newVolume: DockerVolume = {
        id: generateId(),
        name: volumeName,
        driver: 'local',
        mountpoint: `/var/lib/docker/volumes/${volumeName}/_data`,
        created: Date.now()
      }
      updateState({ ...state, volumes: [...state.volumes, newVolume] })
      return { success: true, output: volumeName }
    }
    case 'ls': {
      if (state.volumes.length === 0) {
        return { success: true, output: 'DRIVER    VOLUME NAME\n(no volumes)' }
      }
      const header = 'DRIVER    VOLUME NAME'
      const rows = state.volumes.map(v => `${v.driver.padEnd(10)}${v.name}`)
      return { success: true, output: [header, ...rows].join('\n') }
    }
    case 'rm': {
      const volRef = parts[3]
      if (!volRef) {
        return { success: false, output: '', error: 'docker volume rm: volume name required' }
      }
      const volume = state.volumes.find(v => v.name === volRef || v.id.startsWith(volRef))
      if (!volume) {
        return { success: false, output: '', error: `No such volume: ${volRef}` }
      }
      updateState({ ...state, volumes: state.volumes.filter(v => v.id !== volume.id) })
      return { success: true, output: volRef }
    }
    default:
      return { success: false, output: '', error: `docker volume: unknown command '${action}'. Available: create, ls, rm` }
  }
}

function handleCp(parts: string[], state: DockerState): CommandResult {
  const src = parts[2]
  const dst = parts[3]
  if (!src || !dst) {
    return { success: false, output: '', error: 'docker cp: requires SRC_PATH DEST_PATH (use CONTAINER:PATH for container paths)' }
  }

  // Determine which arg references a container
  const srcHasContainer = src.includes(':')
  const dstHasContainer = dst.includes(':')

  if (!srcHasContainer && !dstHasContainer) {
    return { success: false, output: '', error: 'docker cp: one of source or destination must be a container path (CONTAINER:PATH)' }
  }

  const containerRef = srcHasContainer ? src.split(':')[0] : dst.split(':')[0]
  const container = findContainer(containerRef || '', state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  if (container.status !== 'running' && container.status !== 'paused') {
    return { success: false, output: '', error: `Container ${containerRef} is not running` }
  }

  const direction = srcHasContainer ? 'from' : 'to'
  return {
    success: true,
    output: `Successfully copied ${direction} ${container.name}\n(simulated - in reality this would copy files between host and container)`
  }
}

function handleCommit(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const containerRef = parts[2]
  const imageRef = parts[3]
  if (!containerRef || !imageRef) {
    return { success: false, output: '', error: 'docker commit: requires CONTAINER IMAGE[:TAG]' }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  const [name, tag = 'latest'] = imageRef.split(':')
  if (state.images.find(img => img.name === name && img.tag === tag)) {
    return { success: false, output: '', error: `Image ${name}:${tag} already exists` }
  }

  const sourceImage = state.images.find(img => img.name + ':' + img.tag === container.image)

  const newImage: DockerImage = {
    id: generateId(),
    name: name || '',
    tag,
    size: sourceImage ? sourceImage.size : generateSize(),
    created: Date.now(),
    layers: sourceImage ? [...sourceImage.layers, generateId().substring(0, 12)] : generateLayers(name || '')
  }

  updateState({ ...state, images: [...state.images, newImage] })
  return { success: true, output: `sha256:${newImage.id.substring(0, 64)}` }
}

function handleStats(state: DockerState): CommandResult {
  const running = state.containers.filter(c => c.status === 'running')

  if (running.length === 0) {
    return { success: true, output: 'No running containers' }
  }

  const header = 'CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT     MEM %     NET I/O          BLOCK I/O        PIDS'
  const rows = running.map(c => {
    const id = c.id.substring(0, 12)
    const cpu = (Math.random() * 15).toFixed(2) + '%'
    const memUsage = Math.floor(Math.random() * 256) + 16
    const memLimit = 512
    const memPercent = ((memUsage / memLimit) * 100).toFixed(2) + '%'
    const netIn = (Math.random() * 100).toFixed(1) + 'MB'
    const netOut = (Math.random() * 50).toFixed(1) + 'MB'
    const blockIn = (Math.random() * 200).toFixed(1) + 'MB'
    const blockOut = (Math.random() * 100).toFixed(1) + 'MB'
    const pids = Math.floor(Math.random() * 20) + 1
    return `${id.padEnd(15)}${c.name.padEnd(15)}${cpu.padEnd(10)}${memUsage}MiB / ${memLimit}MiB${(' ').padEnd(5)}${memPercent.padEnd(10)}${netIn} / ${netOut}${(' ').padEnd(3)}${blockIn} / ${blockOut}${(' ').padEnd(3)}${pids}`
  })

  return { success: true, output: [header, ...rows].join('\n') }
}

function handleTop(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return { success: false, output: '', error: 'docker top: container name or ID required' }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  if (container.status !== 'running') {
    return { success: false, output: '', error: `Container ${containerRef} is not running` }
  }

  const header = 'UID        PID   PPID  C  STIME  TTY    TIME     CMD'
  const mainCmd = container.command || '/bin/sh'
  const rows = [
    `root       1     0     0  ${new Date().toTimeString().substring(0, 5)}  ?      00:00:01 ${mainCmd}`,
    `root       ${Math.floor(Math.random() * 90) + 10}    1     0  ${new Date().toTimeString().substring(0, 5)}  ?      00:00:00 /bin/sh`
  ]

  return { success: true, output: [header, ...rows].join('\n') }
}

function handleDiff(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return { success: false, output: '', error: 'docker diff: container name or ID required' }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  const changes = [
    'C /var',
    'C /var/log',
    'A /var/log/app.log',
    'C /tmp',
    'A /tmp/cache',
    'C /etc',
    'C /etc/hostname'
  ]

  return {
    success: true,
    output: changes.join('\n') + '\n(simulated filesystem changes — C=changed, A=added, D=deleted)'
  }
}

function handlePort(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return { success: false, output: '', error: 'docker port: container name or ID required' }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  if (container.ports.length === 0) {
    return { success: true, output: '' }
  }

  const lines = container.ports.map(p => {
    const [host, containerPort] = p.split(':')
    return `${containerPort}/tcp -> 0.0.0.0:${host}`
  })

  return { success: true, output: lines.join('\n') }
}

function handleSave(parts: string[], state: DockerState): CommandResult {
  const imageRef = parts[2]
  if (!imageRef) {
    return { success: false, output: '', error: 'docker save: image name or ID required. Usage: docker save IMAGE' }
  }

  const image = state.images.find(img =>
    `${img.name}:${img.tag}` === imageRef || img.name === imageRef || img.id.startsWith(imageRef)
  )
  if (!image) {
    return { success: false, output: '', error: `No such image: ${imageRef}` }
  }

  return {
    success: true,
    output: `Saved image ${image.name}:${image.tag} (${image.size})\n(simulated — in reality this writes a tar archive to stdout)`
  }
}

function handleLoad(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const inputFlag = parts.indexOf('-i') !== -1 || parts.indexOf('--input') !== -1
  if (!inputFlag && parts.length < 3) {
    return { success: false, output: '', error: 'docker load: requires -i FILE or input. Usage: docker load -i FILE' }
  }

  const newImage: DockerImage = {
    id: generateId(),
    name: 'loaded-image',
    tag: 'latest',
    size: generateSize(),
    created: Date.now(),
    layers: generateLayers('loaded-image')
  }

  updateState({ ...state, images: [...state.images, newImage] })
  return {
    success: true,
    output: `Loaded image: ${newImage.name}:${newImage.tag}\n(simulated — in reality this reads a tar archive)`
  }
}

function handleExport(parts: string[], state: DockerState): CommandResult {
  const containerRef = parts[2]
  if (!containerRef) {
    return { success: false, output: '', error: 'docker export: container name or ID required. Usage: docker export CONTAINER' }
  }

  const container = findContainer(containerRef, state.containers)
  if (!container) {
    return { success: false, output: '', error: `No such container: ${containerRef}` }
  }

  return {
    success: true,
    output: `Exported container ${container.name} filesystem\n(simulated — in reality this writes a tar archive to stdout)`
  }
}

function handleImport(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const fileOrUrl = parts[2]
  const imageRef = parts[3]
  if (!fileOrUrl) {
    return { success: false, output: '', error: 'docker import: requires FILE|URL [REPOSITORY[:TAG]]. Usage: docker import file.tar myimage:latest' }
  }

  const [name, tag = 'latest'] = (imageRef || 'imported-image').split(':')

  const newImage: DockerImage = {
    id: generateId(),
    name: name || 'imported-image',
    tag,
    size: generateSize(),
    created: Date.now(),
    layers: [generateId().substring(0, 12)]
  }

  updateState({ ...state, images: [...state.images, newImage] })
  return {
    success: true,
    output: `sha256:${newImage.id.substring(0, 64)}`
  }
}

function handleBuild(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  let tag = ''
  let dockerfileContent = ''
  let noCache = false

  for (let i = 2; i < parts.length; i++) {
    const part = parts[i]
    if (part === '-t' || part === '--tag') {
      tag = parts[++i] || ''
      continue
    }
    if (part === '--no-cache') {
      noCache = true
      continue
    }
    if (part === '-f' || part === '--file') {
      i++ // skip filename — we use the active Dockerfile from state
      continue
    }
  }

  if (!tag) {
    return { success: false, output: '', error: 'docker build: -t flag is required. Usage: docker build -t IMAGE[:TAG] .' }
  }

  // Check if there is a saved active Dockerfile
  // The dockerfileContent will be provided via the build integration in the UI,
  // but via the CLI we generate a minimal placeholder so tests can work
  if (!dockerfileContent) {
    dockerfileContent = `FROM ${tag.split(':')[0] || 'ubuntu'}:latest\nRUN echo "built from CLI"`
  }

  const result = simulateBuild(dockerfileContent, tag)

  if (!result.success) {
    return { success: false, output: '', error: result.errors.join('\n') }
  }

  // Check for existing image with same name:tag
  const existingIdx = state.images.findIndex(
    img => img.name === result.imageName && img.tag === result.imageTag
  )

  const newImage: DockerImage = {
    id: generateId(),
    name: result.imageName,
    tag: result.imageTag,
    size: result.totalSize,
    created: Date.now(),
    layers: result.steps
      .filter(s => ['FROM', 'RUN', 'COPY', 'ADD'].includes(s.instruction))
      .map(s => s.layerId),
  }

  const images = existingIdx >= 0
    ? state.images.map((img, idx) => idx === existingIdx ? newImage : img)
    : [...state.images, newImage]

  updateState({ ...state, images })

  const stepLines = result.steps.map((s, i) => {
    const cached = !noCache && s.cached ? ' CACHED' : ''
    return `Step ${i + 1}/${result.steps.length} : ${s.instruction} ${s.args}${cached}\n ---> ${s.layerId}`
  })

  return {
    success: true,
    output: [
      `Sending build context to Docker daemon  2.048kB`,
      ...stepLines,
      `Successfully built ${newImage.id.substring(0, 12)}`,
      `Successfully tagged ${result.imageName}:${result.imageTag}`,
    ].join('\n'),
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

function handlePush(parts: string[], state: DockerState): CommandResult {
  const imageRef = parts[2]
  if (!imageRef) {
    return { success: false, output: '', error: 'docker push: image name required' }
  }
  const [name, tag = 'latest'] = imageRef.split(':')
  const image = state.images.find(img => img.name === name && img.tag === tag)
  if (!image) {
    return { success: false, output: '', error: `An image does not exist locally with the tag: ${name}:${tag}` }
  }
  const digest = `sha256:${generateId()}${generateId()}`
  const layers = image.layers.map(l => `${l}: Pushed`).join('\n')
  return {
    success: true,
    output: `The push refers to repository [docker.io/library/${name}]\n${layers}\n${tag}: digest: ${digest} size: ${Math.floor(Math.random() * 5000) + 1000}`,
  }
}

function handleLogin(_parts: string[]): CommandResult {
  return {
    success: true,
    output: 'Login Succeeded (simulated)',
  }
}

function handleLogout(): CommandResult {
  return {
    success: true,
    output: 'Removing login credentials for https://index.docker.io/v1/\nLogout Succeeded (simulated)',
  }
}

function handleSearch(parts: string[]): CommandResult {
  const query = parts[2]
  if (!query) {
    return { success: false, output: '', error: 'docker search: search term required' }
  }
  const results = searchCatalog(query)
  if (results.length === 0) {
    return { success: true, output: 'No results found.' }
  }
  const header = 'NAME'.padEnd(25) + 'DESCRIPTION'.padEnd(50) + 'STARS'.padEnd(8) + 'OFFICIAL'
  const rows = results.map(img => {
    const desc = img.description.length > 47 ? img.description.substring(0, 47) + '...' : img.description
    return img.name.padEnd(25) + desc.padEnd(50) + img.pulls.padEnd(8) + (img.official ? '[OK]' : '')
  })
  return { success: true, output: [header, ...rows].join('\n') }
}

function handleService(parts: string[], state: DockerState, updateState: (newState: DockerState) => void): CommandResult {
  const subCmd = parts[2]
  const services = state.services || []

  if (!subCmd || subCmd === '--help') {
    return {
      success: true,
      output: 'Usage:  docker service COMMAND\n\nCommands:\n  create    Create a new service\n  ls        List services\n  rm        Remove a service\n  scale     Scale a service\n  update    Update a service\n  inspect   Show service details',
    }
  }

  switch (subCmd) {
    case 'create': {
      let name = ''
      let image = ''
      let replicas = 1
      const ports: string[] = []

      for (let i = 3; i < parts.length; i++) {
        if (parts[i] === '--name' && parts[i + 1]) { name = parts[++i]; continue }
        if (parts[i] === '--replicas' && parts[i + 1]) { replicas = parseInt(parts[++i], 10) || 1; continue }
        if ((parts[i] === '-p' || parts[i] === '--publish') && parts[i + 1]) { ports.push(parts[++i]); continue }
        if (!parts[i].startsWith('-')) image = parts[i]
      }

      if (!image) return { success: false, output: '', error: 'docker service create: image required' }
      if (!name) name = `${image.split(':')[0]}_svc`
      if (services.find(s => s.name === name)) {
        return { success: false, output: '', error: `service ${name} already exists` }
      }

      const newService: DockerService = {
        id: generateId().substring(0, 25),
        name,
        image,
        replicas,
        desiredReplicas: replicas,
        ports,
        created: Date.now(),
      }

      updateState({ ...state, services: [...services, newService] })

      return {
        success: true,
        output: `${newService.id}\nService ${name} created with ${replicas} replica(s)\nimage: ${image}${ports.length ? '\npublished: ' + ports.join(', ') : ''}`,
      }
    }

    case 'ls': {
      if (services.length === 0) return { success: true, output: 'ID    NAME    MODE    REPLICAS    IMAGE    PORTS' }
      const header = 'ID'.padEnd(14) + 'NAME'.padEnd(20) + 'MODE'.padEnd(14) + 'REPLICAS'.padEnd(12) + 'IMAGE'.padEnd(25) + 'PORTS'
      const rows = services.map(s => {
        return s.id.substring(0, 12).padEnd(14) +
          s.name.padEnd(20) +
          'replicated'.padEnd(14) +
          `${s.replicas}/${s.desiredReplicas}`.padEnd(12) +
          s.image.padEnd(25) +
          s.ports.join(', ')
      })
      return { success: true, output: [header, ...rows].join('\n') }
    }

    case 'rm': {
      const svcName = parts[3]
      if (!svcName) return { success: false, output: '', error: 'docker service rm: service name required' }
      const idx = services.findIndex(s => s.name === svcName || s.id.startsWith(svcName))
      if (idx < 0) return { success: false, output: '', error: `no such service: ${svcName}` }
      const removed = services[idx]
      updateState({ ...state, services: services.filter((_, i) => i !== idx) })
      return { success: true, output: `${removed.name}\nService ${removed.name} removed` }
    }

    case 'scale': {
      const scaleArg = parts[3] // format: name=N
      if (!scaleArg || !scaleArg.includes('=')) {
        return { success: false, output: '', error: 'Usage: docker service scale SERVICE=REPLICAS' }
      }
      const [svcName, countStr] = scaleArg.split('=')
      const count = parseInt(countStr, 10)
      if (isNaN(count) || count < 0) return { success: false, output: '', error: 'invalid replica count' }
      const svc = services.find(s => s.name === svcName)
      if (!svc) return { success: false, output: '', error: `no such service: ${svcName}` }
      const oldReplicas = svc.desiredReplicas
      updateState({
        ...state,
        services: services.map(s => s.name === svcName
          ? { ...s, replicas: count, desiredReplicas: count }
          : s
        ),
      })
      return {
        success: true,
        output: `${svcName} scaled to ${count}\n(was ${oldReplicas} → now ${count} replica${count !== 1 ? 's' : ''})`,
      }
    }

    case 'update': {
      const svcName = parts[3]
      if (!svcName) return { success: false, output: '', error: 'docker service update: service name required' }
      const svc = services.find(s => s.name === svcName || s.id.startsWith(svcName))
      if (!svc) return { success: false, output: '', error: `no such service: ${svcName}` }

      let newImage = svc.image
      for (let i = 4; i < parts.length; i++) {
        if (parts[i] === '--image' && parts[i + 1]) { newImage = parts[++i]; continue }
      }

      updateState({
        ...state,
        services: services.map(s => s.name === svc.name
          ? { ...s, image: newImage, updateState: 'completed' }
          : s
        ),
      })
      return {
        success: true,
        output: `${svc.name}\nService ${svc.name} updated${newImage !== svc.image ? ` (image: ${svc.image} → ${newImage})` : ''}\nupdate: rolling update completed`,
      }
    }

    case 'inspect': {
      const svcName = parts[3]
      if (!svcName) return { success: false, output: '', error: 'docker service inspect: service name required' }
      const svc = services.find(s => s.name === svcName || s.id.startsWith(svcName))
      if (!svc) return { success: false, output: '', error: `no such service: ${svcName}` }
      const info = JSON.stringify({
        ID: svc.id,
        Name: svc.name,
        Image: svc.image,
        Replicas: `${svc.replicas}/${svc.desiredReplicas}`,
        Ports: svc.ports,
        CreatedAt: new Date(svc.created).toISOString(),
        UpdateState: svc.updateState || 'none',
      }, null, 2)
      return { success: true, output: `[\n${info}\n]` }
    }

    default:
      return { success: false, output: '', error: `docker service: unknown subcommand '${subCmd}'` }
  }
}

function getHelpText(): string {
  return `Docker Playground - Available Commands:

Container Commands:
  docker ps [OPTIONS]         List containers (default: running only)
    Options: -a (all), -q (IDs only), --no-trunc, --filter key=value
    Filters: status=running|stopped|exited|paused, name=PATTERN
  docker run [OPTIONS] IMAGE  Create and start a container
    Options: -d (detached), --name NAME, -p HOST:CONTAINER,
             -e KEY=VALUE, -v HOST:CONTAINER, --network NETWORK
  docker stop CONTAINER...    Stop one or more running containers
  docker start CONTAINER...   Start one or more stopped containers
  docker rm [-f] CONTAINER... Remove one or more containers (-f forces)
  docker exec CONTAINER CMD   Execute command in running container
  docker logs CONTAINER       View container logs
  docker rename OLD NEW       Rename a container
  docker pause CONTAINER      Pause a running container
  docker unpause CONTAINER    Resume a paused container
  docker cp SRC DEST          Copy files between container and host
  docker commit CONTAINER IMG Create image from a container's changes
  docker stats                Show resource usage of running containers
  docker top CONTAINER        Show running processes in a container
  docker diff CONTAINER       Show filesystem changes in a container
  docker port CONTAINER       List port mappings for a container
  docker export CONTAINER     Export container filesystem as tar archive
  docker import FILE [IMAGE]  Create image from a tarball

Image Commands:
  docker images               List all images
  docker pull IMAGE[:TAG]     Pull an image (creates simulated image)
  docker push IMAGE[:TAG]     Push an image to registry (simulated)
  docker rmi IMAGE            Remove an image
  docker tag SOURCE TARGET    Create a tag TARGET from SOURCE image
  docker history IMAGE        Show image layer history
  docker build -t NAME .      Build image from Dockerfile
  docker save IMAGE           Save image to a tar archive
  docker load -i FILE         Load image from a tar archive
  docker search TERM          Search Docker Hub for images

Network Commands:
  docker network create NAME  Create a new network
  docker network ls           List all networks
  docker network rm NETWORK   Remove a network
  docker network connect NETWORK CONTAINER    Connect container to network
  docker network disconnect NETWORK CONTAINER Disconnect container from network

Volume Commands:
  docker volume create NAME   Create a new volume
  docker volume ls            List all volumes
  docker volume rm VOLUME     Remove a volume

Inspect & System:
  docker inspect NAME/ID      Show detailed information
  docker system prune         Remove stopped containers and unused images

Registry Commands:
  docker login                Log in to a Docker registry (simulated)
  docker logout               Log out from a Docker registry (simulated)

Service Commands (Swarm concepts):
  docker service create       Create a new service
    Options: --name NAME, --replicas N, -p HOST:CONTAINER
  docker service ls           List services
  docker service rm SERVICE   Remove a service
  docker service scale SVC=N  Scale a service to N replicas
  docker service update SVC   Update a service (--image IMAGE)
  docker service inspect SVC  Show service details

Other:
  help                        Show this help message
  clear                       Clear terminal (also Ctrl+L)

Examples:
  docker pull nginx:latest
  docker run -d --name web -p 8080:80 nginx
  docker run -e NODE_ENV=production -v ./data:/data node:20-alpine
  docker run -d --name web --network my-net nginx
  docker ps --filter status=running
  docker stop web db
  docker rm web db
  docker tag nginx myregistry/nginx:v1
  docker commit web my-custom-nginx:v1
  docker stats
  docker top web
  docker diff web
  docker save nginx > nginx.tar
  docker load -i nginx.tar
  docker network create my-net
  docker network connect my-net web
  docker volume create my-data
  docker cp web:/etc/nginx/nginx.conf ./nginx.conf
  docker build -t myapp:v1 .
  docker search nginx
  docker push myapp:v1
  docker login
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

export function getInitialNetworks(): DockerNetwork[] {
  return [
    {
      id: generateId(),
      name: 'bridge',
      driver: 'bridge',
      containers: [],
      created: Date.now() - 86400000 * 30
    },
    {
      id: generateId(),
      name: 'host',
      driver: 'host',
      containers: [],
      created: Date.now() - 86400000 * 30
    },
    {
      id: generateId(),
      name: 'none',
      driver: 'null',
      containers: [],
      created: Date.now() - 86400000 * 30
    }
  ]
}