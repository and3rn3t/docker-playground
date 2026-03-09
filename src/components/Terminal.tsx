import { useState, useEffect, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Terminal as TerminalIcon } from '@phosphor-icons/react'
import { TerminalLine } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface TerminalProps {
  lines: TerminalLine[]
  onCommand: (command: string) => void
}

const DOCKER_SUBCOMMANDS = new Set([
  'run', 'ps', 'images', 'stop', 'start', 'rm', 'rmi', 'pull',
  'exec', 'logs', 'inspect', 'rename', 'pause', 'unpause', 'tag',
  'history', 'system', 'prune'
])

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

export function Terminal({ lines, onCommand }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setHistory(prev => [...prev, input])
    setHistoryIndex(-1)
    onCommand(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    }
  }

  const highlightedInput = useMemo(() => highlightCommand(input), [input])

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <TerminalIcon className="text-primary" weight="duotone" />
        <span className="font-semibold text-sm">Docker Terminal</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">Type 'help' for commands</span>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar" role="log" aria-label="Terminal output">
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
                {line.type === 'command' && <span className="text-muted-foreground select-none">$</span>}
                <span className="flex-1">
                  {line.type === 'command' ? highlightCommand(line.content) : line.content}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 bg-muted/30">
        <div className="flex items-center gap-2 relative">
          <span className="text-muted-foreground font-mono text-sm select-none">$</span>
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
              onChange={(e) => setInput(e.target.value)}
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