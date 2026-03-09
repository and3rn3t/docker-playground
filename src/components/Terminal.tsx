import { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Terminal as TerminalIcon } from '@phosphor-icons/react'
import { TerminalLine } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface TerminalProps {
  lines: TerminalLine[]
  onCommand: (command: string) => void
}

export function Terminal({ lines, onCommand }: TerminalProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
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

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <TerminalIcon className="text-primary" weight="duotone" />
        <span className="font-semibold text-sm">Docker Terminal</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">Type 'help' for commands</span>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
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
                    ? 'text-primary flex items-start gap-2'
                    : line.type === 'error'
                    ? 'text-destructive pl-4'
                    : line.type === 'success'
                    ? 'text-accent pl-4'
                    : 'text-foreground/80 pl-4 whitespace-pre-wrap'
                }
              >
                {line.type === 'command' && <span className="text-muted-foreground">$</span>}
                <span className="flex-1">{line.content}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            id="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="docker ps"
            className="font-mono text-sm bg-background/50 border-input focus-visible:ring-primary"
            autoComplete="off"
            autoFocus
          />
        </div>
      </form>
    </div>
  )
}