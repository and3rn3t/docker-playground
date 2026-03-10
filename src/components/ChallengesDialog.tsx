import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, Trophy, Play } from '@phosphor-icons/react'
import { challenges, getDifficultyColor, type ChallengeAttempt } from '@/lib/challenges'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ChallengesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChallenge: (challengeId: string) => void
  challengeAttempts: Record<string, ChallengeAttempt>
}

export function ChallengesDialog({ open, onOpenChange, onStartChallenge, challengeAttempts }: ChallengesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy weight="duotone" className="text-accent" />
            Challenges
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {challenges.map((challenge, index) => {
            const attempt = challengeAttempts[challenge.id]
            const completed = attempt?.completed
            const bestTime = attempt?.bestTime

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  'transition-all',
                  completed && 'border-green-600/30 bg-green-500/5'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{challenge.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{challenge.title}</h3>
                          <Badge variant="outline" className={cn('text-[10px]', getDifficultyColor(challenge.difficulty))}>
                            {challenge.difficulty}
                          </Badge>
                          {completed && (
                            <Badge className="bg-green-600/20 text-green-500 text-[10px] border-green-600/30">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Timer size={14} />
                            <span>{challenge.timeLimit}s</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {challenge.objectives.length} objective{challenge.objectives.length !== 1 ? 's' : ''}
                          </div>
                          {bestTime != null && (
                            <div className="text-xs text-accent font-mono">
                              Best: {bestTime}s
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          onStartChallenge(challenge.id)
                          onOpenChange(false)
                        }}
                      >
                        <Play weight="bold" />
                        <span>{completed ? 'Retry' : 'Start'}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
