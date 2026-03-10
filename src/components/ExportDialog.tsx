import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TerminalWindow, FileText, FileCode, Download, Copy, Upload, Check, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { TerminalLine, DockerContainer, DockerImage, DockerNetwork, TutorialProgress, UnlockedAchievement, SavedDockerfile } from '@/lib/types'
import {
  downloadTerminalHistory,
  downloadDockerfile,
  downloadSnapshot,
  createSnapshot,
  parseSnapshot,
  generateProgressSummary,
  copyToClipboard,
  exportTerminalAsText,
} from '@/lib/export'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  terminalLines: TerminalLine[]
  containers: DockerContainer[]
  images: DockerImage[]
  networks: DockerNetwork[]
  tutorialProgresses: Record<string, TutorialProgress>
  unlockedAchievements: UnlockedAchievement[]
  totalCommandsExecuted: number
  savedDockerfiles: SavedDockerfile[]
  onImportSnapshot: (snapshot: ReturnType<typeof createSnapshot>) => void
}

export function ExportDialog({
  open,
  onOpenChange,
  terminalLines,
  containers,
  images,
  networks,
  tutorialProgresses,
  unlockedAchievements,
  totalCommandsExecuted,
  savedDockerfiles,
  onImportSnapshot,
}: ExportDialogProps) {
  const [copyDone, setCopyDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCopyTerminal = async () => {
    const text = exportTerminalAsText(terminalLines)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopyDone(true)
      toast.success('Terminal history copied to clipboard')
      setTimeout(() => setCopyDone(false), 2000)
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const snapshot = createSnapshot({
    containers,
    images,
    networks,
    tutorialProgresses,
    unlockedAchievements,
    totalCommandsExecuted,
    savedDockerfiles,
  })

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const result = parseSnapshot(text)
      if (result.success) {
        onImportSnapshot(result.snapshot)
        toast.success('Snapshot imported successfully')
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const summary = generateProgressSummary({
    tutorialProgresses,
    unlockedAchievements,
    totalCommandsExecuted,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download weight="duotone" className="text-accent" />
            Export & Share
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="terminal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="terminal" className="gap-1 text-xs">
              <TerminalWindow weight="duotone" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1 text-xs">
              <FileCode weight="duotone" />
              Files
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="gap-1 text-xs">
              <FileText weight="duotone" />
              Snapshot
            </TabsTrigger>
          </TabsList>

          {/* Terminal History */}
          <TabsContent value="terminal" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export your terminal session as text or markdown.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => downloadTerminalHistory(terminalLines, 'text')}>
                <Download weight="bold" />
                Download .txt
              </Button>
              <Button size="sm" variant="secondary" onClick={() => downloadTerminalHistory(terminalLines, 'markdown')}>
                <Download weight="bold" />
                Download .md
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyTerminal}>
                {copyDone ? <Check weight="bold" className="text-green-500" /> : <Copy weight="bold" />}
                {copyDone ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">{terminalLines.length} lines</div>
          </TabsContent>

          {/* Dockerfile / Compose Downloads */}
          <TabsContent value="files" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download saved Dockerfiles as individual files.
            </p>
            {savedDockerfiles.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  No saved Dockerfiles yet. Create one in the Build tab.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedDockerfiles.map((df) => (
                  <Card key={df.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode weight="duotone" className="text-accent" />
                        <span className="text-sm font-mono">{df.name}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => downloadDockerfile(df)}>
                        <Download weight="bold" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Full Snapshot Export / Import */}
          <TabsContent value="snapshot" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export everything (containers, images, progress, achievements) as a JSON snapshot, or import a previous snapshot.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => downloadSnapshot(snapshot)}>
                <Download weight="bold" />
                Export Snapshot
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload weight="bold" />
                Import Snapshot
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const ok = await copyToClipboard(summary)
                if (ok) toast.success('Progress summary copied')
              }}
            >
              <Copy weight="bold" />
              Copy Progress Summary
            </Button>

            <Card>
              <CardContent className="p-3 text-xs font-mono text-muted-foreground space-y-1">
                <div>Containers: {containers.length}</div>
                <div>Images: {images.length}</div>
                <div>Networks: {networks.length}</div>
                <div>Achievements: {unlockedAchievements.length}</div>
                <div>Commands executed: {totalCommandsExecuted}</div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Warning weight="bold" className="mt-0.5 flex-shrink-0" />
              <span>Importing a snapshot will replace your current state. This cannot be undone.</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
