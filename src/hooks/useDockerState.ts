import { useState, useEffect, useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  DockerContainer,
  DockerImage,
  DockerNetwork,
  DockerVolume,
  DockerService,
  TerminalLine,
  TutorialProgress,
  UnlockedAchievement,
  SavedDockerfile,
  StreakData,
} from '@/lib/types'
import { parseCommand, getInitialImages, getInitialNetworks } from '@/lib/docker-parser'
import { simulateBuild } from '@/lib/dockerfile-parser'
import { parseComposeFile, simulateComposeUp } from '@/lib/compose-parser'
import { getTutorialById, checkCommandMatch } from '@/lib/tutorials'
import { checkAchievements } from '@/lib/achievements'
import { getChallengeById, type ChallengeAttempt } from '@/lib/challenges'
import { getDailyChallenge, isDailyChallengeComplete, getTodayString } from '@/lib/daily-challenges'
import type { PlaygroundSnapshot } from '@/lib/export'
import type { SandboxPreset } from '@/lib/sandbox-presets'
import { toast } from 'sonner'
import { generateId } from '@/lib/utils'

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activeDates: [],
}

export function useDockerState() {
  const [containers, setContainers] = useKV<DockerContainer[]>('docker-containers', [])
  const [images, setImages] = useKV<DockerImage[]>('docker-images', getInitialImages())
  const [networks, setNetworks] = useKV<DockerNetwork[]>('docker-networks', getInitialNetworks())
  const [volumes, setVolumes] = useKV<DockerVolume[]>('docker-volumes', [])
  const [tutorialProgresses, setTutorialProgresses] = useKV<Record<string, TutorialProgress>>(
    'tutorial-progresses',
    {}
  )
  const [activeTutorialId, setActiveTutorialId] = useKV<string | null>('active-tutorial', null)
  const [hasSeenQuickStart, setHasSeenQuickStart] = useKV<boolean>('has-seen-quickstart', false)
  const [unlockedAchievements, setUnlockedAchievements] = useKV<UnlockedAchievement[]>(
    'unlocked-achievements',
    []
  )
  const [totalCommandsExecuted, setTotalCommandsExecuted] = useKV<number>(
    'total-commands-executed',
    0
  )
  const [savedDockerfiles, setSavedDockerfiles] = useKV<SavedDockerfile[]>('saved-dockerfiles', [])
  const [challengeAttempts, setChallengeAttempts] = useKV<Record<string, ChallengeAttempt>>(
    'challenge-attempts',
    {}
  )
  const [activeChallengeId, setActiveChallengeId] = useKV<string | null>('active-challenge', null)
  const [composeServiceNames, setComposeServiceNames] = useKV<string[]>('compose-service-names', [])
  const [hasSeenOnboarding, setHasSeenOnboarding] = useKV<boolean>('has-seen-onboarding', false)
  const [services, setServices] = useKV<DockerService[]>('docker-services', [])
  const [streakData, setStreakData] = useKV<StreakData>('streak-data', DEFAULT_STREAK)
  const [completedDailies, setCompletedDailies] = useKV<string[]>('completed-dailies', [])

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'output',
      content: 'Welcome to Docker Playground! Type "help" to see available commands.',
      timestamp: Date.now(),
    },
  ])
  const [quickStartVisible, setQuickStartVisible] = useState(false)

  const currentContainers = useMemo(() => containers || [], [containers])
  const currentImages = useMemo(() => images || [], [images])
  const currentNetworks = useMemo(() => networks || [], [networks])
  const currentVolumes = useMemo(() => volumes || [], [volumes])
  const currentServices = useMemo(() => services || [], [services])
  const activeTutorial = activeTutorialId ? getTutorialById(activeTutorialId) : null
  const activeTutorialProgress = activeTutorialId ? tutorialProgresses?.[activeTutorialId] : null

  const addTerminalLine = useCallback((line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setTerminalLines((prev) => [
      ...prev,
      {
        ...line,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      },
    ])
  }, [])

  // Quick start auto-show
  useEffect(() => {
    if (
      !hasSeenQuickStart &&
      !activeTutorialId &&
      Object.keys(tutorialProgresses || {}).length === 0
    ) {
      const timer = setTimeout(() => {
        setQuickStartVisible(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [hasSeenQuickStart, activeTutorialId, tutorialProgresses])

  // Step completion handler
  const handleStepComplete = useCallback(() => {
    if (!activeTutorialId || !activeTutorial || !activeTutorialProgress) return

    const currentStep = activeTutorial.steps[activeTutorialProgress.currentStepIndex]
    const newCompletedSteps = [...activeTutorialProgress.completedSteps, currentStep.id]
    const nextStepIndex = activeTutorialProgress.currentStepIndex + 1

    addTerminalLine({ type: 'success', content: `✓ ${currentStep.successMessage}` })
    toast.success('Step completed!', { description: currentStep.successMessage })

    if (nextStepIndex >= activeTutorial.steps.length) {
      setTutorialProgresses((current) => ({
        ...current,
        [activeTutorialId]: {
          ...activeTutorialProgress,
          completedSteps: newCompletedSteps,
          currentStepIndex: nextStepIndex - 1,
          completed: true,
          completedAt: Date.now(),
        },
      }))
      setActiveTutorialId(null)
      toast.success('🎉 Tutorial completed!', {
        description: `You've mastered: ${activeTutorial.title}`,
      })
      addTerminalLine({
        type: 'success',
        content: `🎉 Tutorial "${activeTutorial.title}" completed! You've learned all the steps.`,
      })
    } else {
      setTutorialProgresses((current) => ({
        ...current,
        [activeTutorialId]: {
          ...activeTutorialProgress,
          completedSteps: newCompletedSteps,
          currentStepIndex: nextStepIndex,
        },
      }))
    }
  }, [
    activeTutorialId,
    activeTutorial,
    activeTutorialProgress,
    addTerminalLine,
    setTutorialProgresses,
    setActiveTutorialId,
  ])

  // Tutorial state-based validation
  useEffect(() => {
    if (activeTutorialProgress && activeTutorial) {
      const currentStep = activeTutorial.steps[activeTutorialProgress.currentStepIndex]
      if (currentStep.validation) {
        const isValid = currentStep.validation({
          containers: currentContainers,
          images: currentImages,
        })
        if (isValid && !activeTutorialProgress.completedSteps.includes(currentStep.id)) {
          handleStepComplete()
        }
      }
    }
  }, [currentContainers, currentImages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Achievement checking
  useEffect(() => {
    const unlockedIds = (unlockedAchievements || []).map((a) => a.achievementId)
    const newAchievementIds = checkAchievements(unlockedIds, {
      tutorialProgresses: tutorialProgresses || {},
      containers: currentContainers,
      images: currentImages,
      totalCommandsExecuted: totalCommandsExecuted || 0,
    })

    if (newAchievementIds.length > 0) {
      const newUnlocked: UnlockedAchievement[] = newAchievementIds.map((id) => ({
        achievementId: id,
        unlockedAt: Date.now(),
      }))
      setUnlockedAchievements((current) => [...(current || []), ...newUnlocked])
    }
  }, [tutorialProgresses, currentContainers, currentImages, totalCommandsExecuted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Streak tracking — update on each command execution
  useEffect(() => {
    const today = getTodayString()
    const current = streakData ?? DEFAULT_STREAK
    if (current.lastActiveDate === today) return
    if (totalCommandsExecuted === 0) return

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

    const isConsecutive = current.lastActiveDate === yesterdayStr
    const newStreak = isConsecutive ? current.currentStreak + 1 : 1
    const newLongest = Math.max(current.longestStreak, newStreak)
    const newDates = current.activeDates.includes(today)
      ? current.activeDates
      : [...current.activeDates.slice(-29), today] // keep last 30 days

    setStreakData({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      activeDates: newDates,
    })
  }, [totalCommandsExecuted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Daily challenge completion check
  const dailyChallengeCompleted = useMemo(() => {
    const today = getTodayString()
    if ((completedDailies ?? []).includes(today)) return true
    const daily = getDailyChallenge()
    return isDailyChallengeComplete(daily, {
      tutorialProgresses: tutorialProgresses || {},
      containers: currentContainers,
      images: currentImages,
      totalCommandsExecuted: totalCommandsExecuted || 0,
    })
  }, [
    completedDailies,
    tutorialProgresses,
    currentContainers,
    currentImages,
    totalCommandsExecuted,
  ])

  useEffect(() => {
    const today = getTodayString()
    if (dailyChallengeCompleted && !(completedDailies ?? []).includes(today)) {
      setCompletedDailies((curr) => [...(curr ?? []), today])
      toast.success('🎯 Daily Challenge Complete!', {
        description: getDailyChallenge().title,
      })
    }
  }, [dailyChallengeCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCommand = useCallback(
    (command: string) => {
      addTerminalLine({ type: 'command', content: command })
      setTotalCommandsExecuted((current) => (current || 0) + 1)

      const result = parseCommand(
        command,
        {
          containers: currentContainers,
          images: currentImages,
          networks: currentNetworks,
          volumes: currentVolumes,
          services: currentServices,
        },
        (newState) => {
          setContainers(newState.containers)
          setImages(newState.images)
          setNetworks(newState.networks)
          setVolumes(newState.volumes)
          if (newState.services) setServices(newState.services)
        }
      )

      if (result.output === 'CLEAR_TERMINAL') {
        setTerminalLines([])
        return
      }

      if (result.success) {
        if (result.output) {
          addTerminalLine({ type: 'output', content: result.output })
        }
      } else {
        if (result.error) {
          addTerminalLine({ type: 'error', content: result.error })
        }
      }

      if (activeTutorial && activeTutorialProgress) {
        const currentStep = activeTutorial.steps[activeTutorialProgress.currentStepIndex]
        const isCorrectCommand = checkCommandMatch(currentStep.expectedCommand, command)

        if (isCorrectCommand && result.success && !currentStep.validation) {
          handleStepComplete()
        } else if (!isCorrectCommand && result.success) {
          setTutorialProgresses((current) => ({
            ...current,
            [activeTutorialId!]: {
              ...activeTutorialProgress,
              wrongCommandCount: (activeTutorialProgress.wrongCommandCount ?? 0) + 1,
            },
          }))
          addTerminalLine({
            type: 'error',
            content:
              "⚠️  This command works, but it's not what the tutorial expects. Try following the tutorial step.",
          })
        }
      }
    },
    [
      currentContainers,
      currentImages,
      currentNetworks,
      currentVolumes,
      currentServices,
      activeTutorial,
      activeTutorialProgress,
      activeTutorialId,
      addTerminalLine,
      handleStepComplete,
      setTotalCommandsExecuted,
      setContainers,
      setImages,
      setNetworks,
      setVolumes,
      setServices,
      setTutorialProgresses,
    ]
  )

  const handleStartTutorial = useCallback(
    (tutorialId: string) => {
      const tutorial = getTutorialById(tutorialId)
      if (!tutorial) return

      const existingProgress = tutorialProgresses?.[tutorialId]

      if (existingProgress && !existingProgress.completed) {
        setActiveTutorialId(tutorialId)
        addTerminalLine({
          type: 'success',
          content: `📚 Resuming tutorial: ${tutorial.title}`,
        })
      } else {
        setTutorialProgresses((current) => ({
          ...current,
          [tutorialId]: {
            tutorialId,
            currentStepIndex: 0,
            completedSteps: [],
            completed: false,
            startedAt: Date.now(),
            wrongCommandCount: 0,
          },
        }))
        setActiveTutorialId(tutorialId)
        addTerminalLine({
          type: 'success',
          content: `📚 Started tutorial: ${tutorial.title}`,
        })
        toast.success('Tutorial started!', { description: tutorial.title })
      }

      setQuickStartVisible(false)
      setHasSeenQuickStart(true)
    },
    [
      tutorialProgresses,
      addTerminalLine,
      setActiveTutorialId,
      setTutorialProgresses,
      setHasSeenQuickStart,
    ]
  )

  const handleDismissQuickStart = useCallback(() => {
    setQuickStartVisible(false)
    setHasSeenQuickStart(true)
  }, [setHasSeenQuickStart])

  const handleExitTutorial = useCallback(() => {
    if (activeTutorial) {
      addTerminalLine({
        type: 'output',
        content: `Tutorial "${activeTutorial.title}" paused. Your progress is saved.`,
      })
    }
    setActiveTutorialId(null)
  }, [activeTutorial, addTerminalLine, setActiveTutorialId])

  const handleStopContainer = useCallback(
    (containerId: string) => {
      const container = currentContainers.find((c) => c.id === containerId)
      if (!container) return

      setContainers((current) =>
        (current || []).map((c) => (c.id === containerId ? { ...c, status: 'stopped' } : c))
      )
      toast.success(`Stopped container: ${container.name}`)
      addTerminalLine({ type: 'success', content: `Container ${container.name} stopped` })
    },
    [currentContainers, setContainers, addTerminalLine]
  )

  const handleStartContainer = useCallback(
    (containerId: string) => {
      const container = currentContainers.find((c) => c.id === containerId)
      if (!container) return

      setContainers((current) =>
        (current || []).map((c) => (c.id === containerId ? { ...c, status: 'running' } : c))
      )
      toast.success(`Started container: ${container.name}`)
      addTerminalLine({ type: 'success', content: `Container ${container.name} started` })
    },
    [currentContainers, setContainers, addTerminalLine]
  )

  const handleRemoveContainer = useCallback(
    (containerId: string) => {
      const container = currentContainers.find((c) => c.id === containerId)
      if (!container) return

      if (container.status === 'running') {
        toast.error('Stop the container before removing it, or use docker rm -f')
        return
      }

      setContainers((current) => (current || []).filter((c) => c.id !== containerId))
      toast.success(`Removed container: ${container.name}`)
      addTerminalLine({ type: 'success', content: `Container ${container.name} removed` })
    },
    [currentContainers, setContainers, addTerminalLine]
  )

  const handleRemoveImage = useCallback(
    (imageId: string) => {
      const image = currentImages.find((img) => img.id === imageId)
      if (!image) return

      const containersUsingImage = currentContainers.filter(
        (c) => c.image === `${image.name}:${image.tag}`
      )
      if (containersUsingImage.length > 0) {
        toast.error(
          `Image is used by containers: ${containersUsingImage.map((c) => c.name).join(', ')}`
        )
        return
      }

      setImages((current) => (current || []).filter((img) => img.id !== imageId))
      toast.success(`Removed image: ${image.name}:${image.tag}`)
      addTerminalLine({ type: 'success', content: `Image ${image.name}:${image.tag} removed` })
    },
    [currentImages, currentContainers, setImages, addTerminalLine]
  )

  const runningCount = useMemo(
    () => currentContainers.filter((c) => c.status === 'running').length,
    [currentContainers]
  )

  const tutorialProgressesMap = useMemo(
    () => new Map(Object.entries(tutorialProgresses || {})),
    [tutorialProgresses]
  )

  const currentDockerfiles = useMemo(() => savedDockerfiles || [], [savedDockerfiles])

  const handleSaveDockerfile = useCallback(
    (name: string, content: string) => {
      const existing = currentDockerfiles.find((df) => df.name === name)
      if (existing) {
        setSavedDockerfiles((current) =>
          (current || []).map((df) =>
            df.name === name ? { ...df, content, updatedAt: Date.now() } : df
          )
        )
      } else {
        const newFile: SavedDockerfile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          name,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        setSavedDockerfiles((current) => [...(current || []), newFile])
      }
    },
    [currentDockerfiles, setSavedDockerfiles]
  )

  const handleDeleteDockerfile = useCallback(
    (id: string) => {
      setSavedDockerfiles((current) => (current || []).filter((df) => df.id !== id))
      toast.success('Dockerfile deleted')
    },
    [setSavedDockerfiles]
  )

  const handleBuildDockerfile = useCallback(
    (tag: string, content: string) => {
      const result = simulateBuild(content, tag)
      if (!result.success) {
        addTerminalLine({ type: 'error', content: result.errors.join('\n') })
        return
      }

      const existingIdx = currentImages.findIndex(
        (img) => img.name === result.imageName && img.tag === result.imageTag
      )

      const newImage = {
        id: generateId(),
        name: result.imageName,
        tag: result.imageTag,
        size: result.totalSize,
        created: Date.now(),
        layers: result.steps
          .filter((s) => ['FROM', 'RUN', 'COPY', 'ADD'].includes(s.instruction))
          .map((s) => s.layerId),
      }

      const images =
        existingIdx >= 0
          ? currentImages.map((img, idx) => (idx === existingIdx ? newImage : img))
          : [...currentImages, newImage]

      setImages(images)

      addTerminalLine({
        type: 'success',
        content: `Built image ${result.imageName}:${result.imageTag} (${result.totalSize}, ${result.steps.length} layers)`,
      })
    },
    [currentImages, setImages, addTerminalLine]
  )

  const activeChallenge = activeChallengeId ? getChallengeById(activeChallengeId) : null
  const activeChallengeAttempt = activeChallengeId
    ? (challengeAttempts || {})[activeChallengeId]
    : null

  const handleStartChallenge = useCallback(
    (challengeId: string) => {
      const challenge = getChallengeById(challengeId)
      if (!challenge) return

      const attempt: ChallengeAttempt = {
        challengeId,
        startedAt: Date.now(),
        completed: false,
      }
      setChallengeAttempts((current) => ({ ...(current || {}), [challengeId]: attempt }))
      setActiveChallengeId(challengeId)
      addTerminalLine({
        type: 'success',
        content: `⚡ Challenge started: ${challenge.title} — ${challenge.timeLimit}s`,
      })
      toast.success('Challenge started!', { description: challenge.title })
    },
    [setChallengeAttempts, setActiveChallengeId, addTerminalLine]
  )

  const handleCompleteChallenge = useCallback(
    (timeSeconds: number) => {
      if (!activeChallengeId) return
      const challenge = getChallengeById(activeChallengeId)

      setChallengeAttempts((current) => {
        const prev = (current || {})[activeChallengeId]
        return {
          ...(current || {}),
          [activeChallengeId]: {
            ...prev,
            challengeId: activeChallengeId,
            startedAt: prev?.startedAt ?? Date.now(),
            completedAt: Date.now(),
            completed: true,
            bestTime: prev?.bestTime != null ? Math.min(prev.bestTime, timeSeconds) : timeSeconds,
          },
        }
      })
      setActiveChallengeId(null)
      addTerminalLine({
        type: 'success',
        content: `🏆 Challenge "${challenge?.title}" completed in ${timeSeconds}s!`,
      })
      toast.success('Challenge completed!', {
        description: `${challenge?.title} — ${timeSeconds}s`,
      })
    },
    [activeChallengeId, setChallengeAttempts, setActiveChallengeId, addTerminalLine]
  )

  const handleQuitChallenge = useCallback(() => {
    if (!activeChallengeId) return
    setActiveChallengeId(null)
    addTerminalLine({ type: 'output', content: 'Challenge abandoned.' })
  }, [activeChallengeId, setActiveChallengeId, addTerminalLine])

  const hasRunningCompose = (composeServiceNames || []).length > 0

  const handleComposeUp = useCallback(
    (content: string) => {
      const parsed = parseComposeFile(content)
      if (!parsed.success || !parsed.config) {
        addTerminalLine({ type: 'error', content: parsed.errors.join('\n') })
        return
      }

      const result = simulateComposeUp(parsed.config, currentImages)

      // Check for container name conflicts
      for (const c of result.containers) {
        if (currentContainers.some((existing) => existing.name === c.name)) {
          addTerminalLine({ type: 'error', content: `Container name '${c.name}' already in use` })
          return
        }
      }

      setContainers((current) => [...(current || []), ...result.containers])
      setImages((current) => [...(current || []), ...result.images])
      setNetworks((current) => [...(current || []), ...result.networks])
      setComposeServiceNames(result.containers.map((c) => c.name))

      const svcNames = result.containers.map((c) => c.name).join(', ')
      addTerminalLine({
        type: 'success',
        content: `Compose up: started ${result.containers.length} service(s) — ${svcNames}`,
      })
    },
    [
      currentImages,
      currentContainers,
      setContainers,
      setImages,
      setNetworks,
      setComposeServiceNames,
      addTerminalLine,
    ]
  )

  const handleComposeDown = useCallback(() => {
    const svcNames = composeServiceNames || []
    if (svcNames.length === 0) return

    setContainers((current) => (current || []).filter((c) => !svcNames.includes(c.name)))
    setComposeServiceNames([])
    addTerminalLine({
      type: 'success',
      content: `Compose down: stopped and removed ${svcNames.length} service(s)`,
    })
  }, [composeServiceNames, setContainers, setComposeServiceNames, addTerminalLine])

  const handleImportSnapshot = useCallback(
    (snapshot: PlaygroundSnapshot) => {
      setContainers(snapshot.containers)
      setImages(snapshot.images)
      setNetworks(snapshot.networks)
      setTutorialProgresses(snapshot.tutorialProgresses)
      setUnlockedAchievements(snapshot.unlockedAchievements)
      setTotalCommandsExecuted(snapshot.totalCommandsExecuted)
      setSavedDockerfiles(snapshot.savedDockerfiles)
      addTerminalLine({ type: 'success', content: 'Snapshot imported successfully.' })
      toast.success('Snapshot imported')
    },
    [
      setContainers,
      setImages,
      setNetworks,
      setTutorialProgresses,
      setUnlockedAchievements,
      setTotalCommandsExecuted,
      setSavedDockerfiles,
      addTerminalLine,
    ]
  )

  const handleLoadSandbox = useCallback(
    (preset: SandboxPreset) => {
      const now = Date.now()
      setContainers(preset.containers.map((c) => ({ ...c, created: now })))
      setImages(preset.images.map((img) => ({ ...img, created: now })))
      setNetworks((current) => [
        ...(current || []).filter(
          (n) => n.name === 'bridge' || n.name === 'host' || n.name === 'none'
        ),
        ...preset.networks.map((n) => ({ ...n, created: now })),
      ])
      setTerminalLines([
        {
          id: `${Date.now()}-sandbox`,
          type: 'success' as const,
          content: `🎮 Sandbox loaded: ${preset.title}. Type "docker ps" to see your containers.`,
          timestamp: now,
        },
      ])
      toast.success(`Sandbox loaded: ${preset.title}`)
    },
    [setContainers, setImages, setNetworks]
  )

  return {
    // State
    currentContainers,
    currentImages,
    terminalLines,
    activeTutorial,
    activeTutorialProgress,
    unlockedAchievements: unlockedAchievements || [],
    totalCommandsExecuted: totalCommandsExecuted || 0,
    tutorialProgresses: tutorialProgresses || {},
    quickStartVisible,
    runningCount,
    tutorialProgressesMap,
    savedDockerfiles: currentDockerfiles,
    currentNetworks,
    activeChallenge,
    activeChallengeAttempt,
    challengeAttempts: challengeAttempts || {},

    // Handlers
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
    handleStartChallenge,
    handleCompleteChallenge,
    handleQuitChallenge,
    handleComposeUp,
    handleComposeDown,
    hasRunningCompose,
    handleImportSnapshot,
    showOnboarding: !hasSeenOnboarding,
    handleCompleteOnboarding: () => setHasSeenOnboarding(true),
    handleLoadSandbox,
    streakData: streakData ?? DEFAULT_STREAK,
    dailyChallengeCompleted,
  }
}
