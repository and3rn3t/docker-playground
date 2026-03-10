import { useState, useEffect } from 'react'
import { Terminal } from '@/components/Terminal'
import { ContainerCard } from '@/components/ContainerCard'
import { ImageCard } from '@/components/ImageCard'
import { HelpDialog } from '@/components/HelpDialog'
import { TutorialsDialog } from '@/components/TutorialsDialog'
import { TutorialPanel } from '@/components/TutorialPanel'
import { TutorialProgressTracker } from '@/components/TutorialProgressTracker'
import { AchievementsDialog } from '@/components/AchievementsDialog'
import { AchievementToast } from '@/components/AchievementToast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Question, Cube, Stack as StackIcon, GraduationCap, Rocket, X, Sparkle, Sun, Moon, FileCode, ShareNetwork, Trophy, StackSimple, Export, GameController, User } from '@phosphor-icons/react'
import { getAchievementById } from '@/lib/achievements'
import { toast, Toaster } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { useDockerState } from '@/hooks/useDockerState'
import { useTheme } from '@/hooks/useTheme'
import { DockerfileEditor } from '@/components/DockerfileEditor'
import { NetworkGraph } from '@/components/NetworkGraph'
import { ChallengesDialog } from '@/components/ChallengesDialog'
import { ChallengePanel } from '@/components/ChallengePanel'
import { ComposeEditor } from '@/components/ComposeEditor'
import { ExportDialog } from '@/components/ExportDialog'
import { Onboarding } from '@/components/Onboarding'
import { SandboxSelector } from '@/components/SandboxSelector'
import { ProfileDashboard } from '@/components/ProfileDashboard'

