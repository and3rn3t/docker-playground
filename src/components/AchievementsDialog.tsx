import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AchievementBadge } from '@/components/AchievementBadge'
import { achievements } from '@/lib/achievements'
import { UnlockedAchievement, AchievementCheckData } from '@/lib/types'
import { Sparkle, Lock } from '@phosphor-icons/react'

interface AchievementsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unlockedAchievements: UnlockedAchievement[]
  achievementData: AchievementCheckData
}

export function AchievementsDialog({ 
  open, 
  onOpenChange,
  unlockedAchievements,
  achievementData
}: AchievementsDialogProps) {
  const unlockedIds = useMemo(() => new Set(unlockedAchievements.map(a => a.achievementId)), [unlockedAchievements])
  
  const achievementsByRarity = useMemo(() => ({
    all: achievements,
    legendary: achievements.filter(a => a.rarity === 'legendary'),
    epic: achievements.filter(a => a.rarity === 'epic'),
    rare: achievements.filter(a => a.rarity === 'rare'),
    common: achievements.filter(a => a.rarity === 'common'),
  }), [])

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
              {locked.map((achievement) => {
                const progress = achievement.progress ? achievement.progress(achievementData) : null
                const progressPercent = progress ? Math.round((progress.current / progress.target) * 100) : 0
                
                return (
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
                    {progress && (
                      <div className="mt-2 px-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-mono font-semibold text-primary">
                            {progress.current} / {progress.target}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    )}
                  </div>
                )
              })}
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
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-mono font-semibold">
                    {unlockedCount} / {totalCount}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 glow-accent"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                {progressPercent}%
              </Badge>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(achievementsByRarity).slice(1).map(([rarity, list]) => {
                const unlockedInRarity = list.filter(a => unlockedIds.has(a.id)).length
                const totalInRarity = list.length
                const percentInRarity = totalInRarity > 0 ? Math.round((unlockedInRarity / totalInRarity) * 100) : 0
                
                return (
                  <div key={rarity} className="bg-card border border-border rounded-lg p-2">
                    <div className="text-xs text-muted-foreground capitalize mb-1">{rarity}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-semibold">{unlockedInRarity}/{totalInRarity}</span>
                      <span className="text-xs text-muted-foreground">{percentInRarity}%</span>
                    </div>
                    <Progress value={percentInRarity} className="h-1 mt-1" />
                  </div>
                )
              })}
            </div>
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

          <div className="h-[48vh] mt-4 pr-4 overflow-y-auto custom-scrollbar">
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
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
