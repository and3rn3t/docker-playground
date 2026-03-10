import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Play, Warning } from '@phosphor-icons/react'
import { sandboxPresets, type SandboxPreset } from '@/lib/sandbox-presets'
import { AnimatePresence, motion } from 'framer-motion'

interface SandboxSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadPreset: (preset: SandboxPreset) => void
}

const difficultyColor: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400',
  intermediate: 'bg-amber-500/20 text-amber-400',
  advanced: 'bg-rose-500/20 text-rose-400',
}

export function SandboxSelector({ open, onOpenChange, onLoadPreset }: SandboxSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const selectedPreset = sandboxPresets.find((p) => p.id === selected)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb weight="duotone" className="text-accent" />
            Sandbox Mode
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Choose a preset scenario to explore, or start from scratch.
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sandboxPresets.map((preset) => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all hover:border-accent/50 ${
                selected === preset.id ? 'border-accent ring-1 ring-accent/30' : 'border-border'
              }`}
              onClick={() => setSelected(preset.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{preset.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${difficultyColor[preset.difficulty]}`}>
                        {preset.difficulty}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {preset.containers.length > 0 && (
                        <span>{preset.containers.length} containers</span>
                      )}
                      {preset.images.length > 0 && (
                        <span>{preset.images.length} images</span>
                      )}
                      {preset.hints.length > 0 && (
                        <span>{preset.hints.length} hints</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AnimatePresence>
          {selectedPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Warning weight="bold" className="mt-0.5 flex-shrink-0" />
                <span>Loading a preset will replace your current containers, images, and networks.</span>
              </div>
              <Button
                className="w-full glow-primary gap-2"
                onClick={() => {
                  onLoadPreset(selectedPreset)
                  onOpenChange(false)
                  setSelected(null)
                }}
              >
                <Play weight="bold" />
                Load "{selectedPreset.title}"
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
