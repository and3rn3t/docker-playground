import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Terminal } from '@/components/Terminal'
import { ContainerCard } from '@/components/ContainerCard'
import { ImageCard } from '@/components/ImageCard'
import { HelpDialog } from '@/components/HelpDialog'
import { TutorialsDialog } from '@/components/TutorialsDialog'
import { TutorialPanel } from '@/components/TutorialPanel'
import { TutorialProgressTracker } from '@/components/TutorialProgressTracker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Question, Cube, Stack as StackIcon, GraduationCap, Rocket, X } from '@phosphor-icons/react'
import { DockerContainer, DockerImage, TerminalLine, TutorialProgress } from '@/lib/types'
import { parseCommand, getInitialImages } from '@/lib/docker-parser'
import { getTutorialById, checkCommandMatch } from '@/lib/tutorials'
import { toast, Toaster } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

function App() {
  const [containers, setContainers] = useKV<DockerContainer[]>('docker-containers', [])
  const [images, setImages] = useKV<DockerImage[]>('docker-images', getInitialImages())
  const [tutorialProgresses, setTutorialProgresses] = useKV<Record<string, TutorialProgress>>('tutorial-progresses', {})
  const [activeTutorialId, setActiveTutorialId] = useKV<string | null>('active-tutorial', null)
  const [hasSeenQuickStart, setHasSeenQuickStart] = useKV<boolean>('has-seen-quickstart', false)
  
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'output',
      content: 'Welcome to Docker Playground! Type "help" to see available commands.',
      timestamp: Date.now()
    }
  ])
  const [helpOpen, setHelpOpen] = useState(false)
  const [tutorialsOpen, setTutorialsOpen] = useState(false)
  const [quickStartVisible, setQuickStartVisible] = useState(false)

  const currentContainers = containers || []
  const currentImages = images || []
  const activeTutorial = activeTutorialId ? getTutorialById(activeTutorialId) : null
  const activeTutorialProgress = activeTutorialId ? tutorialProgresses?.[activeTutorialId] : null

  useEffect(() => {
    if (!hasSeenQuickStart && !activeTutorialId && Object.keys(tutorialProgresses || {}).length === 0) {
      const timer = setTimeout(() => {
        setQuickStartVisible(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [hasSeenQuickStart, activeTutorialId, tutorialProgresses])

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
  }, [currentContainers, currentImages])

  const addTerminalLine = (line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setTerminalLines(prev => [...prev, {
      ...line,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    }])
  }

  const handleStepComplete = () => {
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
  }

  const handleCommand = (command: string) => {
    addTerminalLine({ type: 'command', content: command })

    if (activeTutorial && activeTutorialProgress) {
      const currentStep = activeTutorial.steps[activeTutorialProgress.currentStepIndex]
      const isCorrectCommand = checkCommandMatch(currentStep.expectedCommand, command)

      if (isCorrectCommand) {
        const result = parseCommand(
          command,
          { containers: currentContainers, images: currentImages },
          (newState) => {
            setContainers(newState.containers)
            setImages(newState.images)
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
          
          if (!currentStep.validation) {
            handleStepComplete()
          }
        } else {
          if (result.error) {
            addTerminalLine({ type: 'error', content: result.error })
          }
        }
      } else {
        const result = parseCommand(
          command,
          { containers: currentContainers, images: currentImages },
          (newState) => {
            setContainers(newState.containers)
            setImages(newState.images)
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
          addTerminalLine({ 
            type: 'error', 
            content: '⚠️  This command works, but it\'s not what the tutorial expects. Try following the tutorial step.' 
          })
        } else {
          if (result.error) {
            addTerminalLine({ type: 'error', content: result.error })
          }
        }
      }
    } else {
      const result = parseCommand(
        command,
        { containers: currentContainers, images: currentImages },
        (newState) => {
          setContainers(newState.containers)
          setImages(newState.images)
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
    }
  }

  const handleStartTutorial = (tutorialId: string) => {
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
          startedAt: Date.now()
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
  }

  const handleDismissQuickStart = () => {
    setQuickStartVisible(false)
    setHasSeenQuickStart(true)
  }

  const handleExitTutorial = () => {
    if (activeTutorial) {
      addTerminalLine({ 
        type: 'output', 
        content: `Tutorial "${activeTutorial.title}" paused. Your progress is saved.` 
      })
    }
    setActiveTutorialId(null)
  }

  const handleStopContainer = (containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    setContainers(current => 
      (current || []).map(c => c.id === containerId ? { ...c, status: 'stopped' } : c)
    )
    toast.success(`Stopped container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} stopped` })
  }

  const handleStartContainer = (containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    setContainers(current => 
      (current || []).map(c => c.id === containerId ? { ...c, status: 'running' } : c)
    )
    toast.success(`Started container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} started` })
  }

  const handleRemoveContainer = (containerId: string) => {
    const container = currentContainers.find(c => c.id === containerId)
    if (!container) return

    if (container.status === 'running') {
      toast.error('Stop the container before removing it, or use docker rm -f')
      return
    }

    setContainers(current => (current || []).filter(c => c.id !== containerId))
    toast.success(`Removed container: ${container.name}`)
    addTerminalLine({ type: 'success', content: `Container ${container.name} removed` })
  }

  const handleRemoveImage = (imageId: string) => {
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
  }

  const runningCount = currentContainers.filter(c => c.status === 'running').length
  const tutorialProgressesMap = new Map(Object.entries(tutorialProgresses || {}))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="terminal-grid fixed inset-0 opacity-20 pointer-events-none"></div>
      
      <div className="relative">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Docker Playground</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Learn Docker commands in an interactive sandbox
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Cube weight="duotone" className="text-accent" />
                  <span className="font-mono">
                    <span className="text-accent font-semibold">{runningCount}</span>
                    <span className="text-muted-foreground"> / {currentContainers.length} running</span>
                  </span>
                </div>
                <TutorialProgressTracker tutorialProgresses={tutorialProgressesMap} />
                <Button onClick={() => setTutorialsOpen(true)} variant="default" size="sm" className="glow-primary">
                  <GraduationCap weight="bold" />
                  <span>Tutorials</span>
                </Button>
                <Button onClick={() => setHelpOpen(true)} variant="outline" size="sm">
                  <Question weight="bold" />
                  <span>Help</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-6">
          <div className="grid lg:grid-cols-2 gap-6">
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
              <div className="h-[600px]">
                <Terminal lines={terminalLines} onCommand={handleCommand} />
              </div>
            </div>

            <div>
              <Tabs defaultValue="containers" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="containers" className="gap-2">
                    <Cube weight="duotone" />
                    <span>Containers</span>
                    {currentContainers.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono">
                        {currentContainers.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="images" className="gap-2">
                    <StackIcon weight="duotone" />
                    <span>Images</span>
                    {currentImages.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono">
                        {currentImages.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="containers" className="space-y-3 h-[540px] overflow-y-auto pr-2">
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

                <TabsContent value="images" className="space-y-3 h-[540px] overflow-y-auto pr-2">
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
      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}

export default App