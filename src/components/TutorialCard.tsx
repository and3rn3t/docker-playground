import { Tutorial } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Rocket, Stack as StackIcon, ArrowsClockwise, Gear, Tag, Broom } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface TutorialCardProps {
  tutorial: Tutorial
  onStart: () => void
  progress?: { currentStepIndex: number; completed: boolean }
}

const iconMap = {
  rocket: Rocket,
  stack: StackIcon,
  cycle: ArrowsClockwise,
  gear: Gear,
  tag: Tag,
  broom: Broom
}

const difficultyColors = {
  beginner: 'bg-accent text-accent-foreground',
  intermediate: 'bg-secondary text-secondary-foreground',
  advanced: 'bg-primary text-primary-foreground'
}

export function TutorialCard({ tutorial, onStart, progress }: TutorialCardProps) {
  const Icon = iconMap[tutorial.icon as keyof typeof iconMap] || Rocket
  const isInProgress = progress && !progress.completed && progress.currentStepIndex > 0
  const isCompleted = progress?.completed

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden hover:border-primary/50 transition-all duration-200">
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent text-accent-foreground">
              ✓ Completed
            </Badge>
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Icon size={32} weight="duotone" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{tutorial.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {tutorial.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={difficultyColors[tutorial.difficulty]}>
                {tutorial.difficulty}
              </Badge>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock size={16} />
                <span>{tutorial.estimatedTime}</span>
              </div>
              {isInProgress && (
                <Badge variant="outline" className="border-primary text-primary">
                  {progress.currentStepIndex}/{tutorial.steps.length} steps
                </Badge>
              )}
            </div>

            <Button 
              onClick={onStart}
              className={isInProgress ? 'glow-primary' : ''}
            >
              {isCompleted ? 'Restart' : isInProgress ? 'Continue' : 'Start'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
