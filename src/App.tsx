import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Terminal } from '@/components/Terminal'
import { ContainerCard } from '@/components/ContainerCard'
import { ImageCard } from '@/components/ImageCard'
import { HelpDialog } from '@/components/HelpDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Question, Cube, Stack as StackIcon } from '@phosphor-icons/react'
import { DockerContainer, DockerImage, TerminalLine } from '@/lib/types'
import { parseCommand, getInitialImages } from '@/lib/docker-parser'
import { toast, Toaster } from 'sonner'
import { AnimatePresence } from 'framer-motion'

function App() {
  const [containers, setContainers] = useKV<DockerContainer[]>('docker-containers', [])
  const [images, setImages] = useKV<DockerImage[]>('docker-images', getInitialImages())
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'output',
      content: 'Welcome to Docker Playground! Type "help" to see available commands.',
      timestamp: Date.now()
    }
  ])
  const [helpOpen, setHelpOpen] = useState(false)

  const currentContainers = containers || []
  const currentImages = images || []

  const addTerminalLine = (line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setTerminalLines(prev => [...prev, {
      ...line,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    }])
  }

  const handleCommand = (command: string) => {
    addTerminalLine({ type: 'command', content: command })

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
            <div className="h-[600px]">
              <Terminal lines={terminalLines} onCommand={handleCommand} />
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
      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}

export default App