import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Terminal as TerminalIcon } from '@phosphor-icons/react'
import { TerminalLine, DockerContainer, DockerImage } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface TerminalProps {
  lines: TerminalLine[]
  onCommand: (command: string) => void
  containers?: DockerContainer[]
  images?: DockerImage[]
}

const DOCKER_SUBCOMMANDS = new Set([
  'run', 'ps', 'images', 'stop', 'start', 'rm', 'rmi', 'pull', 'push',
  'exec', 'logs', 'inspect', 'rename', 'pause', 'unpause', 'tag',
  'history', 'system', 'prune', 'network', 'volume', 'cp',
  'commit', 'stats', 'top', 'diff', 'port', 'save', 'load', 'export', 'import',
  'build', 'login', 'logout', 'search', 'service'
])

const COMPLETABLE_SUBCOMMANDS = [
  'run', 'ps', 'images', 'stop', 'start', 'rm', 'rmi', 'pull', 'push',
  'exec', 'logs', 'inspect', 'rename', 'pause', 'unpause', 'tag',
  'history', 'system', 'network', 'volume', 'cp',
  'commit', 'stats', 'top', 'diff', 'port', 'save', 'load', 'export', 'import',
  'build', 'login', 'logout', 'search', 'service'
]

const NETWORK_SUBCOMMANDS = ['create', 'ls', 'rm', 'connect', 'disconnect']
const VOLUME_SUBCOMMANDS = ['create', 'ls', 'rm']
const SYSTEM_SUBCOMMANDS = ['prune']
const SERVICE_SUBCOMMANDS = ['create', 'ls', 'rm', 'scale', 'update', 'inspect']

function getCompletions(
  input: string,
  containers: DockerContainer[],
  images: DockerImage[]
): string[] {
  const parts = input.trimStart().split(/\s+/)

  // Complete top-level: "" or partial first word
  if (parts.length <= 1) {
    const partial = parts[0] || ''
    const options = ['docker', 'help', 'clear']
    return options.filter(o => o.startsWith(partial) && o !== partial)
  }

  // After "docker", complete subcommand
  if (parts[0] === 'docker' && parts.length === 2) {
    const partial = parts[1]
    return COMPLETABLE_SUBCOMMANDS.filter(s => s.startsWith(partial) && s !== partial)
  }

  const sub = parts[1]

  // "docker network <sub>"
  if (sub === 'network' && parts.length === 3) {
    const partial = parts[2]
    return NETWORK_SUBCOMMANDS.filter(s => s.startsWith(partial) && s !== partial)
  }

  // "docker volume <sub>"
  if (sub === 'volume' && parts.length === 3) {
    const partial = parts[2]
    return VOLUME_SUBCOMMANDS.filter(s => s.startsWith(partial) && s !== partial)
  }

  // "docker system <sub>"
  if (sub === 'system' && parts.length === 3) {
    const partial = parts[2]
    return SYSTEM_SUBCOMMANDS.filter(s => s.startsWith(partial) && s !== partial)
  }

  // "docker service <sub>"
  if (sub === 'service' && parts.length === 3) {
    const partial = parts[2]
    return SERVICE_SUBCOMMANDS.filter(s => s.startsWith(partial) && s !== partial)
  }

  // Complete container names for commands that take containers
  const containerCommands = new Set(['stop', 'start', 'rm', 'exec', 'logs', 'inspect', 'rename', 'pause', 'unpause', 'cp', 'commit', 'top', 'diff', 'port', 'export'])
  if (containerCommands.has(sub)) {
    const lastPart = parts[parts.length - 1]
    // Skip flags
    if (lastPart.startsWith('-')) return []
    const names = containers.map(c => c.name)
    return names.filter(n => n.startsWith(lastPart) && n !== lastPart)
  }

  // Complete image names for commands that take images
  const imageCommands = new Set(['rmi', 'run', 'history', 'tag', 'save'])
  if (imageCommands.has(sub)) {
    const lastPart = parts[parts.length - 1]
    if (lastPart.startsWith('-')) return []
    const imageRefs = images.map(i => `${i.name}:${i.tag}`)
    return imageRefs.filter(r => r.startsWith(lastPart) && r !== lastPart)
  }

  return []
}

function highlightCommand(text: string): React.ReactNode {
  const parts = text.split(/(\s+)/)
  const nodes: React.ReactNode[] = []
  let pastDocker = false
  let pastSubcommand = false

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (/^\s+$/.test(part)) {
      nodes.push(part)
      continue
    }

    if (part === 'docker' && !pastDocker) {
      nodes.push(<span key={i} className="text-primary font-semibold">{part}</span>)
      pastDocker = true
    } else if (pastDocker && !pastSubcommand && DOCKER_SUBCOMMANDS.has(part)) {
      nodes.push(<span key={i} className="text-accent">{part}</span>)
      pastSubcommand = true
    } else if (part.startsWith('-')) {
      nodes.push(<span key={i} className="text-secondary">{part}</span>)
    } else if (pastDocker) {
      nodes.push(<span key={i} className="text-foreground/90">{part}</span>)
    } else {
      nodes.push(<span key={i} className="text-primary">{part}</span>)
    }
  }

  return <>{nodes}</>
}

