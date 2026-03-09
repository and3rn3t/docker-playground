import { Tutorial, TutorialStep } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Circle, 
  Lightbulb, 
  X, 
  ArrowRight,
  Copy
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useState } from 'react'

interface TutorialPanelProps {
  tutorial: Tutorial
  currentStepIndex: number
  completedSteps: string[]
  onExit: () => void
}

export function TutorialPanel({ 
  tutorial, 
  currentStepIndex, 
  completedSteps,
  onExit 
}: TutorialPanelProps) {
  const [showHints, setShowHints] = useState(false)
  const currentStep = tutorial.steps[currentStepIndex]
  const progress = ((completedSteps.length) / tutorial.steps.length) * 100

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command)
    toast.success('Command copied to clipboard!')
  }

  const getCommandToCopy = (step: TutorialStep): string => {
    if (Array.isArray(step.expectedCommand)) {
      return step.expectedCommand[0]
    }
    return step.expectedCommand
  }

  return (
    <Card className="border-2 border-primary/30 shadow-lg glow-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-primary text-primary-foreground">
                Tutorial Mode
              </Badge>
              <Badge variant="outline">
                Step {currentStepIndex + 1} of {tutorial.steps.length}
              </Badge>
            </div>
            <CardTitle className="text-lg">{tutorial.title}</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onExit}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={20} weight="bold" />
          </Button>
        </div>
        
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div>
              <h3 className="font-semibold text-base mb-1.5 flex items-center gap-2">
                <ArrowRight size={18} weight="bold" className="text-accent" />
                {currentStep.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Expected Command
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyCommand(getCommandToCopy(currentStep))}
                  className="h-6 px-2"
                >
                  <Copy size={14} />
                  <span className="text-xs">Copy</span>
                </Button>
              </div>
              <code className="font-mono text-sm text-foreground block">
                {getCommandToCopy(currentStep)}
              </code>
            </div>

            {currentStep.hints && currentStep.hints.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHints(!showHints)}
                  className="gap-2"
                >
                  <Lightbulb size={16} weight={showHints ? 'fill' : 'regular'} />
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </Button>

                <AnimatePresence>
                  {showHints && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {currentStep.hints.map((hint, index) => (
                          <div 
                            key={index} 
                            className="flex items-start gap-2 text-sm text-muted-foreground bg-card p-2 rounded border border-border"
                          >
                            <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-accent" weight="fill" />
                            <span>{hint}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tutorial Progress</span>
            <span className="font-mono">{completedSteps.length}/{tutorial.steps.length} completed</span>
          </div>
          
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {tutorial.steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = index === currentStepIndex
              
              return (
                <div 
                  key={step.id}
                  className="flex items-center"
                >
                  {isCompleted ? (
                    <CheckCircle 
                      size={16} 
                      weight="fill" 
                      className="text-accent"
                    />
                  ) : isCurrent ? (
                    <Circle 
                      size={16} 
                      weight="bold" 
                      className="text-primary animate-pulse"
                    />
                  ) : (
                    <Circle 
                      size={16} 
                      weight="regular" 
                      className="text-muted-foreground"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
