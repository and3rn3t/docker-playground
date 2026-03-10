import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, FloppyDisk, File, CaretDown, Trash, Lightning } from '@phosphor-icons/react'
import { DOCKERFILE_KEYWORDS, getDockerfileTemplates, simulateBuild, type DockerfileBuildResult } from '@/lib/dockerfile-parser'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SavedDockerfile } from '@/lib/types'

interface DockerfileEditorProps {
  savedDockerfiles: SavedDockerfile[]
  onSave: (name: string, content: string) => void
  onDelete: (id: string) => void
  onBuild: (tag: string, content: string) => void
}

export function DockerfileEditor({ savedDockerfiles, onSave, onDelete, onBuild }: DockerfileEditorProps) {
  const [content, setContent] = useState(getDockerfileTemplates()[0].content)
  const [fileName, setFileName] = useState('Dockerfile')
  const [buildTag, setBuildTag] = useState('myapp:latest')
  const [buildResult, setBuildResult] = useState<DockerfileBuildResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const templates = useMemo(() => getDockerfileTemplates(), [])

  // Sync textarea scroll with highlighted overlay
  const overlayRef = useRef<HTMLPreElement>(null)
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Auto-resize textarea
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
      const spaceIdx = line.search(/\s/)
      if (spaceIdx === -1) {
        const upper = trimmed.toUpperCase()
        if (DOCKERFILE_KEYWORDS.has(upper)) {
          return <span key={i}><span className="text-accent font-bold">{line}</span>{'\n'}</span>
        }
        return <span key={i}>{line}{'\n'}</span>
      }
      const keyword = line.substring(0, spaceIdx).toUpperCase()
      const leadingSpace = line.substring(0, line.indexOf(line.trimStart()[0] || ''))
      if (DOCKERFILE_KEYWORDS.has(keyword.trim())) {
        const rest = line.substring(spaceIdx)
        return (
          <span key={i}>
            {leadingSpace}<span className="text-accent font-bold">{keyword.trim()}</span>
            <span className="text-foreground">{rest}</span>{'\n'}
          </span>
        )
      }
      return <span key={i}>{line}{'\n'}</span>
    })
  }, [content])

  const handleBuild = useCallback(() => {
    if (!buildTag.trim()) {
      toast.error('Image tag required', { description: 'Enter a name:tag for the image' })
      return
    }
    setIsBuilding(true)
    setBuildResult(null)

    // Simulate build delay for visual effect
    const result = simulateBuild(content, buildTag)
    const totalSteps = result.steps.length
    let currentStep = 0

    if (!result.success) {
      setBuildResult(result)
      setIsBuilding(false)
      toast.error('Build failed', { description: result.errors[0] })
      return
    }

    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= totalSteps) {
        clearInterval(interval)
        setBuildResult(result)
        setIsBuilding(false)
        onBuild(buildTag, content)
        toast.success('Image built successfully', { description: `${result.imageName}:${result.imageTag}` })
      }
    }, 300)
  }, [content, buildTag, onBuild])

  const handleSave = useCallback(() => {
    if (!fileName.trim()) {
      toast.error('Filename required')
      return
    }
    onSave(fileName, content)
    toast.success('Dockerfile saved')
  }, [fileName, content, onSave])

  const loadTemplate = useCallback((templateContent: string) => {
    setContent(templateContent)
    setBuildResult(null)
    setShowTemplates(false)
  }, [])

  const loadSaved = useCallback((df: SavedDockerfile) => {
    setContent(df.content)
    setFileName(df.name)
    setBuildResult(null)
    setShowSaved(false)
  }, [])

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowTemplates(!showTemplates); setShowSaved(false) }}
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
                  onClick={() => loadTemplate(t.content)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowSaved(!showSaved); setShowTemplates(false) }}
            disabled={savedDockerfiles.length === 0}
          >
            <File weight="bold" />
            <span>Saved ({savedDockerfiles.length})</span>
            <CaretDown weight="bold" className="ml-1" />
          </Button>
          {showSaved && savedDockerfiles.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-md shadow-lg min-w-[220px]">
              {savedDockerfiles.map((df) => (
                <div key={df.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md">
                  <button
                    className="text-left text-sm flex-1"
                    onClick={() => loadSaved(df)}
                  >
                    {df.name}
                  </button>
                  <button
                    className="text-destructive hover:text-destructive/80 ml-2 p-1"
                    onClick={() => onDelete(df.id)}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="bg-muted border border-border rounded px-2 py-1 text-xs font-mono w-28"
          placeholder="Filename"
        />
        <Button variant="secondary" size="sm" onClick={handleSave}>
          <FloppyDisk weight="bold" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>

      {/* Editor */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="relative h-full min-h-[200px]">
            {/* Highlighted overlay */}
            <pre
              ref={overlayRef}
              className="absolute inset-0 p-3 font-mono text-sm leading-6 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
              aria-hidden="true"
            >
              {highlightedContent}
            </pre>
            {/* Actual textarea - transparent text so cursor is visible */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); setBuildResult(null) }}
              onScroll={handleScroll}
              className="absolute inset-0 w-full h-full p-3 font-mono text-sm leading-6 bg-transparent text-transparent caret-foreground resize-none outline-none selection:bg-accent/30"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </CardContent>
      </Card>

      {/* Build bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">-t</span>
        <input
          type="text"
          value={buildTag}
          onChange={(e) => setBuildTag(e.target.value)}
          className="bg-muted border border-border rounded px-2 py-1.5 text-sm font-mono flex-1 min-w-0"
          placeholder="image:tag"
        />
        <Button
          onClick={handleBuild}
          disabled={isBuilding}
          className={cn('glow-primary', isBuilding && 'opacity-70')}
          size="sm"
        >
          <Play weight="bold" />
          <span>{isBuilding ? 'Building…' : 'Build'}</span>
        </Button>
      </div>

      {/* Build output */}
      <AnimatePresence>
        {buildResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className={cn(
              'overflow-hidden',
              buildResult.success ? 'border-green-600/40' : 'border-destructive/40'
            )}>
              <CardContent className="p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                {buildResult.success ? (
                  <div className="space-y-1 font-mono text-xs">
                    <p className="text-muted-foreground">Sending build context to Docker daemon  2.048kB</p>
                    {buildResult.steps.map((step, i) => (
                      <div key={i}>
                        <p>
                          <span className="text-accent">Step {i + 1}/{buildResult.steps.length}</span>
                          {' : '}
                          <span className="font-bold">{step.instruction}</span>
                          {' '}{step.args}
                          {step.cached && <span className="text-yellow-500 ml-1">CACHED</span>}
                        </p>
                        <p className="text-muted-foreground"> ---&gt; {step.layerId} ({step.size})</p>
                      </div>
                    ))}
                    <p className="text-green-500 font-semibold mt-2">
                      Successfully tagged {buildResult.imageName}:{buildResult.imageTag}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs text-destructive">
                    {buildResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
