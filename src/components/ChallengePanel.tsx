import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer, X, Check, Lightbulb } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Challenge } from '@/lib/challenges'
import type { DockerContainer, DockerImage } from '@/lib/types'

interface ChallengePanelProps {
  challenge: Challenge
  containers: DockerContainer[]
  images: DockerImage[]
  startedAt: number
  onComplete: (timeSeconds: number) => void
  onQuit: () => void
}

export function ChallengePanel({ challenge, containers, images, startedAt, onComplete, onQuit }: ChallengePanelProps) {
  const [elapsed, setElapsed] = useState(0)
  const [showHint, setShowHint] = useState(-1)
  const [completed, setCompleted] = useState(false)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const remaining = Math.max(0, challenge.timeLimit - elapsed)
  const timedOut = remaining <= 0 && !completed

  // Check objectives
  const objectiveResults = useMemo(() => {
    return challenge.objectives.map(obj => ({
      ...obj,
      met: obj.check({ containers, images }),
    }))
  }, [challenge.objectives, containers, images])

  const allComplete = objectiveResults.every(o => o.met)

  // Trigger completion
  useEffect(() => {
    if (allComplete && !completed && !timedOut) {
      setCompleted(true)
      onComplete(elapsed)
    }
  }, [allComplete, completed, timedOut, elapsed, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'border-accent/40',
        completed && 'border-green-600/40 glow-accent',
        timedOut && 'border-destructive/40'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{challenge.icon}</span>
                <h3 className="font-bold text-sm">{challenge.title}</h3>
                {completed && (
                  <Badge className="bg-green-600/20 text-green-500 text-[10px] border-green-600/30">
                    Completed in {elapsed}s!
                  </Badge>
                )}
                {timedOut && (
                  <Badge variant="destructive" className="text-[10px]">
                    Time&apos;s up!
                  </Badge>
                )}
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 mb-3">
                <Timer weight="bold" className={cn(
                  'text-sm',
                  remaining <= 10 && !completed ? 'text-destructive animate-pulse' : 'text-muted-foreground'
                )} />
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      remaining <= 10 && !completed ? 'bg-destructive' : 'bg-accent'
                    )}
                    initial={{ width: '100%' }}
                    animate={{ width: completed ? `${((challenge.timeLimit - elapsed) / challenge.timeLimit) * 100}%` : `${(remaining / challenge.timeLimit) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className={cn(
                  'text-xs font-mono w-10 text-right',
                  remaining <= 10 && !completed ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {remaining}s
                </span>
              </div>

              {/* Objectives */}
              <div className="space-y-1.5">
                {objectiveResults.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {obj.met ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"
                        >
                          <Check weight="bold" className="text-green-500" size={10} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          className="w-4 h-4 rounded-full border border-border"
                        />
                      )}
                    </AnimatePresence>
                    <span className={cn(
                      'text-xs',
                      obj.met ? 'text-green-500 line-through' : 'text-foreground'
                    )}>
                      {obj.description}
                    </span>
                  </div>
                ))}
              </div>

              {/* Hints */}
              {!completed && challenge.hints.length > 0 && (
                <div className="mt-3">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => setShowHint(prev => Math.min(prev + 1, challenge.hints.length - 1))}
                  >
                    <Lightbulb size={12} />
                    {showHint < 0 ? 'Show hint' : `Hint ${showHint + 1}/${challenge.hints.length}`}
                  </button>
                  {showHint >= 0 && (
                    <code className="block mt-1 text-xs font-mono bg-muted px-2 py-1 rounded text-accent">
                      {challenge.hints[showHint]}
                    </code>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mt-1 -mr-1"
              onClick={onQuit}
              aria-label="Quit challenge"
            >
              <X />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
