import { describe, it, expect, vi } from 'vitest'
import { parseCommand, DockerState, getInitialImages } from './docker-parser'
import { DockerContainer, DockerImage } from './types'

function makeState(overrides?: Partial<DockerState>): DockerState {
  return {
    containers: overrides?.containers ?? [],
    images: overrides?.images ?? getInitialImages(),
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

    it('rejects pulling already existing image', () => {
      const result = parseCommand('docker pull nginx:latest', makeState(), noopUpdate)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
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
})