export function Terminal({ lines, onCommand, containers = [], images = [] }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [tabCompletions, setTabCompletions] = useState<string[]>([])
  const [tabIndex, setTabIndex] = useState(-1)
  const [reverseSearchActive, setReverseSearchActive] = useState(false)
  const [reverseSearchQuery, setReverseSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Reset tab state when input changes via typing
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    setTabCompletions([])
    setTabIndex(-1)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setHistory(prev => [...prev, input])
    setHistoryIndex(-1)
    setTabCompletions([])
    setTabIndex(-1)
    onCommand(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const completions = tabCompletions.length > 0
        ? tabCompletions
        : getCompletions(input, containers, images)

      if (completions.length === 0) return

      if (tabCompletions.length === 0) {
        setTabCompletions(completions)
      }

      const nextIndex = (tabIndex + 1) % completions.length
      setTabIndex(nextIndex)

      // Replace the last partial token with the completion
      const parts = input.trimStart().split(/\s+/)
      parts[parts.length - 1] = completions[nextIndex]
      setInput(parts.join(' ') + ' ')
      return
    }

    // Any non-tab key resets tab state
    if (e.key !== 'Tab') {
      setTabCompletions([])
      setTabIndex(-1)
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(newIndex)
      setInput(history[newIndex] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === -1) return
      const newIndex = historyIndex + 1
      if (newIndex >= history.length) {
        setHistoryIndex(-1)
        setInput('')
      } else {
        setHistoryIndex(newIndex)
        setInput(history[newIndex] || '')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      onCommand('clear')
    } else if (e.key === 'r' && e.ctrlKey) {
      e.preventDefault()
      setReverseSearchActive(true)
      setReverseSearchQuery('')
    }
  }

  const highlightedInput = useMemo(() => highlightCommand(input), [input])

  const reverseSearchMatch = useMemo(() => {
    if (!reverseSearchActive || !reverseSearchQuery) return null
    return [...history].reverse().find(cmd =>
      cmd.toLowerCase().includes(reverseSearchQuery.toLowerCase())
    ) || null
  }, [reverseSearchActive, reverseSearchQuery, history])

  const handleReverseSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setReverseSearchActive(false)
      setReverseSearchQuery('')
      inputRef.current?.focus()
    } else if (e.key === 'Enter') {
      if (reverseSearchMatch) {
        setInput(reverseSearchMatch)
      }
      setReverseSearchActive(false)
      setReverseSearchQuery('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <TerminalIcon className="text-primary" weight="duotone" />
        <span className="font-semibold text-sm">Docker Terminal</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">Type 'help' for commands</span>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar" role="log" aria-label="Terminal output" aria-live="polite">
        <div className="space-y-1 font-mono text-sm">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={
                  line.type === 'command'
                    ? 'flex items-start gap-2'
                    : line.type === 'error'
                    ? 'text-destructive pl-4'
                    : line.type === 'success'
                    ? 'text-accent pl-4'
                    : 'text-foreground/80 pl-4 whitespace-pre-wrap'
                }
              >
                {line.type === 'command' && <span className="text-muted-foreground select-none" aria-hidden="true">$</span>}
                <span className="flex-1">
                  {line.type === 'command' ? highlightCommand(line.content) : line.content}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 bg-muted/30">
        {reverseSearchActive && (
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-muted-foreground">
            <span className="text-primary">(reverse-i-search)</span>
            <Input
              value={reverseSearchQuery}
              onChange={(e) => setReverseSearchQuery(e.target.value)}
              onKeyDown={handleReverseSearchKeyDown}
              placeholder="type to search history..."
              className="font-mono text-xs h-7 bg-background/50 border-input"
              autoFocus
            />
            {reverseSearchMatch && (
              <span className="text-accent truncate max-w-[200px]">{reverseSearchMatch}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 relative">
          <span className="text-muted-foreground font-mono text-sm select-none" aria-hidden="true">$</span>
          <div className="relative flex-1">
            <div
              aria-hidden
              className="absolute inset-0 flex items-center font-mono text-sm px-3 pointer-events-none whitespace-pre"
            >
              {input ? highlightedInput : null}
            </div>
            <Input
              ref={inputRef}
              id="terminal-input"
              aria-label="Docker terminal input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="docker ps"
              className="font-mono text-sm bg-background/50 border-input focus-visible:ring-primary text-transparent caret-foreground"
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>
      </form>
    </div>
  )
}