import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { tutorials } from '@/lib/tutorials'
import { TutorialCard } from './TutorialCard'
import { TutorialProgress } from '@/lib/types'

interface TutorialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartTutorial: (tutorialId: string) => void
  tutorialProgresses: Map<string, TutorialProgress>
}

export function TutorialsDialog({ 
  open, 
  onOpenChange, 
  onStartTutorial,
  tutorialProgresses 
}: TutorialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">Interactive Tutorials</DialogTitle>
          <DialogDescription>
            Learn Docker through step-by-step guided tutorials. Start from the basics or jump to advanced topics.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="space-y-4">
            {tutorials.map((tutorial) => {
              const progress = tutorialProgresses.get(tutorial.id)
              return (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  onStart={() => {
                    onStartTutorial(tutorial.id)
                    onOpenChange(false)
                  }}
                  progress={progress}
                />
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
