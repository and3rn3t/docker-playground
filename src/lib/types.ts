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