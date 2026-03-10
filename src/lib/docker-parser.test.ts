import { describe, it, expect, vi } from 'vitest'
import { parseCommand, DockerState, getInitialImages, getInitialNetworks } from './docker-parser'
import { DockerContainer, DockerImage, DockerNetwork, DockerVolume } from './types'

function makeState(overrides?: Partial<DockerState>): DockerState {
  return {
    containers: overrides?.containers ?? [],
    images: overrides?.images ?? getInitialImages(),
    networks: overrides?.networks ?? getInitialNetworks(),
    volumes: overrides?.volumes ?? [],
    services: overrides?.services ?? [],
  }
}

function makeContainer(overrides?: Partial<DockerContainer>): DockerContainer {
  return {
    id: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345',
    name: 'test-container',
    image: 'nginx:latest',
    status: 'running',
    ports: [],
    env: {},
    volumes: [],
    created: Date.now(),
    command: 'nginx -g daemon off;',
    networks: ['bridge'],
    ...overrides,
  }
}

function makeImage(overrides?: Partial<DockerImage>): DockerImage {
  return {
    id: 'img123def456abc123def456abc123def456abc123def456abc123def456abc12345',
    name: 'test-image',
    tag: 'latest',
    size: '100MB',
    created: Date.now(),
    layers: ['layer1', 'layer2'],
    ...overrides,
  }
}

