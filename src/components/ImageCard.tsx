import { DockerImage } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash, Stack } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'

interface ImageCardProps {
  image: DockerImage
  onRemove: () => void
}

export function ImageCard({ image, onRemove }: ImageCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
    >
      <Card className="p-4 border-2 border-border hover:border-primary/50 transition-all cursor-pointer" onClick={() => setExpanded(!expanded)}>
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

            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 pt-3 border-t border-border"
              >
                <div className="text-xs text-muted-foreground mb-2">Image Layers:</div>
                <div className="space-y-1">
                  {image.layers.map((layer, idx) => (
                    <div key={layer} className="flex items-center gap-2 text-xs font-mono">
                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                      <span className="text-muted-foreground">Layer {idx + 1}:</span>
                      <span className="text-foreground/60">{layer}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
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