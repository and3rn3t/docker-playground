import { useState, useEffect, useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { DockerContainer, DockerImage, DockerNetwork, DockerVolume, TerminalLine, TutorialProgress, UnlockedAchievement } from '@/lib/types'
import { parseCommand, getInitialImages, getInitialNetworks } from '@/lib/docker-parser'
import { getTutorialById, checkCommandMatch } from '@/lib/tutorials'
import { checkAchievements, getAchievementById } from '@/lib/achievements'
import { toast } from 'sonner'

export function useDockerState() {
  const [containers, setContainers] = useKV<DockerContainer[]>('docker-containers', [])
  const [images, setImages] = useKV<DockerImage[]>('docker-images', getInitialImages())
  const [networks, setNetworks] = useKV<DockerNetwork[]>('docker-networks', getInitialNetworks())
  const [volumes, setVolumes] = useKV<DockerVolume[]>('docker-volumes', [])
  const [tutorialProgresses, setTutorialProgresses] = useKV<Record<string, TutorialProgress>>('tutorial-progresses', {})
  const [activeTutorialId, setActiveTutorialId] = useKV<string | null>('active-tutorial', null)
  const [hasSeenQuickStart, setHasSeenQuickStart] = useKV<boolean>('has-seen-quickstart', false)
  const [unlockedAchievements, setUnlockedAchievements] = useKV<UnlockedAchievement[]>('unlocked-achievements', [])
  const [totalCommandsExecuted, setTotalCommandsExecuted] = useKV<number>('total-commands-executed', 0)

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'output',
      content: 'Welcome to Docker Playground! Type "help" to see available commands.',
      timestamp: Date.now()
    }
  ])
  const [quickStartVisible, setQuickStartVisible] = useState(false)

  const currentContainers = useMemo(() => containers || [], [containers])
  const currentImages = useMemo(() => images || [], [images])
  const currentNetworks = useMemo(() => networks || [], [networks])
  const currentVolumes = useMemo(() => volumes || [], [volumes])
  const activeTutorial = activeTutorialId ? getTutorialById(activeTutorialId) : null
  const activeTutorialProgress = activeTutorialId ? tutorialProgresses?.[activeTutorialId] : null

  const addTerminalLine = useCallback((line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setTerminalLines(prev => [...prev, {
      ...line,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    }])
  }, [])

  // Quick start auto-show
  useEffect(() => {
    if (!hasSeenQuickStart && !activeTutorialId && Object.keys(tutorialProgresses || {}).length === 0) {
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
      setTutorialProgresses(current => ({
        ...current,
        [activeTutorialId]: {
          ...activeTutorialProgress,
          completedSteps: newCompletedSteps,
          currentStepIndex: nextStepIndex - 1,
          completed: true,
          completedAt: Date.now()
        }
      }))
      setActiveTutorialId(null)
      toast.success('🎉 Tutorial completed!', {
        description: `You've mastered: ${activeTutorial.title}`
      })
      addTerminalLine({
        type: 'success',
        content: `🎉 Tutorial "${activeTutorial.title}" completed! You've learned all the steps.`
      })
    } else {
      setTutorialProgresses(current => ({
        ...current,
        [activeTutorialId]: {
          ...activeTutorialProgress,
          completedSteps: newCompletedSteps,
          currentStepIndex: nextStepIndex
        }
      }))
    }
  }, [activeTutorialId, activeTutorial, activeTutorialProgress, addTerminalLine, setTutorialProgresses, setActiveTutorialId])

  // Tutorial state-based validation
  useEffect(() => {
    if (activeTutorialProgress && activeTutorial) {
      const currentStep = activeTutorial.steps[activeTutorialProgress.currentStepIndex]
      if (currentStep.validation) {
        const isValid = currentStep.validation({ containers: currentContainers, images: currentImages })
        if (isValid && !activeTutorialProgress.completedSteps.includes(currentStep.id)) {
          handleStepComplete()
        }
      }
    }
  }, [currentContainers, currentImages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Achievement checking
  useEffect(() => {
    const unlockedIds = (unlockedAchievements || []).map(a => a.achievementId)
    const newAchievementIds = checkAchievements(unlockedIds, {
      tutorialProgresses: tutorialProgresses || {},
      containers: currentContainers,
      images: currentImages,
      totalCommandsExecuted: totalCommandsExecuted || 0
    })

    if (newAchievementIds.length > 0) {
      const newUnlocked: UnlockedAchievement[] = newAchievementIds.map(id => ({
        achievementId: id,
        unlockedAt: Date.now()
      }))
      setUnlockedAchievements(current => [...(current || []), ...newUnlocked])
    }
  }, [tutorialProgresses, currentContainers, currentImages, totalCommandsExecuted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCommand = useCallback((command: string) => {
    addTerminalLine({ type: 'command', content: command })
    setTotalCommandsExecuted(current => (current || 0) + 1)

    const result = parseCommand(
      command,
      { containers: currentContainers, images: currentImages, networks: currentNetworks, volumes: currentVolumes },
      (newState) => {
        setContainers(newState.containers)
        setImages(newState.images)
        setNetworks(newState.networks)
        setVolumes(newState.volumes)
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
        setTutorialProgresses(current => ({
          ...current,
          [activeTutorialId!]: {
            ...activeTutorialProgress,
            wrongCommandCount: (activeTutorialProgress.wrongCommandCount ?? 0) + 1
          }
        }))
        addTerminalLine({
          type: 'error',
          content: '⚠️  This command works, but it\'s not what the tutorial expects. Try following the tutorial step.'
        })
      }
    }
  }, [currentContainers, currentImages, currentNetworks, currentVolumes, activeTutorial, activeTutorialProgress, activeTutorialId, addTerminalLine, handleStepComplete, setTotalCommandsExecuted, setContainers, setImages, setNetworks, setVolumes, setTutorialProgresses])

  const handleStartTutorial = useCallback((tutorialId: string) => {
    const tutorial = getTutorialById(tutorialId)
    if (!tutorial) return

    const existingProgress = tutorialProgresses?.[tutorialId]

    if (existingProgress && !existingProgress.completed) {
      setActiveTutorialId(tutorialId)
      addTerminalLine({
        type: 'success',
        content: `📚 Resuming tutorial: ${tutorial.title}`
      })
    } else {
      setTutorialProgresses(current => ({
        ...current,
        [tutorialId]: {
          tutorialId,
          currentStepIndex: 0,
          completedSteps: [],
          completed: false,
          startedAt: Date.now(),
          wrongCommandCount: 0
        }
      }))
      setActiveTutorialId(tutorialId)
      addTerminalLine({
        type: 'success',
        content: `📚 Started tutorial: ${tutorial.title}`
      })
      toast.success('Tutorial started!', { description: tutorial.title })
    }

    setQuickStartVisible(false)
    setHasSeenQuickStart(true)
  }, [tutorialProgresses, addTerminalLine, setActiveTutorialId, setTutorialProgresses, setHasSeenQuickStart])

  const handleDismissQuickStart = useCallback(() => {
    setQuickStartVisible(false)
    setHasSeenQuickStart(true)
  }, [setHasSeenQuickStart])

  const handleExitTutorial = useCallback(() => {
    if (activeTutorial) {
      addTerminalLine({
        type: 'output',
        content: `Tutorial "${activeTutorial.title}" paused. Your progress is saved.`
      })
    }
    setActiveTutorialId(null)
  }, [activeTutorial, addTerminalLine, setActiveTutorialId])

  const handleStopContainer = useCallback((containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    setContainers(current =>
      (current || []).map(c => c.id === containerId ? { ...c, status: 'stopped' } : c)
    )
    toast.success(`Stopped container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} stopped` })
  }, [currentContainers, setContainers, addTerminalLine])

  const handleStartContainer = useCallback((containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    setContainers(current =>
      (current || []).map(c => c.id === containerId ? { ...c, status: 'running' } : c)
    )
    toast.success(`Started container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} started` })
  }, [currentContainers, setContainers, addTerminalLine])

  const handleRemoveContainer = useCallback((containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    if (container.status === 'running') {
      toast.error('Stop the container before removing it, or use docker rm -f')
      return
    }

    setContainers(current => (current || []).filter(c => c.id !== containerId))
    toast.success(`Removed container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} removed` })
  }, [currentContainers, setContainers, addTerminalLine])

  const handleRemoveImage = useCallback((imageId: string) => {
    const image = currentImages.find(img => img.id === imageId)
    if (!image) return

    const containersUsingImage = currentContainers.filter(c => c.image === `${image.name}:${image.tag}`)
    if (containersUsingImage.length > 0) {
      toast.error(`Image is used by containers: ${containersUsingImage.map(c => c.name).join(', ')}`)
      return
    }

    setImages(current => (current || []).filter(img => img.id !== imageId))
    toast.success(`Removed image: ${image.name}:${image.tag}`)
    addTerminalLine({ type: 'success', content: `Image ${image.name}:${image.tag} removed` })
  }, [currentImages, currentContainers, setImages, addTerminalLine])

  const runningCount = useMemo(
    () => currentContainers.filter(c => c.status === 'running').length,
    [currentContainers]
  )

  const tutorialProgressesMap = useMemo(
    () => new Map(Object.entries(tutorialProgresses || {})),
    [tutorialProgresses]
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

    // Handlers
    handleCommand,
    handleStartTutorial,
    handleDismissQuickStart,
    handleExitTutorial,
    handleStopContainer,
    handleStartContainer,
    handleRemoveContainer,
    handleRemoveImage,
  }
}