describe('parseCommand', () => {
  const noopUpdate = vi.fn()

  describe('routing and unknown commands', () => {
    it('returns error for non-docker commands', () => {
      const result = parseCommand('ls -la', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Command not found')
    })

    it('returns error for unknown docker subcommands', () => {
      const result = parseCommand('docker foo', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown command')
    })

    it('returns error for bare "docker" with no subcommand', () => {
      const result = parseCommand('docker', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('command required')
    })

    it('handles "help" command', () => {
      const result = parseCommand('help', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Available Commands')
    })

    it('handles "docker help"', () => {
      const result = parseCommand('docker help', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Available Commands')
    })

    it('handles "clear" command', () => {
      const result = parseCommand('clear', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toBe('CLEAR_TERMINAL')
    })

    it('handles empty string input', () => {
      const result = parseCommand('', makeState(), noopUpdate)
      expect(result.success).toBe(false)
    })

    it('handles whitespace-only input', () => {
      const result = parseCommand('   ', makeState(), noopUpdate)
      expect(result.success).toBe(false)
    })
  })

  describe('docker ps', () => {
    it('lists only running containers by default', () => {
      const running = makeContainer({ name: 'web', status: 'running' })
      const stopped = makeContainer({ name: 'db', status: 'stopped', id: 'xyz789' })
      const state = makeState({ containers: [running, stopped] })

      const result = parseCommand('docker ps', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('web')
      expect(result.output).not.toContain('db')
    })

    it('lists all containers with -a flag', () => {
      const running = makeContainer({ name: 'web', status: 'running' })
      const stopped = makeContainer({ name: 'db', status: 'stopped', id: 'xyz789' })
      const state = makeState({ containers: [running, stopped] })

      const result = parseCommand('docker ps -a', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('web')
      expect(result.output).toContain('db')
    })

    it('lists all containers with --all flag', () => {
      const stopped = makeContainer({ name: 'db', status: 'stopped' })
      const state = makeState({ containers: [stopped] })

      const result = parseCommand('docker ps --all', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('db')
    })

    it('shows empty message when no containers', () => {
      const result = parseCommand('docker ps', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('no containers')
    })
  })

  describe('docker images', () => {
    it('lists available images', () => {
      const result = parseCommand('docker images', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('nginx')
      expect(result.output).toContain('node')
    })

    it('shows empty message when no images', () => {
      const state = makeState({ images: [] })
      const result = parseCommand('docker images', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('no images')
    })
  })

  describe('docker run', () => {
    it('creates a container from an existing image', () => {
      const updateState = vi.fn()
      const state = makeState()

      const result = parseCommand('docker run -d --name web nginx:latest', state, updateState)
      expect(result.success).toBe(true)
      expect(updateState).toHaveBeenCalledOnce()

      const newState = updateState.mock.calls[0][0] as DockerState
      const created = newState.containers.find(c => c.name === 'web')
      expect(created).toBeDefined()
      expect(created!.status).toBe('running')
      expect(created!.image).toBe('nginx:latest')
    })

    it('creates container with port mapping', () => {
      const updateState = vi.fn()
      const state = makeState()

      const result = parseCommand('docker run -d -p 8080:80 --name web nginx:latest', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      const created = newState.containers.find(c => c.name === 'web')
      expect(created!.ports).toContain('8080:80')
    })

    it('rejects run without image name', () => {
      const result = parseCommand('docker run -d --name web', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('image name required')
    })

    it('rejects run with non-existent image', () => {
      const result = parseCommand('docker run -d --name web nonexistent:latest', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unable to find image')
    })

    it('rejects duplicate container names', () => {
      const existing = makeContainer({ name: 'web' })
      const state = makeState({ containers: [existing] })

      const result = parseCommand('docker run -d --name web nginx:latest', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('auto-generates name when --name not provided', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -d nginx:latest', makeState(), updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      const created = newState.containers[newState.containers.length - 1]
      expect(created.name).toBeTruthy()
      expect(created.name).toContain('_')
    })

    it('returns container ID in detached mode', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -d --name web nginx:latest', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toHaveLength(64) // full hex ID
    })
  })

  describe('docker stop', () => {
    it('stops a running container', () => {
      const updateState = vi.fn()
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker stop web', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.containers[0].status).toBe('stopped')
    })

    it('rejects stopping a non-running container', () => {
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker stop web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })

    it('rejects stopping non-existent container', () => {
      const result = parseCommand('docker stop ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires container name or ID', () => {
      const result = parseCommand('docker stop', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker start', () => {
    it('starts a stopped container', () => {
      const updateState = vi.fn()
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker start web', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.containers[0].status).toBe('running')
    })

    it('rejects starting an already running container', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker start web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already running')
    })

    it('requires container name or ID', () => {
      const result = parseCommand('docker start', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker rm', () => {
    it('removes a stopped container', () => {
      const updateState = vi.fn()
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker rm web', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.containers).toHaveLength(0)
    })

    it('rejects removing a running container without -f', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker rm web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('running')
    })

    it('force removes a running container with -f', () => {
      const updateState = vi.fn()
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker rm -f web', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.containers).toHaveLength(0)
    })

    it('rejects removing non-existent container', () => {
      const result = parseCommand('docker rm ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })
  })

  describe('docker rmi', () => {
    it('removes an unused image', () => {
      const updateState = vi.fn()
      const image = makeImage({ name: 'test-image', tag: 'latest' })
      const state = makeState({ images: [image] })

      const result = parseCommand('docker rmi test-image:latest', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.images).toHaveLength(0)
    })

    it('rejects removing image used by a container', () => {
      const image = makeImage({ name: 'nginx', tag: 'latest' })
      const container = makeContainer({ image: 'nginx:latest' })
      const state = makeState({ images: [image], containers: [container] })

      const result = parseCommand('docker rmi nginx:latest', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('being used by containers')
    })

    it('rejects removing non-existent image', () => {
      const result = parseCommand('docker rmi nonexistent', makeState({ images: [] }), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such image')
    })

    it('requires image name', () => {
      const result = parseCommand('docker rmi', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker pull', () => {
    it('pulls a new image', () => {
      const updateState = vi.fn()
      const state = makeState({ images: [] })

      const result = parseCommand('docker pull alpine:3.19', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Downloaded')

      const newState = updateState.mock.calls[0][0] as DockerState
      const pulled = newState.images.find(i => i.name === 'alpine')
      expect(pulled).toBeDefined()
      expect(pulled!.tag).toBe('3.19')
    })

    it('defaults to latest tag', () => {
      const updateState = vi.fn()
      const state = makeState({ images: [] })

      const result = parseCommand('docker pull ubuntu', state, updateState)
      expect(result.success).toBe(true)

      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.images[0].tag).toBe('latest')
    })

    it('succeeds with up-to-date message when pulling existing image', () => {
      const result = parseCommand('docker pull nginx:latest', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('up to date')
    })

    it('requires image name', () => {
      const result = parseCommand('docker pull', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker exec', () => {
    it('executes in a running container', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker exec -it web ls -la', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Executing')
    })

    it('rejects exec on non-running container', () => {
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker exec -it web ls', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })
  })

  describe('docker logs', () => {
    it('shows logs for a container', () => {
      const container = makeContainer({ name: 'web' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker logs web', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Logs for web')
    })

    it('rejects logs for non-existent container', () => {
      const result = parseCommand('docker logs ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })
  })

  describe('docker inspect', () => {
    it('inspects a container', () => {
      const container = makeContainer({ name: 'web' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker inspect web', state, noopUpdate)
      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.output)
      expect(parsed.Name).toBe('web')
      expect(parsed.State.Running).toBe(true)
    })

    it('inspects an image', () => {
      const state = makeState()

      const result = parseCommand('docker inspect nginx', state, noopUpdate)
      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.output)
      expect(parsed.RepoTags).toContain('nginx:latest')
    })

    it('rejects inspecting non-existent object', () => {
      const result = parseCommand('docker inspect nonexistent', makeState({ containers: [], images: [] }), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such object')
    })

    it('requires name or id', () => {
      const result = parseCommand('docker inspect', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('container lookup by ID prefix', () => {
    it('finds container by ID prefix', () => {
      const container = makeContainer({
        id: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345',
        name: 'web',
        status: 'running',
      })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker stop abc123def456', state, vi.fn())
      expect(result.success).toBe(true)
    })
  })

  describe('port validation', () => {
    it('rejects invalid port format (missing colon)', () => {
      const result = parseCommand('docker run -p 8080 nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid port mapping')
      expect(result.error).toContain('HOST_PORT:CONTAINER_PORT')
    })

    it('rejects out-of-range host port', () => {
      const result = parseCommand('docker run -p 99999:80 nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host port')
      expect(result.error).toContain('1 and 65535')
    })

    it('rejects out-of-range container port', () => {
      const result = parseCommand('docker run -p 80:70000 nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid container port')
    })

    it('rejects non-numeric port', () => {
      const result = parseCommand('docker run -p abc:80 nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host port')
    })

    it('rejects port 0', () => {
      const result = parseCommand('docker run -p 0:80 nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid host port')
    })

    it('accepts valid port mapping', () => {
      const result = parseCommand('docker run -p 8080:80 nginx', makeState(), vi.fn())
      expect(result.success).toBe(true)
    })
  })

  describe('port conflict detection', () => {
    it('rejects port already used by a running container', () => {
      const existing = makeContainer({ name: 'web', ports: ['8080:80'], status: 'running' })
      const state = makeState({ containers: [existing] })

      const result = parseCommand('docker run -p 8080:80 nginx', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already in use')
      expect(result.error).toContain('web')
    })

    it('rejects port already used by a paused container', () => {
      const existing = makeContainer({ name: 'web', ports: ['8080:80'], status: 'paused' })
      const state = makeState({ containers: [existing] })

      const result = parseCommand('docker run -p 8080:80 nginx', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already in use')
      expect(result.error).toContain('web')
    })

    it('allows reuse of port from a stopped container', () => {
      const existing = makeContainer({ name: 'web', ports: ['8080:80'], status: 'stopped' })
      const state = makeState({ containers: [existing] })

      const result = parseCommand('docker run --name web2 -p 8080:80 nginx', state, vi.fn())
      expect(result.success).toBe(true)
    })

    it('allows different host port even if container port matches', () => {
      const existing = makeContainer({ name: 'web', ports: ['8080:80'], status: 'running' })
      const state = makeState({ containers: [existing] })

      const result = parseCommand('docker run --name web2 -p 9090:80 nginx', state, vi.fn())
      expect(result.success).toBe(true)
    })
  })

  describe('multiple port mappings', () => {
    it('accepts multiple -p flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -p 8080:80 -p 443:443 nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.ports).toEqual(['8080:80', '443:443'])
    })
  })

  describe('environment variable parsing', () => {
    it('parses -e KEY=VALUE flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -e NODE_ENV=production nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.env).toEqual({ NODE_ENV: 'production' })
    })

    it('parses multiple -e flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -e A=1 -e B=2 nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.env).toEqual({ A: '1', B: '2' })
    })

    it('handles -e with values containing equals sign', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -e DSN=host=db;port=5432 nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.env).toEqual({ DSN: 'host=db;port=5432' })
    })

    it('container has empty env when no -e flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.env).toEqual({})
    })
  })

  describe('docker inspect with env', () => {
    it('includes env in inspect output', () => {
      const container = makeContainer({ name: 'web', env: { NODE_ENV: 'production' } })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker inspect web', state, noopUpdate)
      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.output)
      expect(parsed.Env).toEqual({ NODE_ENV: 'production' })
    })
  })

  describe('docker rename', () => {
    it('renames a container', () => {
      const container = makeContainer({ name: 'old-name' })
      const state = makeState({ containers: [container] })
      const updateState = vi.fn()

      const result = parseCommand('docker rename old-name new-name', state, updateState)
      expect(result.success).toBe(true)
      expect(updateState.mock.calls[0][0].containers[0].name).toBe('new-name')
    })

    it('rejects rename to an existing name', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web' })
      const c2 = makeContainer({ id: 'bbb', name: 'api' })
      const state = makeState({ containers: [c1, c2] })

      const result = parseCommand('docker rename web api', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already in use')
    })

    it('rejects rename of non-existent container', () => {
      const result = parseCommand('docker rename ghost new', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires both old and new names', () => {
      const result = parseCommand('docker rename web', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker pause/unpause', () => {
    it('pauses a running container', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })
      const updateState = vi.fn()

      const result = parseCommand('docker pause web', state, updateState)
      expect(result.success).toBe(true)
      expect(updateState.mock.calls[0][0].containers[0].status).toBe('paused')
    })

    it('rejects pausing a stopped container', () => {
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker pause web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })

    it('unpauses a paused container', () => {
      const container = makeContainer({ name: 'web', status: 'paused' })
      const state = makeState({ containers: [container] })
      const updateState = vi.fn()

      const result = parseCommand('docker unpause web', state, updateState)
      expect(result.success).toBe(true)
      expect(updateState.mock.calls[0][0].containers[0].status).toBe('running')
    })

    it('rejects unpausing a non-paused container', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker unpause web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not paused')
    })

    it('requires container ref for pause', () => {
      const result = parseCommand('docker pause', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('requires container ref for unpause', () => {
      const result = parseCommand('docker unpause', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('multi-container stop/start/rm', () => {
    it('stops multiple containers', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'running' })
      const c2 = makeContainer({ id: 'bbb', name: 'api', status: 'running' })
      const state = makeState({ containers: [c1, c2] })
      const updateState = vi.fn()

      const result = parseCommand('docker stop web api', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toBe('web\napi')
      const updated = updateState.mock.calls[0][0].containers
      expect(updated.every((c: DockerContainer) => c.status === 'stopped')).toBe(true)
    })

    it('starts multiple containers', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'stopped' })
      const c2 = makeContainer({ id: 'bbb', name: 'api', status: 'stopped' })
      const state = makeState({ containers: [c1, c2] })
      const updateState = vi.fn()

      const result = parseCommand('docker start web api', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toBe('web\napi')
    })

    it('removes multiple stopped containers', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'stopped' })
      const c2 = makeContainer({ id: 'bbb', name: 'api', status: 'stopped' })
      const state = makeState({ containers: [c1, c2] })
      const updateState = vi.fn()

      const result = parseCommand('docker rm web api', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toBe('web\napi')
      expect(updateState.mock.calls[0][0].containers).toHaveLength(0)
    })

    it('fails early on non-existent container in multi-stop', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'running' })
      const state = makeState({ containers: [c1] })

      const result = parseCommand('docker stop web ghost', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('ghost')
    })
  })

  describe('docker ps filters', () => {
    it('filters by status=stopped', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'running' })
      const c2 = makeContainer({ id: 'bbb', name: 'api', status: 'stopped' })
      const state = makeState({ containers: [c1, c2] })

      const result = parseCommand('docker ps -a --filter status=stopped', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('api')
      expect(result.output).not.toContain('web')
    })

    it('filters by name', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web-server', status: 'running' })
      const c2 = makeContainer({ id: 'bbb', name: 'api', status: 'running' })
      const state = makeState({ containers: [c1, c2] })

      const result = parseCommand('docker ps --filter name=web', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('web-server')
      expect(result.output).not.toContain('api')
    })

    it('rejects unknown filter', () => {
      const result = parseCommand('docker ps --filter image=nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid filter')
    })

    it('returns only IDs with -q', () => {
      const c1 = makeContainer({ id: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345', name: 'web', status: 'running' })
      const state = makeState({ containers: [c1] })

      const result = parseCommand('docker ps -q', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toBe('abc123def456')
    })

    it('returns full IDs with -q --no-trunc', () => {
      const c1 = makeContainer({ id: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345', name: 'web', status: 'running' })
      const state = makeState({ containers: [c1] })

      const result = parseCommand('docker ps -q --no-trunc', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toBe('abc123def456abc123def456abc123def456abc123def456abc123def456abc12345')
    })
  })

  describe('docker tag', () => {
    it('creates a tagged copy of an image', () => {
      const state = makeState()
      const updateState = vi.fn()

      const result = parseCommand('docker tag nginx myrepo/nginx:v1', state, updateState)
      expect(result.success).toBe(true)
      const images = updateState.mock.calls[0][0].images
      const tagged = images.find((i: DockerImage) => i.name === 'myrepo/nginx' && i.tag === 'v1')
      expect(tagged).toBeDefined()
      expect(tagged.layers).toEqual(state.images.find(i => i.name === 'nginx')!.layers)
    })

    it('defaults target tag to latest', () => {
      const state = makeState()
      const updateState = vi.fn()

      const result = parseCommand('docker tag nginx myrepo/nginx', state, updateState)
      expect(result.success).toBe(true)
      const images = updateState.mock.calls[0][0].images
      expect(images.find((i: DockerImage) => i.name === 'myrepo/nginx' && i.tag === 'latest')).toBeDefined()
    })

    it('rejects tagging non-existent source', () => {
      const result = parseCommand('docker tag ghost myrepo/ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such image')
    })

    it('rejects duplicate target', () => {
      const result = parseCommand('docker tag nginx nginx:latest', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('requires both source and target', () => {
      const result = parseCommand('docker tag nginx', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker history', () => {
    it('shows history for an image', () => {
      const state = makeState()

      const result = parseCommand('docker history nginx', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('IMAGE')
      expect(result.output).toContain('CREATED BY')
      expect(result.output).toContain('FROM nginx:latest')
    })

    it('rejects non-existent image', () => {
      const result = parseCommand('docker history ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such image')
    })

    it('requires image name', () => {
      const result = parseCommand('docker history', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker system prune', () => {
    it('removes stopped containers and unused images', () => {
      const c1 = makeContainer({ id: 'aaa', name: 'web', status: 'running', image: 'nginx:latest' })
      const c2 = makeContainer({ id: 'bbb', name: 'old', status: 'stopped', image: 'node:20-alpine' })
      const images = [
        makeImage({ name: 'nginx', tag: 'latest' }),
        makeImage({ name: 'node', tag: '20-alpine' }),
        makeImage({ name: 'unused', tag: 'latest' }),
      ]
      const state = makeState({ containers: [c1, c2], images })
      const updateState = vi.fn()

      const result = parseCommand('docker system prune', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('1 stopped container')
      expect(result.output).toContain('2 unused image')
      const newState = updateState.mock.calls[0][0]
      expect(newState.containers).toHaveLength(1)
      expect(newState.containers[0].name).toBe('web')
      expect(newState.images).toHaveLength(1)
      expect(newState.images[0].name).toBe('nginx')
    })

    it('rejects unknown system subcommand', () => {
      const result = parseCommand('docker system info', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('unknown command')
    })
  })

  describe('docker run with volumes', () => {
    it('parses -v volume flag', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -v /data:/app/data nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.volumes).toEqual(['/data:/app/data'])
    })

    it('parses multiple -v flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -v /data:/data -v /logs:/logs nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.volumes).toEqual(['/data:/data', '/logs:/logs'])
    })

    it('container has empty volumes when no -v flags', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.volumes).toEqual([])
    })
  })

  describe('docker stop with paused container', () => {
    it('stops a paused container', () => {
      const container = makeContainer({ name: 'web', status: 'paused' })
      const state = makeState({ containers: [container] })
      const updateState = vi.fn()

      const result = parseCommand('docker stop web', state, updateState)
      expect(result.success).toBe(true)
      expect(updateState.mock.calls[0][0].containers[0].status).toBe('stopped')
    })
  })

  describe('docker inspect with volumes', () => {
    it('includes volumes in inspect output', () => {
      const container = makeContainer({ name: 'web', volumes: ['/data:/app/data'] })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker inspect web', state, noopUpdate)
      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.output)
      expect(parsed.Volumes).toEqual(['/data:/app/data'])
    })
  })

  describe('docker network', () => {
    it('lists default networks', () => {
      const result = parseCommand('docker network ls', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('bridge')
      expect(result.output).toContain('host')
    })

    it('creates a new network', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker network create my-net', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toHaveLength(64)
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.networks.find(n => n.name === 'my-net')).toBeDefined()
    })

    it('rejects duplicate network name', () => {
      const result = parseCommand('docker network create bridge', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('removes a network', () => {
      const updateState = vi.fn()
      const state = makeState()
      // bridge has no active containers by default
      const result = parseCommand('docker network rm bridge', state, updateState)
      expect(result.success).toBe(true)
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.networks.find(n => n.name === 'bridge')).toBeUndefined()
    })

    it('rejects removing network with active containers', () => {
      const network: DockerNetwork = { id: 'net1', name: 'app-net', driver: 'bridge', containers: ['abc123'], created: Date.now() }
      const state = makeState({ networks: [network] })
      const result = parseCommand('docker network rm app-net', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('active endpoints')
    })

    it('connects a container to a network', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const network: DockerNetwork = { id: 'net1', name: 'app-net', driver: 'bridge', containers: [], created: Date.now() }
      const state = makeState({ containers: [container], networks: [network] })
      const updateState = vi.fn()

      const result = parseCommand('docker network connect app-net web', state, updateState)
      expect(result.success).toBe(true)
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.networks[0].containers).toContain(container.id)
      expect(newState.containers[0].networks).toContain('app-net')
    })

    it('disconnects a container from a network', () => {
      const container = makeContainer({ name: 'web', status: 'running', networks: ['app-net'] })
      const network: DockerNetwork = { id: 'net1', name: 'app-net', driver: 'bridge', containers: [container.id], created: Date.now() }
      const state = makeState({ containers: [container], networks: [network] })
      const updateState = vi.fn()

      const result = parseCommand('docker network disconnect app-net web', state, updateState)
      expect(result.success).toBe(true)
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.networks[0].containers).not.toContain(container.id)
      expect(newState.containers[0].networks).not.toContain('app-net')
    })

    it('rejects connecting to non-existent network', () => {
      const container = makeContainer({ name: 'web' })
      const state = makeState({ containers: [container] })
      const result = parseCommand('docker network connect ghost web', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such network')
    })

    it('requires subcommand', () => {
      const result = parseCommand('docker network', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('subcommand required')
    })

    it('rejects unknown subcommand', () => {
      const result = parseCommand('docker network inspect', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('unknown command')
    })
  })

  describe('docker volume', () => {
    it('lists volumes', () => {
      const result = parseCommand('docker volume ls', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('DRIVER')
      expect(result.output).toContain('no volumes')
    })

    it('creates a volume', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker volume create my-data', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toBe('my-data')
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.volumes.find(v => v.name === 'my-data')).toBeDefined()
    })

    it('rejects duplicate volume name', () => {
      const vol: DockerVolume = { id: 'vol1', name: 'my-data', driver: 'local', mountpoint: '/var/lib/docker/volumes/my-data/_data', created: Date.now() }
      const state = makeState({ volumes: [vol] })
      const result = parseCommand('docker volume create my-data', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('removes a volume', () => {
      const vol: DockerVolume = { id: 'vol1', name: 'my-data', driver: 'local', mountpoint: '/var/lib/docker/volumes/my-data/_data', created: Date.now() }
      const state = makeState({ volumes: [vol] })
      const updateState = vi.fn()

      const result = parseCommand('docker volume rm my-data', state, updateState)
      expect(result.success).toBe(true)
      const newState = updateState.mock.calls[0][0] as DockerState
      expect(newState.volumes).toHaveLength(0)
    })

    it('rejects removing non-existent volume', () => {
      const result = parseCommand('docker volume rm ghost', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such volume')
    })

    it('requires subcommand', () => {
      const result = parseCommand('docker volume', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('subcommand required')
    })
  })

  describe('docker cp', () => {
    it('copies from container to host', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker cp web:/etc/nginx.conf ./nginx.conf', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Successfully copied')
      expect(result.output).toContain('from')
    })

    it('copies from host to container', () => {
      const container = makeContainer({ name: 'web', status: 'running' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker cp ./nginx.conf web:/etc/nginx.conf', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Successfully copied')
      expect(result.output).toContain('to')
    })

    it('rejects cp with non-existent container', () => {
      const result = parseCommand('docker cp ghost:/file ./file', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('rejects cp with stopped container', () => {
      const container = makeContainer({ name: 'web', status: 'stopped' })
      const state = makeState({ containers: [container] })

      const result = parseCommand('docker cp web:/file ./file', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })

    it('rejects cp without container reference', () => {
      const result = parseCommand('docker cp ./file1 ./file2', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('container path')
    })

    it('requires both source and dest', () => {
      const result = parseCommand('docker cp ./file', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker run with --network', () => {
    it('assigns network to container', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -d --name web --network my-net nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.networks).toEqual(['my-net'])
    })

    it('defaults to bridge network when --network not specified', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker run -d --name web nginx', makeState(), updateState)
      expect(result.success).toBe(true)
      const created = updateState.mock.calls[0][0].containers.at(-1)
      expect(created.networks).toEqual(['bridge'])
    })
  })

  describe('docker commit', () => {
    it('creates a new image from a container', () => {
      const updateState = vi.fn()
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker commit test-container myimage:v1', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('sha256:')
      const newImages = updateState.mock.calls[0][0].images
      expect(newImages.some((i: DockerImage) => i.name === 'myimage' && i.tag === 'v1')).toBe(true)
    })

    it('rejects commit of non-existent container', () => {
      const result = parseCommand('docker commit nonexistent myimage', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('rejects commit to existing image name:tag', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker commit test-container nginx:latest', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('requires both container and image args', () => {
      const result = parseCommand('docker commit test-container', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker stats', () => {
    it('shows stats for running containers', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker stats', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('CONTAINER ID')
      expect(result.output).toContain('CPU')
    })

    it('shows empty message when no running containers', () => {
      const result = parseCommand('docker stats', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('No running containers')
    })
  })

  describe('docker top', () => {
    it('shows processes in a running container', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker top test-container', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('PID')
      expect(result.output).toContain('CMD')
    })

    it('rejects top on a stopped container', () => {
      const state = makeState({ containers: [makeContainer({ status: 'stopped' })] })
      const result = parseCommand('docker top test-container', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })

    it('rejects top on non-existent container', () => {
      const result = parseCommand('docker top nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires container name', () => {
      const result = parseCommand('docker top', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker diff', () => {
    it('shows filesystem changes for a container', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker diff test-container', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('C /var')
      expect(result.output).toContain('A /var/log/app.log')
    })

    it('rejects diff on non-existent container', () => {
      const result = parseCommand('docker diff nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires container name', () => {
      const result = parseCommand('docker diff', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker port', () => {
    it('shows port mappings for a container', () => {
      const state = makeState({ containers: [makeContainer({ ports: ['8080:80'] })] })
      const result = parseCommand('docker port test-container', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('80/tcp -> 0.0.0.0:8080')
    })

    it('shows empty output for container with no ports', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker port test-container', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toBe('')
    })

    it('rejects port on non-existent container', () => {
      const result = parseCommand('docker port nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires container name', () => {
      const result = parseCommand('docker port', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker save', () => {
    it('saves an existing image', () => {
      const result = parseCommand('docker save nginx:latest', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Saved image nginx:latest')
    })

    it('rejects saving non-existent image', () => {
      const result = parseCommand('docker save nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such image')
    })

    it('requires image name', () => {
      const result = parseCommand('docker save', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker load', () => {
    it('loads an image with -i flag', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker load -i backup.tar', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Loaded image')
      const newImages = updateState.mock.calls[0][0].images
      expect(newImages.some((i: DockerImage) => i.name === 'loaded-image')).toBe(true)
    })

    it('requires -i flag or input', () => {
      const result = parseCommand('docker load', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker export', () => {
    it('exports a container filesystem', () => {
      const state = makeState({ containers: [makeContainer()] })
      const result = parseCommand('docker export test-container', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Exported container')
    })

    it('rejects exporting non-existent container', () => {
      const result = parseCommand('docker export nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('No such container')
    })

    it('requires container name', () => {
      const result = parseCommand('docker export', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker import', () => {
    it('imports a tarball with custom name', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker import archive.tar myimage:v2', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('sha256:')
      const newImages = updateState.mock.calls[0][0].images
      expect(newImages.some((i: DockerImage) => i.name === 'myimage' && i.tag === 'v2')).toBe(true)
    })

    it('uses default name when none provided', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker import archive.tar', makeState(), updateState)
      expect(result.success).toBe(true)
      const newImages = updateState.mock.calls[0][0].images
      expect(newImages.some((i: DockerImage) => i.name === 'imported-image')).toBe(true)
    })

    it('requires file argument', () => {
      const result = parseCommand('docker import', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('requires')
    })
  })

  describe('docker build', () => {
    it('builds an image with -t flag', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker build -t myapp:latest .', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Successfully tagged myapp:latest')
      const newImages = updateState.mock.calls[0][0].images
      expect(newImages.some((i: DockerImage) => i.name === 'myapp' && i.tag === 'latest')).toBe(true)
    })

    it('requires -t flag', () => {
      const result = parseCommand('docker build .', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('-t flag is required')
    })

    it('replaces existing image with same name:tag', () => {
      const updateState = vi.fn()
      const state = makeState({ images: [makeImage({ name: 'myapp', tag: 'latest' })] })
      const result = parseCommand('docker build -t myapp:latest .', state, updateState)
      expect(result.success).toBe(true)
      const updatedImages = updateState.mock.calls[0][0].images
      const myappImages = updatedImages.filter((i: DockerImage) => i.name === 'myapp' && i.tag === 'latest')
      expect(myappImages.length).toBe(1)
    })
  })

  describe('docker push', () => {
    it('pushes an existing image', () => {
      const result = parseCommand('docker push nginx:latest', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('docker.io/library/nginx')
      expect(result.output).toContain('Pushed')
    })

    it('rejects pushing non-existent image', () => {
      const result = parseCommand('docker push nonexistent:latest', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('does not exist locally')
    })

    it('requires image name', () => {
      const result = parseCommand('docker push', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker login / logout', () => {
    it('login succeeds', () => {
      const result = parseCommand('docker login', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Login Succeeded')
    })

    it('logout succeeds', () => {
      const result = parseCommand('docker logout', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Logout Succeeded')
    })
  })

  describe('docker search', () => {
    it('returns results for a known image', () => {
      const result = parseCommand('docker search nginx', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('nginx')
      expect(result.output).toContain('NAME')
    })

    it('returns no results for unknown search', () => {
      const result = parseCommand('docker search zzz_nonexistent_zzz', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('No results found')
    })

    it('requires search term', () => {
      const result = parseCommand('docker search', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })
  })

  describe('docker service', () => {
    it('shows help with --help', () => {
      const result = parseCommand('docker service --help', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Commands:')
    })

    it('shows help with no subcommand', () => {
      const result = parseCommand('docker service', makeState(), noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Commands:')
    })

    it('creates a new service', () => {
      const updateState = vi.fn()
      const result = parseCommand('docker service create --name web --replicas 3 nginx:latest', makeState(), updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('Service web created')
      expect(result.output).toContain('3 replica')
      const services = updateState.mock.calls[0][0].services
      expect(services.length).toBe(1)
      expect(services[0].name).toBe('web')
      expect(services[0].replicas).toBe(3)
    })

    it('rejects creating service without image', () => {
      const result = parseCommand('docker service create --name web', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('image required')
    })

    it('rejects duplicate service name', () => {
      const state = makeState({
        services: [{
          id: 'svc1', name: 'web', image: 'nginx:latest',
          replicas: 1, desiredReplicas: 1, ports: [], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service create --name web nginx:latest', state, noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('lists services', () => {
      const state = makeState({
        services: [{
          id: 'svc123456789012345678901', name: 'web', image: 'nginx:latest',
          replicas: 2, desiredReplicas: 3, ports: ['80:80'], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service ls', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('web')
      expect(result.output).toContain('nginx:latest')
    })

    it('removes a service', () => {
      const updateState = vi.fn()
      const state = makeState({
        services: [{
          id: 'svc1', name: 'web', image: 'nginx:latest',
          replicas: 1, desiredReplicas: 1, ports: [], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service rm web', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('removed')
      expect(updateState.mock.calls[0][0].services.length).toBe(0)
    })

    it('rejects removing non-existent service', () => {
      const result = parseCommand('docker service rm nonexistent', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('no such service')
    })

    it('scales a service', () => {
      const updateState = vi.fn()
      const state = makeState({
        services: [{
          id: 'svc1', name: 'web', image: 'nginx:latest',
          replicas: 1, desiredReplicas: 1, ports: [], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service scale web=5', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('scaled to 5')
      const updated = updateState.mock.calls[0][0].services[0]
      expect(updated.replicas).toBe(5)
      expect(updated.desiredReplicas).toBe(5)
    })

    it('rejects scale with invalid format', () => {
      const result = parseCommand('docker service scale web', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Usage')
    })

    it('updates a service image', () => {
      const updateState = vi.fn()
      const state = makeState({
        services: [{
          id: 'svc1', name: 'web', image: 'nginx:1.0',
          replicas: 1, desiredReplicas: 1, ports: [], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service update web --image nginx:2.0', state, updateState)
      expect(result.success).toBe(true)
      expect(result.output).toContain('nginx:1.0')
      expect(result.output).toContain('nginx:2.0')
      expect(updateState.mock.calls[0][0].services[0].image).toBe('nginx:2.0')
    })

    it('inspects a service', () => {
      const state = makeState({
        services: [{
          id: 'svc1', name: 'web', image: 'nginx:latest',
          replicas: 2, desiredReplicas: 2, ports: ['80:80'], created: Date.now(),
        }],
      })
      const result = parseCommand('docker service inspect web', state, noopUpdate)
      expect(result.success).toBe(true)
      expect(result.output).toContain('"Name": "web"')
      expect(result.output).toContain('"Image": "nginx:latest"')
    })

    it('rejects unknown subcommand', () => {
      const result = parseCommand('docker service unknown', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('unknown subcommand')
    })
  })
})
