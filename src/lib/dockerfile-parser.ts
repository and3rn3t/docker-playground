import { DockerfileInstruction } from './types'

const VALID_INSTRUCTIONS = new Set([
  'FROM', 'RUN', 'CMD', 'LABEL', 'EXPOSE', 'ENV', 'ADD', 'COPY',
  'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD',
  'STOPSIGNAL', 'HEALTHCHECK', 'SHELL', 'MAINTAINER',
])

export interface DockerfileBuildStep {
  instruction: string
  args: string
  layerId: string
  size: string
  cached: boolean
}

export interface DockerfileBuildResult {
  success: boolean
  imageName: string
  imageTag: string
  steps: DockerfileBuildStep[]
  errors: string[]
  totalSize: string
}

export function parseDockerfile(content: string): {
  instructions: DockerfileInstruction[]
  errors: string[]
} {
  const lines = content.split('\n')
  const instructions: DockerfileInstruction[] = []
  const errors: string[] = []
  let continuationBuffer = ''
  let continuationStartLine = -1

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Skip empty lines and pure comments
    if (trimmed === '' || trimmed.startsWith('#')) continue

    // Handle line continuation
    if (trimmed.endsWith('\\')) {
      if (continuationBuffer === '') {
        continuationStartLine = i + 1
      }
      continuationBuffer += trimmed.slice(0, -1).trim() + ' '
      continue
    }

    let fullLine: string
    let lineNumber: number
    if (continuationBuffer) {
      fullLine = continuationBuffer + trimmed
      lineNumber = continuationStartLine
      continuationBuffer = ''
    } else {
      fullLine = trimmed
      lineNumber = i + 1
    }

    // Parse instruction
    const spaceIdx = fullLine.indexOf(' ')
    if (spaceIdx === -1) {
      const instruction = fullLine.toUpperCase()
      if (VALID_INSTRUCTIONS.has(instruction)) {
        if (instruction === 'FROM') {
          errors.push(`Line ${lineNumber}: FROM requires a base image argument`)
        } else {
          instructions.push({ line: lineNumber, instruction, args: '' })
        }
      } else {
        errors.push(`Line ${lineNumber}: Unknown instruction '${fullLine}'`)
      }
      continue
    }

    const instruction = fullLine.substring(0, spaceIdx).toUpperCase()
    const args = fullLine.substring(spaceIdx + 1).trim()

    if (!VALID_INSTRUCTIONS.has(instruction)) {
      errors.push(`Line ${lineNumber}: Unknown instruction '${instruction}'`)
      continue
    }

    instructions.push({ line: lineNumber, instruction, args })
  }

  // Validate FROM is the first instruction (ARG can precede it)
  const firstNonArg = instructions.find(i => i.instruction !== 'ARG')
  if (!firstNonArg || firstNonArg.instruction !== 'FROM') {
    errors.push('Dockerfile must begin with a FROM instruction (or ARG before FROM)')
  }

  return { instructions, errors }
}

function randomLayerId(): string {
  return Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

function randomSize(instruction: string): string {
  const sizes: Record<string, [number, number]> = {
    FROM: [20, 200],
    RUN: [1, 100],
    COPY: [0.1, 50],
    ADD: [0.5, 80],
  }
  const range = sizes[instruction] ?? [0, 0.01]
  const size = range[0] + Math.random() * (range[1] - range[0])
  return size >= 1 ? `${size.toFixed(1)}MB` : `${(size * 1024).toFixed(0)}kB`
}

export function simulateBuild(
  content: string,
  tagArg: string
): DockerfileBuildResult {
  const { instructions, errors } = parseDockerfile(content)

  if (errors.length > 0) {
    return {
      success: false,
      imageName: '',
      imageTag: '',
      steps: [],
      errors,
      totalSize: '0MB',
    }
  }

  // Parse tag
  let imageName = tagArg
  let imageTag = 'latest'
  if (tagArg.includes(':')) {
    const [n, t] = tagArg.split(':')
    imageName = n
    imageTag = t || 'latest'
  }

  if (!imageName) {
    return {
      success: false,
      imageName: '',
      imageTag: '',
      steps: [],
      errors: ['docker build: -t flag requires a name argument (e.g. -t myapp:v1)'],
      totalSize: '0MB',
    }
  }

  const steps: DockerfileBuildStep[] = instructions.map((inst) => ({
    instruction: inst.instruction,
    args: inst.args,
    layerId: randomLayerId(),
    size: randomSize(inst.instruction),
    cached: Math.random() > 0.6, // ~40% cache-hit simulation
  }))

  // Calculate total size
  let totalMB = 0
  for (const step of steps) {
    if (step.size.endsWith('MB')) {
      totalMB += parseFloat(step.size)
    } else if (step.size.endsWith('kB')) {
      totalMB += parseFloat(step.size) / 1024
    }
  }

  return {
    success: true,
    imageName,
    imageTag,
    steps,
    errors: [],
    totalSize: `${Math.round(totalMB)}MB`,
  }
}

export function getDockerfileTemplates(): { name: string; content: string }[] {
  return [
    {
      name: 'Node.js App',
      content: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]`,
    },
    {
      name: 'Python Flask',
      content: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
ENV FLASK_APP=app.py
CMD ["flask", "run", "--host=0.0.0.0"]`,
    },
    {
      name: 'Nginx Static Site',
      content: `FROM nginx:alpine
COPY ./html /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
    },
    {
      name: 'Go App (Multi-stage)',
      content: `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app/server .

FROM alpine:3.19
COPY --from=builder /app/server /usr/local/bin/server
EXPOSE 8080
CMD ["server"]`,
    },
    {
      name: 'Empty',
      content: `FROM ubuntu:22.04
`,
    },
  ]
}

/** Syntax-highlight keywords for display */
export const DOCKERFILE_KEYWORDS = VALID_INSTRUCTIONS
