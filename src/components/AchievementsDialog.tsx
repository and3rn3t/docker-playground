import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AchievementBadge } from '@/components/AchievementBadge'
import { achievements } from '@/lib/achievements'
import { UnlockedAchievement } from '@/lib/types'
import { Sparkle, Lock } from '@phosphor-icons/react'

interface AchievementsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unlockedAchievements: UnlockedAchievement[]
}

export function AchievementsDialog({ 
  open, 
  onOpenChange,
  unlockedAchievements 
}: AchievementsDialogProps) {
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId))
  
  const achievementsByRarity = {
    all: achievements,
    legendary: achievements.filter(a => a.rarity === 'legendary'),
    epic: achievements.filter(a => a.rarity === 'epic'),
    rare: achievements.filter(a => a.rarity === 'rare'),
    common: achievements.filter(a => a.rarity === 'common'),
  }

  const unlockedCount = unlockedAchievements.length
  const totalCount = achievements.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  const renderAchievementList = (list: typeof achievements) => {
    const unlocked = list.filter(a => unlockedIds.has(a.id))
    const locked = list.filter(a => !unlockedIds.has(a.id))
    
    return (
      <div className="space-y-6">
        {unlocked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkle weight="duotone" className="text-accent" />
              <h3 className="text-sm font-semibold text-accent">Unlocked ({unlocked.length})</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {unlocked.map((achievement) => {
                const unlockData = unlockedAchievements.find(u => u.achievementId === achievement.id)
                return (
                  <div 
                    key={achievement.id}
                    className="group cursor-pointer"
                  >
                    <AchievementBadge 
                      achievement={achievement} 
                      unlocked={true}
                      size="lg"
                      showTitle
                    />
                    <p className="text-xs text-center text-muted-foreground mt-2 px-2">
                      {achievement.description}
                    </p>
                    {unlockData && (
                      <p className="text-xs text-center text-muted-foreground/60 mt-1">
                        {new Date(unlockData.unlockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock weight="duotone" className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground">Locked ({locked.length})</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {locked.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="group cursor-pointer"
                >
                  <AchievementBadge 
                    achievement={achievement} 
                    unlocked={false}
                    size="lg"
                    showTitle
                  />
                  <p className="text-xs text-center text-muted-foreground mt-2 px-2">
                    {achievement.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Sparkle weight="duotone" className="text-accent text-2xl" />
            <span>Achievements</span>
          </DialogTitle>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono font-semibold">
                  {unlockedCount} / {totalCount}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500 glow-accent"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <Badge variant="secondary" className="font-mono">
              {progressPercent}%
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All
              <Badge variant="outline" className="ml-1 text-xs">
                {achievements.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="legendary">
              Legendary
              <Badge variant="outline" className="ml-1 text-xs">
                {achievementsByRarity.legendary.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="epic">
              Epic
              <Badge variant="outline" className="ml-1 text-xs">
                {achievementsByRarity.epic.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rare">
              Rare
              <Badge variant="outline" className="ml-1 text-xs">
                {achievementsByRarity.rare.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="common">
              Common
              <Badge variant="outline" className="ml-1 text-xs">
                {achievementsByRarity.common.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-4 pr-4">
            <TabsContent value="all">
              {renderAchievementList(achievementsByRarity.all)}
            </TabsContent>
            <TabsContent value="legendary">
              {renderAchievementList(achievementsByRarity.legendary)}
            </TabsContent>
            <TabsContent value="epic">
              {renderAchievementList(achievementsByRarity.epic)}
            </TabsContent>
            <TabsContent value="rare">
              {renderAchievementList(achievementsByRarity.rare)}
            </TabsContent>
            <TabsContent value="common">
              {renderAchievementList(achievementsByRarity.common)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
