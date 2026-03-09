import { Achievement } from '@/lib/types'
import { AchievementBadge } from './AchievementBadge'
import { Sparkle } from '@phosphor-icons/react'

interface AchievementToastProps {
  achievement: Achievement
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <div className="flex items-center gap-3 p-1">
      <AchievementBadge 
        achievement={achievement} 
        unlocked={true}
        size="sm"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Sparkle weight="fill" className="text-accent text-sm" />
          <p className="font-semibold text-sm">Achievement Unlocked!</p>
        </div>
        <p className="text-sm mt-0.5">{achievement.title}</p>
        <p className="text-xs text-muted-foreground capitalize">{achievement.rarity}</p>
      </div>
    </div>
  )
}
