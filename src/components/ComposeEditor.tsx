import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, ArrowDown, Lightning, CaretDown, Stop } from '@phosphor-icons/react'
import { parseComposeFile, getComposeTemplates, type ComposeParseResult } from '@/lib/compose-parser'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const COMPOSE_KEYWORDS = new Set([
  'services', 'networks', 'volumes', 'version', 'name',
  'image', 'ports', 'environment', 'depends_on', 'command',
  'container_name', 'restart', 'build', 'healthcheck',
])

interface ComposeEditorProps {
  onComposeUp: (content: string) => void
  onComposeDown: () => void
  hasRunningCompose: boolean
}

export function ComposeEditor({ onComposeUp, onComposeDown, hasRunningCompose }: ComposeEditorProps) {
  const [content, setContent] = useState(getComposeTemplates()[0].content)
  const [parseResult, setParseResult] = useState<ComposeParseResult | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLPreElement>(null)
  const templates = useMemo(() => getComposeTemplates(), [])

  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.max(200, ta.scrollHeight)}px`
    }
  }, [content])

  const highlightedContent = useMemo(() => {
    return content.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        return <span key={i} className="text-muted-foreground italic">{line}{'\n'}</span>
      }
      if (trimmed.startsWith('- ')) {
        const leadingSpace = line.substring(0, line.indexOf('-'))
        const value = trimmed.substring(2)
        return (
          <span key={i}>
            {leadingSpace}<span className="text-muted-foreground">- </span>
            <span className="text-orange-400">{value}</span>{'\n'}
          </span>
        )
      }
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx)
        const value = trimmed.substring(colonIdx + 1)
        const leadingSpace = line.substring(0, line.indexOf(trimmed[0]))
        const isKeyword = COMPOSE_KEYWORDS.has(key.trim())
        return (
          <span key={i}>
            {leadingSpace}
            <span className={isKeyword ? 'text-accent font-bold' : 'text-blue-400'}>{key}</span>
            <span className="text-muted-foreground">:</span>
            {value && <span className="text-orange-400">{value}</span>}
            {'\n'}
          </span>
        )
      }
      return <span key={i}>{line}{'\n'}</span>
    })
  }, [content])

  const handleUp = useCallback(() => {
    const result = parseComposeFile(content)
    setParseResult(result)
    if (result.success) {
      onComposeUp(content)
      toast.success('Compose up!', { description: `${result.config!.services.length} service(s) started` })
    } else {
      toast.error('Compose validation failed', { description: result.errors[0] })
    }
  }, [content, onComposeUp])

  const handleDown = useCallback(() => {
    onComposeDown()
    setParseResult(null)
    toast.success('Compose down', { description: 'All compose services stopped and removed' })
  }, [onComposeDown])

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <Lightning weight="bold" />
            <span>Templates</span>
            <CaretDown weight="bold" className="ml-1" />
          </Button>
          {showTemplates && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-md shadow-lg min-w-[200px]">
              {templates.map((t) => (
                <button
                  key={t.name}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                  onClick={() => { setContent(t.content); setShowTemplates(false); setParseResult(null) }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono">docker-compose.yml</span>
      </div>

      {/* Editor */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="relative h-full min-h-[200px]">
            <pre
              ref={overlayRef}
              className="absolute inset-0 p-3 font-mono text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
              aria-hidden="true"
            >
              {highlightedContent}
            </pre>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); setParseResult(null) }}
              onScroll={handleScroll}
              className="absolute inset-0 w-full h-full p-3 font-mono text-sm leading-6 bg-transparent text-transparent caret-foreground resize-none outline-none selection:bg-accent/30"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleUp}
          disabled={hasRunningCompose}
          className="glow-primary flex-1"
          size="sm"
        >
          <Play weight="bold" />
          <span>Compose Up</span>
        </Button>
        <Button
          onClick={handleDown}
          disabled={!hasRunningCompose}
          variant="destructive"
          size="sm"
          className="flex-1"
        >
          <Stop weight="bold" />
          <span>Compose Down</span>
        </Button>
      </div>

      {/* Validation output */}
      <AnimatePresence>
        {parseResult && !parseResult.success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-destructive/40">
              <CardContent className="p-3">
                <div className="space-y-1 font-mono text-xs text-destructive">
                  {parseResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {parseResult?.success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-green-600/40">
              <CardContent className="p-3">
                <div className="space-y-1 font-mono text-xs">
                  {parseResult.config!.services.map((svc, i) => (
                    <p key={i}>
                      <span className="text-green-500">✓</span>{' '}
                      <span className="font-bold">{svc.name}</span>{' '}
                      <span className="text-muted-foreground">({svc.image})</span>
                      {svc.ports.length > 0 && <span className="text-accent"> ports: {svc.ports.join(', ')}</span>}
                    </p>
                  ))}
                  <p className="text-green-500 mt-1">
                    {parseResult.config!.services.length} service(s) running
                    {parseResult.config!.networks.length > 0 && `, ${parseResult.config!.networks.length} network(s)`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
