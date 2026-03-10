import { DockerImage } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash, Stack } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useMemo } from 'react'

const LAYER_COLORS = [
  'bg-blue-500/70',
  'bg-emerald-500/70',
  'bg-violet-500/70',
  'bg-amber-500/70',
  'bg-rose-500/70',
  'bg-cyan-500/70',
  'bg-fuchsia-500/70',
  'bg-lime-500/70',
]

interface ImageCardProps {
  image: DockerImage
  onRemove: () => void
}

export function ImageCard({ image, onRemove }: ImageCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Generate deterministic "sizes" for each layer based on layer ID hash
  const layerSizes = useMemo(() => {
    return image.layers.map((layer) => {
      let hash = 0
      for (let i = 0; i < layer.length; i++) hash = ((hash << 5) - hash + layer.charCodeAt(i)) | 0
      return Math.abs(hash % 60) + 20 // 20-80% width
    })
  }, [image.layers])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
    >
      <Card
        className="p-4 border-2 border-border hover:border-primary/50 transition-all cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`Image ${image.name}:${image.tag}, ${image.layers.length} layers`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Stack weight="duotone" className="text-primary flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{image.name}</h3>
              <Badge variant="outline" className="font-mono text-xs">
                {image.tag}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span className="text-primary">ID:</span>
                <span className="truncate">{image.id.substring(0, 12)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">Size:</span>
                <span>{image.size}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">Layers:</span>
                <span>{image.layers.length}</span>
              </div>
            </div>

            {/* Visual layer stack preview (always visible) */}
            <div className="mt-2 flex gap-0.5">
              {image.layers.map((layer, idx) => (
                <motion.div
                  key={layer}
                  className={`h-1.5 rounded-full ${LAYER_COLORS[idx % LAYER_COLORS.length]}`}
                  style={{ flex: layerSizes[idx] }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                />
              ))}
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 pt-3 border-t border-border"
                >
                  <div className="text-xs text-muted-foreground mb-2">Image Layers:</div>
                  <div className="space-y-1.5">
                    {image.layers.map((layer, idx) => (
                      <motion.div
                        key={layer}
                        className="flex items-center gap-2 text-xs font-mono"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <div className={`w-3 h-3 rounded ${LAYER_COLORS[idx % LAYER_COLORS.length]}`} />
                        <span className="text-muted-foreground">Layer {idx + 1}:</span>
                        <span className="text-foreground/60 truncate">{layer}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove image ${image.name}:${image.tag}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                  }}
                  className="hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                >
                  <Trash weight="fill" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove Image</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    </motion.div>
  )
}