import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Cube, ShareNetwork, Circle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DockerContainer, DockerNetwork } from '@/lib/types'

interface NetworkGraphProps {
  networks: DockerNetwork[]
  containers: DockerContainer[]
}

const NETWORK_COLORS = [
  'var(--color-accent)',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#6366f1',
  '#22c55e',
]

function getStatusColor(status: DockerContainer['status']): string {
  switch (status) {
    case 'running': return 'text-green-500'
    case 'stopped': return 'text-red-500'
    case 'exited': return 'text-muted-foreground'
    case 'paused': return 'text-yellow-500'
  }
}

function getStatusDot(status: DockerContainer['status']): string {
  switch (status) {
    case 'running': return 'bg-green-500'
    case 'stopped': return 'bg-red-500'
    case 'exited': return 'bg-muted-foreground'
    case 'paused': return 'bg-yellow-500'
  }
}

export function NetworkGraph({ networks, containers }: NetworkGraphProps) {
  // Build a map of container ID -> container for quick lookup
  const containerMap = useMemo(() => {
    const map = new Map<string, DockerContainer>()
    for (const c of containers) map.set(c.id, c)
    return map
  }, [containers])

  // Find containers not connected to any network  
  const orphanContainers = useMemo(() => {
    const connectedIds = new Set<string>()
    for (const net of networks) {
      for (const cid of net.containers) connectedIds.add(cid)
    }
    return containers.filter(c => !connectedIds.has(c.id) && (!c.networks || c.networks.length === 0 || (c.networks.length === 1 && c.networks[0] === 'bridge')))
  }, [networks, containers])

  if (networks.length === 0 && containers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShareNetwork weight="duotone" className="text-muted-foreground text-6xl mb-4" />
        <h3 className="text-lg font-semibold mb-2">No networks yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Create a network with <code className="font-mono bg-muted px-1.5 py-0.5 rounded">docker network create</code>
        </p>
        <code className="mt-4 text-xs font-mono bg-card px-3 py-2 rounded border border-border">
          docker network create my-net
        </code>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Network groups */}
      {networks.map((net, netIdx) => {
        const color = NETWORK_COLORS[netIdx % NETWORK_COLORS.length]
        const connectedContainers = net.containers
          .map(cid => containerMap.get(cid))
          .filter(Boolean) as DockerContainer[]

        return (
          <motion.div
            key={net.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: netIdx * 0.05 }}
          >
            <Card
              className="overflow-hidden"
              style={{ borderColor: `color-mix(in oklch, ${color} 40%, transparent)` }}
            >
              <CardContent className="p-3">
                {/* Network header */}
                <div className="flex items-center gap-2 mb-2">
                  <ShareNetwork weight="duotone" style={{ color }} className="text-lg" />
                  <span className="font-semibold text-sm">{net.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">({net.driver})</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {connectedContainers.length} container{connectedContainers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Connected containers */}
                {connectedContainers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {connectedContainers.map((container) => (
                      <motion.div
                        key={container.id}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border text-xs font-mono',
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', getStatusDot(container.status))} />
                        <Cube weight="duotone" className={cn('text-sm', getStatusColor(container.status))} />
                        <span>{container.name}</span>
                        {container.ports.length > 0 && (
                          <span className="text-muted-foreground">:{container.ports[0]}</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No containers connected</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}

      {/* Orphan containers (on default bridge but not explicitly connected) */}
      {orphanContainers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="border border-dashed border-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Circle weight="duotone" className="text-muted-foreground text-lg" />
              <span className="font-semibold text-sm text-muted-foreground">Default (bridge)</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {orphanContainers.length} container{orphanContainers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {orphanContainers.map((container) => (
                <div
                  key={container.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/30 border border-border/50 text-xs font-mono"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', getStatusDot(container.status))} />
                  <Cube weight="duotone" className={cn('text-sm', getStatusColor(container.status))} />
                  <span>{container.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Running</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Paused</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Stopped</div>
      </div>
    </div>
  )
}
