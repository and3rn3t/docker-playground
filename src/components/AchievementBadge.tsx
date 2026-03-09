import { Achievement } from '@/lib/types'
import { getRarityColor, getRarityGlow } from '@/lib/achievements'
import { 
  Rocket, 
  GraduationCap, 
  Cube, 
  ArrowsClockwise, 
  Gear, 
  BookOpen,
  Trophy,
  Terminal,
  TerminalWindow,
  Lightning,
  Stack,
  Timer,
  SealCheck,
  Broom
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AchievementBadgeProps {
  achievement: Achievement
  unlocked: boolean
  size?: 'sm' | 'md' | 'lg'
  showTitle?: boolean
  className?: string
}

const iconMap: Record<string, React.ComponentType<{ weight?: string; className?: string }>> = {
  'rocket': Rocket,
  'graduation-cap': GraduationCap,
  'cube': Cube,
  'arrows-clockwise': ArrowsClockwise,
  'gear': Gear,
  'book-open': BookOpen,
  'trophy': Trophy,
  'terminal': Terminal,
  'terminal-window': TerminalWindow,
  'lightning': Lightning,
  'stack': Stack,
  'timer': Timer,
  'seal-check': SealCheck,
  'broom': Broom,
}

export function AchievementBadge({ 
  achievement, 
  unlocked, 
  size = 'md',
  showTitle = false,
  className 
}: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon] || Cube
  
  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl'
  }
  
  const rarityColor = getRarityColor(achievement.rarity)
  const rarityGlow = getRarityGlow(achievement.rarity)
  
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          sizeClasses[size],
          unlocked
            ? cn('bg-card border-2', rarityColor, rarityGlow)
            : 'bg-muted/30 border border-border opacity-40 grayscale',
          unlocked && achievement.rarity === 'common' && 'border-muted-foreground',
          unlocked && achievement.rarity === 'rare' && 'border-primary',
          unlocked && achievement.rarity === 'epic' && 'border-secondary',
          unlocked && achievement.rarity === 'legendary' && 'border-accent'
        )}
      >
        <Icon 
          weight={unlocked ? 'duotone' : 'regular'} 
          className={cn(
            'transition-colors',
            unlocked ? rarityColor : 'text-muted-foreground'
          )}
        />
      </div>
      {showTitle && (
        <div className="text-center">
          <p className={cn(
            'text-sm font-semibold',
            unlocked ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {achievement.title}
          </p>
          {unlocked && (
            <p className="text-xs text-muted-foreground capitalize">
              {achievement.rarity}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
