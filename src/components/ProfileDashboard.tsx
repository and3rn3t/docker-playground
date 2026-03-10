import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { achievements, getTierLabel } from '@/lib/achievements'
import { getDailyChallenge, getTodayString } from '@/lib/daily-challenges'
import type { UnlockedAchievement, AchievementCheckData, StreakData } from '@/lib/types'
import { User, Trophy, Fire, CalendarCheck, Terminal, Cube, Stack, Lightning, Target } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface ProfileDashboardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unlockedAchievements: UnlockedAchievement[]
  achievementData: AchievementCheckData
  streakData: StreakData
  dailyChallengeCompleted: boolean
}

export function ProfileDashboard({
  open,
  onOpenChange,
  unlockedAchievements,
  achievementData,
  streakData,
  dailyChallengeCompleted,
}: ProfileDashboardProps) {
  const unlockedIds = useMemo(
    () => new Set(unlockedAchievements.map((a) => a.achievementId)),
    [unlockedAchievements]
  )

  const stats = useMemo(() => {
    const totalTutorials = Object.values(achievementData.tutorialProgresses).filter(
      (p) => p.completed
    ).length
    const runningContainers = achievementData.containers.filter(
      (c) => c.status === 'running'
    ).length
    const totalContainers = achievementData.containers.length
    const totalImages = achievementData.images.length

    const tieredAchievements = achievements.filter((a) => a.tier)
    const tieredByIcon = new Map<string, typeof tieredAchievements>()
    for (const a of tieredAchievements) {
      const arr = tieredByIcon.get(a.icon) ?? []
      arr.push(a)
      tieredByIcon.set(a.icon, arr)
    }

    const rarityCount = {
      common: achievements.filter((a) => a.rarity === 'common' && unlockedIds.has(a.id)).length,
      rare: achievements.filter((a) => a.rarity === 'rare' && unlockedIds.has(a.id)).length,
      epic: achievements.filter((a) => a.rarity === 'epic' && unlockedIds.has(a.id)).length,
      legendary: achievements.filter((a) => a.rarity === 'legendary' && unlockedIds.has(a.id))
        .length,
    }

    return {
      totalTutorials,
      runningContainers,
      totalContainers,
      totalImages,
      totalCommands: achievementData.totalCommandsExecuted,
      unlockedCount: unlockedAchievements.length,
      totalAchievements: achievements.length,
      tieredByIcon,
      rarityCount,
    }
  }, [achievementData, unlockedAchievements, unlockedIds])

  const dailyChallenge = useMemo(() => getDailyChallenge(), [])

  const recentAchievements = useMemo(
    () =>
      [...unlockedAchievements]
        .sort((a, b) => b.unlockedAt - a.unlockedAt)
        .slice(0, 5)
        .map((ua) => ({
          ...ua,
          achievement: achievements.find((a) => a.id === ua.achievementId),
        })),
    [unlockedAchievements]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User weight="duotone" className="text-primary text-2xl" />
            <span>Profile Dashboard</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-1">
          {/* Streak & Daily Challenge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Fire weight="duotone" className="text-orange-400 text-xl" />
                  <h3 className="font-semibold text-sm">Streak</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono">{streakData.currentStreak}</span>
                  <span className="text-sm text-muted-foreground">day{streakData.currentStreak !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Best: {streakData.longestStreak} day{streakData.longestStreak !== 1 ? 's' : ''}</span>
                  <span>Active days: {streakData.activeDates.length}</span>
                </div>
                {/* Mini calendar - last 7 days */}
                <div className="flex gap-1 mt-3">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - (6 - i))
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    const isActive = streakData.activeDates.includes(dateStr)
                    const isToday = dateStr === getTodayString()
                    return (
                      <div
                        key={dateStr}
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center font-mono ${
                          isActive
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-muted/30 text-muted-foreground border border-border'
                        } ${isToday ? 'ring-1 ring-primary' : ''}`}
                      >
                        {d.getDate()}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Target weight="duotone" className="text-accent text-xl" />
                  <h3 className="font-semibold text-sm">Daily Challenge</h3>
                  {dailyChallengeCompleted && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      <CalendarCheck className="mr-1" /> Done
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-sm">{dailyChallenge.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{dailyChallenge.description}</p>
                <div className="mt-3 space-y-2">
                  {dailyChallenge.objectives.map((obj) => {
                    const complete = obj.check(achievementData)
                    return (
                      <div key={obj.id} className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            complete
                              ? 'border-primary bg-primary/20'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {complete && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            complete ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {obj.description}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Overview */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Lightning weight="duotone" className="text-primary" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Commands', value: stats.totalCommands, icon: Terminal },
                { label: 'Containers', value: stats.totalContainers, icon: Cube, sub: `${stats.runningContainers} running` },
                { label: 'Images', value: stats.totalImages, icon: Stack },
                { label: 'Tutorials', value: stats.totalTutorials, icon: Trophy, sub: 'completed' },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-muted/30 border border-border rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon weight="duotone" className="text-muted-foreground text-sm" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-2xl font-bold font-mono">{stat.value}</span>
                  {stat.sub && (
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Achievement Progress */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Trophy weight="duotone" className="text-accent" />
              Achievement Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Overall</span>
                    <span className="font-mono font-semibold">
                      {stats.unlockedCount}/{stats.totalAchievements}
                    </span>
                  </div>
                  <Progress
                    value={Math.round(
                      (stats.unlockedCount / stats.totalAchievements) * 100
                    )}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['common', 'Common'],
                    ['rare', 'Rare'],
                    ['epic', 'Epic'],
                    ['legendary', 'Legendary'],
                  ] as const
                ).map(([key, label]) => {
                  const total = achievements.filter((a) => a.rarity === key).length
                  const unlocked = stats.rarityCount[key]
                  return (
                    <div key={key} className="bg-card border border-border rounded-lg p-2">
                      <div className="text-xs text-muted-foreground capitalize mb-1">
                        {label}
                      </div>
                      <span className="text-sm font-mono font-semibold">
                        {unlocked}/{total}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tiered Achievements */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Tiered Achievements</h3>
            <div className="space-y-2">
              {Array.from(stats.tieredByIcon.entries()).map(([icon, tiers]) => {
                const sorted = [...tiers].sort((a, b) => {
                  const order = { bronze: 0, silver: 1, gold: 2 }
                  return (order[a.tier ?? 'bronze'] ?? 0) - (order[b.tier ?? 'bronze'] ?? 0)
                })
                return (
                  <div
                    key={icon}
                    className="flex items-center gap-3 bg-muted/20 border border-border rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {sorted.map((a) => {
                          const isUnlocked = unlockedIds.has(a.id)
                          return (
                            <span
                              key={a.id}
                              className={`text-sm ${isUnlocked ? '' : 'opacity-30 grayscale'}`}
                              title={`${a.title} — ${a.description}`}
                            >
                              {getTierLabel(a.tier)}
                            </span>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sorted[0].title.split(' ')[0]} track
                      </p>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {sorted.filter((a) => unlockedIds.has(a.id)).length}/{sorted.length}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Achievements</h3>
              <div className="space-y-2">
                {recentAchievements.map(
                  (ua) =>
                    ua.achievement && (
                      <div
                        key={ua.achievementId}
                        className="flex items-center gap-3 bg-muted/20 border border-border rounded-lg p-2"
                      >
                        <span className="text-sm">
                          {ua.achievement.tier ? getTierLabel(ua.achievement.tier) : '🏆'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{ua.achievement.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ua.achievement.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ua.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