function App() {
  const {
    currentContainers,
    currentImages,
    terminalLines,
    activeTutorial,
    activeTutorialProgress,
    unlockedAchievements,
    totalCommandsExecuted,
    tutorialProgresses,
    quickStartVisible,
    runningCount,
    tutorialProgressesMap,
    handleCommand,
    handleStartTutorial,
    handleDismissQuickStart,
    handleExitTutorial,
    handleStopContainer,
    handleStartContainer,
    handleRemoveContainer,
    handleRemoveImage,
    handleSaveDockerfile,
    handleDeleteDockerfile,
    handleBuildDockerfile,
    savedDockerfiles,
    currentNetworks,
    activeChallenge,
    activeChallengeAttempt,
    challengeAttempts,
    handleStartChallenge,
    handleCompleteChallenge,
    handleQuitChallenge,
    handleComposeUp,
    handleComposeDown,
    hasRunningCompose,
    handleImportSnapshot,
    showOnboarding,
    handleCompleteOnboarding,
    handleLoadSandbox,
    streakData,
    dailyChallengeCompleted,
  } = useDockerState()

  const { theme, toggleTheme } = useTheme()

  const [helpOpen, setHelpOpen] = useState(false)
  const [tutorialsOpen, setTutorialsOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [challengesOpen, setChallengesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [sandboxOpen, setSandboxOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Show achievement toasts when new achievements are unlocked
  const [lastAchievementCount, setLastAchievementCount] = useState(unlockedAchievements.length)
  useEffect(() => {
    if (unlockedAchievements.length > lastAchievementCount) {
      const newlyUnlocked = unlockedAchievements.slice(lastAchievementCount)
      newlyUnlocked.forEach(ua => {
        const achievement = getAchievementById(ua.achievementId)
        if (achievement) {
          toast(<AchievementToast achievement={achievement} />, { duration: 5000 })
        }
      })
      setLastAchievementCount(unlockedAchievements.length)
    }
  }, [unlockedAchievements.length, lastAchievementCount, unlockedAchievements])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#terminal-input" className="skip-nav">Skip to terminal</a>
      <div className="terminal-grid fixed inset-0 opacity-20 pointer-events-none" aria-hidden="true"></div>
      
      <div className="relative">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Docker Playground</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Learn Docker commands in an interactive sandbox
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <Cube weight="duotone" className="text-accent" />
                  <span className="font-mono">
                    <span className="text-accent font-semibold">{runningCount}</span>
                    <span className="text-muted-foreground"> / {currentContainers.length} running</span>
                  </span>
                </div>
                <TutorialProgressTracker tutorialProgresses={tutorialProgressesMap} />
                <Button onClick={() => setAchievementsOpen(true)} variant="secondary" size="sm" aria-label="View achievements">
                  <Sparkle weight="bold" />
                  <span className="hidden sm:inline">Achievements</span>
                  {(unlockedAchievements || []).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-mono">
                      {(unlockedAchievements || []).length}
                    </span>
                  )}
                </Button>
                <Button onClick={() => setTutorialsOpen(true)} variant="default" size="sm" className="glow-primary" aria-label="View tutorials">
                  <GraduationCap weight="bold" />
                  <span className="hidden sm:inline">Tutorials</span>
                </Button>
                <Button onClick={() => setChallengesOpen(true)} variant="secondary" size="sm" aria-label="View challenges">
                  <Trophy weight="bold" />
                  <span className="hidden sm:inline">Challenges</span>
                </Button>
                <Button onClick={() => setExportOpen(true)} variant="secondary" size="sm" aria-label="Export & Share">
                  <Export weight="bold" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button onClick={() => setSandboxOpen(true)} variant="secondary" size="sm" aria-label="Sandbox mode">
                  <GameController weight="bold" />
                  <span className="hidden sm:inline">Sandbox</span>
                </Button>
                <Button onClick={() => setProfileOpen(true)} variant="secondary" size="sm" aria-label="Profile">
                  <User weight="bold" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
                <Button onClick={() => setHelpOpen(true)} variant="outline" size="sm" aria-label="Show help">
                  <Question weight="bold" />
                  <span className="hidden sm:inline">Help</span>
                </Button>
                <Button onClick={toggleTheme} variant="ghost" size="sm" aria-label="Toggle theme">
                  {theme === 'dark' ? <Sun weight="bold" /> : <Moon weight="bold" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <AnimatePresence>
                {quickStartVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-accent bg-gradient-to-br from-card to-accent/5 glow-accent">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 rounded-lg bg-accent/20 glow-accent">
                              <Rocket weight="duotone" className="text-accent text-2xl" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">Quick Start</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                New to Docker? Start with our beginner tutorial and learn the basics in just 5 minutes!
                              </p>
                              <div className="flex items-center gap-3">
                                <Button 
                                  onClick={() => handleStartTutorial('getting-started')} 
                                  className="glow-primary"
                                  size="sm"
                                >
                                  <Rocket weight="bold" />
                                  <span>Start Tutorial</span>
                                </Button>
                                <Button 
                                  onClick={handleDismissQuickStart} 
                                  variant="ghost" 
                                  size="sm"
                                >
                                  <span>Maybe later</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={handleDismissQuickStart}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-2 -mt-2"
                            aria-label="Dismiss quick start"
                          >
                            <X />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              {activeTutorial && activeTutorialProgress && (
                <TutorialPanel
                  tutorial={activeTutorial}
                  currentStepIndex={activeTutorialProgress.currentStepIndex}
                  completedSteps={activeTutorialProgress.completedSteps}
                  onExit={handleExitTutorial}
                />
              )}
              <AnimatePresence>
                {activeChallenge && activeChallengeAttempt && (
                  <ChallengePanel
                    challenge={activeChallenge}
                    containers={currentContainers}
                    images={currentImages}
                    startedAt={activeChallengeAttempt.startedAt}
                    onComplete={handleCompleteChallenge}
                    onQuit={handleQuitChallenge}
                  />
                )}
              </AnimatePresence>
              <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
                <Terminal lines={terminalLines} onCommand={handleCommand} containers={currentContainers} images={currentImages} />
              </div>
            </div>

            <div>
              <Tabs defaultValue="containers" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="containers" className="gap-1">
                    <Cube weight="duotone" />
                    <span className="hidden sm:inline">Containers</span>
                    {currentContainers.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono">
                        {currentContainers.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="images" className="gap-1">
                    <StackIcon weight="duotone" />
                    <span className="hidden sm:inline">Images</span>
                    {currentImages.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono">
                        {currentImages.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dockerfile" className="gap-1">
                    <FileCode weight="duotone" />
                    <span className="hidden sm:inline">Build</span>
                  </TabsTrigger>
                  <TabsTrigger value="compose" className="gap-1">
                    <StackSimple weight="duotone" />
                    <span className="hidden sm:inline">Compose</span>
                  </TabsTrigger>
                  <TabsTrigger value="networks" className="gap-1">
                    <ShareNetwork weight="duotone" />
                    <span className="hidden sm:inline">Networks</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="containers" className="space-y-3 h-[400px] sm:h-[480px] lg:h-[540px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentContainers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Cube weight="duotone" className="text-muted-foreground text-6xl mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No containers yet</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Create your first container with <code className="font-mono bg-muted px-1.5 py-0.5 rounded">docker run</code>
                      </p>
                      <code className="mt-4 text-xs font-mono bg-card px-3 py-2 rounded border border-border">
                        docker run -d --name web nginx:latest
                      </code>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {currentContainers.map((container) => (
                        <ContainerCard
                          key={container.id}
                          container={container}
                          onStop={() => handleStopContainer(container.id)}
                          onStart={() => handleStartContainer(container.id)}
                          onRemove={() => handleRemoveContainer(container.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </TabsContent>

                <TabsContent value="images" className="space-y-3 h-[400px] sm:h-[480px] lg:h-[540px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <StackIcon weight="duotone" className="text-muted-foreground text-6xl mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No images available</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Pull an image with <code className="font-mono bg-muted px-1.5 py-0.5 rounded">docker pull</code>
                      </p>
                      <code className="mt-4 text-xs font-mono bg-card px-3 py-2 rounded border border-border">
                        docker pull ubuntu:latest
                      </code>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {currentImages.map((image) => (
                        <ImageCard
                          key={image.id}
                          image={image}
                          onRemove={() => handleRemoveImage(image.id)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </TabsContent>

                <TabsContent value="dockerfile" className="h-[400px] sm:h-[480px] lg:h-[540px] overflow-y-auto pr-2 custom-scrollbar">
                  <DockerfileEditor
                    savedDockerfiles={savedDockerfiles}
                    onSave={handleSaveDockerfile}
                    onDelete={handleDeleteDockerfile}
                    onBuild={handleBuildDockerfile}
                  />
                </TabsContent>

                <TabsContent value="compose" className="h-[400px] sm:h-[480px] lg:h-[540px] overflow-y-auto pr-2 custom-scrollbar">
                  <ComposeEditor
                    onComposeUp={handleComposeUp}
                    onComposeDown={handleComposeDown}
                    hasRunningCompose={hasRunningCompose}
                  />
                </TabsContent>

                <TabsContent value="networks" className="h-[400px] sm:h-[480px] lg:h-[540px] overflow-y-auto pr-2 custom-scrollbar">
                  <NetworkGraph networks={currentNetworks} containers={currentContainers} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <TutorialsDialog 
        open={tutorialsOpen} 
        onOpenChange={setTutorialsOpen}
        onStartTutorial={handleStartTutorial}
        tutorialProgresses={tutorialProgressesMap}
      />
      <AchievementsDialog 
        open={achievementsOpen} 
        onOpenChange={setAchievementsOpen}
        unlockedAchievements={unlockedAchievements || []}
        achievementData={{
          tutorialProgresses: tutorialProgresses || {},
          containers: currentContainers,
          images: currentImages,
          totalCommandsExecuted: totalCommandsExecuted || 0
        }}
      />
      <ChallengesDialog
        open={challengesOpen}
        onOpenChange={setChallengesOpen}
        onStartChallenge={handleStartChallenge}
        challengeAttempts={challengeAttempts}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        terminalLines={terminalLines}
        containers={currentContainers}
        images={currentImages}
        networks={currentNetworks}
        tutorialProgresses={tutorialProgresses}
        unlockedAchievements={unlockedAchievements}
        totalCommandsExecuted={totalCommandsExecuted}
        savedDockerfiles={savedDockerfiles}
        onImportSnapshot={handleImportSnapshot}
      />
      <SandboxSelector
        open={sandboxOpen}
        onOpenChange={setSandboxOpen}
        onLoadPreset={handleLoadSandbox}
      />
      <ProfileDashboard
        open={profileOpen}
        onOpenChange={setProfileOpen}
        unlockedAchievements={unlockedAchievements}
        achievementData={{
          tutorialProgresses,
          containers: currentContainers,
          images: currentImages,
          totalCommandsExecuted,
        }}
        streakData={streakData}
        dailyChallengeCompleted={dailyChallengeCompleted}
      />
      <Toaster theme={theme} position="bottom-right" />
      <AnimatePresence>
        {showOnboarding && <Onboarding onComplete={handleCompleteOnboarding} />}
      </AnimatePresence>
    </div>
  )
}

export default App