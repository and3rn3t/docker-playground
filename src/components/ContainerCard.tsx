import { DockerContainer } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Stop, Trash, ShareNetwork } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useEffect, useMemo } from 'react'

interface ContainerCardProps {
  container: DockerContainer
  onStop: () => void
  onStart: () => void
  onRemove: () => void
}

function useSimulatedStats(isRunning: boolean) {
  const [stats, setStats] = useState({ cpu: 0, memory: 0 })

  useEffect(() => {
    if (!isRunning) {
      setStats({ cpu: 0, memory: 0 })
      return
    }

    // Set initial random values
    setStats({
      cpu: Math.random() * 12 + 1,
      memory: Math.random() * 40 + 10,
    })

    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.max(0.1, Math.min(100, prev.cpu + (Math.random() - 0.5) * 4)),
        memory: Math.max(5, Math.min(95, prev.memory + (Math.random() - 0.5) * 3)),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [isRunning])

  return stats
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function ContainerCard({ container, onStop, onStart, onRemove }: ContainerCardProps) {
  const isRunning = container.status === 'running'
  const isPaused = container.status === 'paused'
  const stats = useSimulatedStats(isRunning)
  const created = useMemo(() => relativeTime(container.created), [container.created])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
    >
      <Card
        className={`p-4 border-2 transition-all ${isRunning ? 'border-accent/50 glow-running' : isPaused ? 'border-yellow-600/50 glow-accent' : 'border-border'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isRunning && (
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                </span>
              )}
              <h3 className="font-semibold text-lg truncate">{container.name}</h3>
              <Badge
                variant={isRunning || isPaused ? 'default' : 'secondary'}
                className={
                  isRunning
                    ? 'bg-accent text-accent-foreground'
                    : isPaused
                      ? 'bg-yellow-600 text-white'
                      : ''
                }
              >
                {container.status}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{created}</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span className="text-primary">ID:</span>
                <span className="truncate">{container.id.substring(0, 12)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">Image:</span>
                <span className="truncate">{container.image}</span>
              </div>
              {container.ports.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-primary">Ports:</span>
                  <span className="truncate">{container.ports.join(', ')}</span>
                </div>
              )}
              {container.env && Object.keys(container.env).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-primary">Env:</span>
                  <span className="truncate">
                    {Object.entries(container.env)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')}
                  </span>
                </div>
              )}
              {container.volumes && container.volumes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-primary">Volumes:</span>
                  <span className="truncate">{container.volumes.join(', ')}</span>
                </div>
              )}
            </div>
            {container.networks && container.networks.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <ShareNetwork weight="duotone" className="text-muted-foreground text-xs" />
                {container.networks.map((net) => (
                  <Badge key={net} variant="outline" className="text-[10px] px-1.5 py-0">
                    {net}
                  </Badge>
                ))}
              </div>
            )}
            {isRunning && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary w-8">CPU</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${stats.cpu}%` }}
                      transition={{ duration: 1, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className="text-muted-foreground w-10 text-right font-mono">{stats.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary w-8">MEM</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ width: `${stats.memory}%` }}
                      transition={{ duration: 1, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className="text-muted-foreground w-10 text-right font-mono">{stats.memory.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              {isRunning || isPaused ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onStop}
                      aria-label={`Stop container ${container.name}`}
                      className="hover:bg-secondary hover:text-secondary-foreground"
                    >
                      <Stop weight="fill" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop Container</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onStart}
                      aria-label={`Start container ${container.name}`}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      <Play weight="fill" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start Container</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRemove}
                    aria-label={`Remove container ${container.name}`}
                    className="hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash weight="fill" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove Container</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
