import { TutorialProgress } from '@/lib/types'
import { tutorials } from '@/lib/tutorials'
import { GraduationCap, CheckCircle, Circle } from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface TutorialProgressTrackerProps {
  tutorialProgresses: Map<string, TutorialProgress>
}

export function TutorialProgressTracker({ tutorialProgresses }: TutorialProgressTrackerProps) {
  const completedCount = Array.from(tutorialProgresses.values()).filter(p => p.completed).length
  const totalCount = tutorials.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (completedCount === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 glow-accent hover:bg-accent/10 transition-all"
        >
          <GraduationCap weight="duotone" className="text-accent" />
          <span className="font-mono font-semibold">
            <span className="text-accent">{completedCount}</span>
            <span className="text-muted-foreground">/{totalCount}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <GraduationCap weight="duotone" className="text-accent" />
              Tutorial Progress
            </h4>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} tutorials completed
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-mono font-semibold text-accent">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="space-y-2">
            {tutorials.map(tutorial => {
              const progress = tutorialProgresses.get(tutorial.id)
              const isCompleted = progress?.completed || false
              const isInProgress = progress && !progress.completed

              return (
                <div
                  key={tutorial.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {isCompleted ? (
                    <CheckCircle weight="fill" className="text-accent text-xl shrink-0 mt-0.5" />
                  ) : isInProgress ? (
                    <Circle weight="duotone" className="text-primary text-xl shrink-0 mt-0.5" />
                  ) : (
                    <Circle weight="regular" className="text-muted-foreground text-xl shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{tutorial.title}</div>
                    {isInProgress && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Step {(progress?.currentStepIndex || 0) + 1} of {tutorial.steps.length}
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-xs text-accent mt-0.5">Completed</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {completedCount === totalCount && (
            <div className="p-3 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
              <p className="text-sm font-semibold text-center">
                🎉 All tutorials completed!
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                You've mastered Docker basics
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
