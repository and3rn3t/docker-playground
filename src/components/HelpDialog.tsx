import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const commands = [
    {
      category: 'Container Commands',
      items: [
        {
          command: 'docker ps',
          description: 'List running containers',
          options: '-a or --all to show all containers',
          example: 'docker ps -a'
        },
        {
          command: 'docker run [OPTIONS] IMAGE',
          description: 'Create and start a new container',
          options: '-d (detached), --name NAME, -p HOST:CONTAINER',
          example: 'docker run -d --name web -p 8080:80 nginx:latest'
        },
        {
          command: 'docker stop CONTAINER',
          description: 'Stop a running container',
          options: '',
          example: 'docker stop web'
        },
        {
          command: 'docker start CONTAINER',
          description: 'Start a stopped container',
          options: '',
          example: 'docker start web'
        },
        {
          command: 'docker rm CONTAINER',
          description: 'Remove a container',
          options: '-f or --force to remove running container',
          example: 'docker rm -f web'
        },
        {
          command: 'docker logs CONTAINER',
          description: 'View container logs',
          options: '',
          example: 'docker logs web'
        },
        {
          command: 'docker exec CONTAINER COMMAND',
          description: 'Execute command in running container',
          options: '',
          example: 'docker exec web ls -la'
        }
      ]
    },
    {
      category: 'Image Commands',
      items: [
        {
          command: 'docker images',
          description: 'List all images',
          options: '',
          example: 'docker images'
        },
        {
          command: 'docker pull IMAGE[:TAG]',
          description: 'Pull an image from registry (simulated)',
          options: '',
          example: 'docker pull ubuntu:latest'
        },
        {
          command: 'docker rmi IMAGE',
          description: 'Remove an image',
          options: '',
          example: 'docker rmi nginx:latest'
        },
        {
          command: 'docker inspect NAME/ID',
          description: 'Show detailed information about container or image',
          options: '',
          example: 'docker inspect web'
        }
      ]
    },
    {
      category: 'Other Commands',
      items: [
        {
          command: 'help',
          description: 'Show command reference',
          options: '',
          example: 'help'
        },
        {
          command: 'clear',
          description: 'Clear terminal output',
          options: '',
          example: 'clear'
        }
      ]
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Docker Command Reference</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {commands.map((section) => (
              <div key={section.category}>
                <h3 className="text-lg font-semibold mb-3 text-primary">{section.category}</h3>
                <div className="space-y-4">
                  {section.items.map((cmd) => (
                    <div key={cmd.command} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="font-mono text-xs mt-0.5 shrink-0">
                          CMD
                        </Badge>
                        <div className="flex-1">
                          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded">
                            {cmd.command}
                          </code>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground pl-12">{cmd.description}</p>
                      {cmd.options && (
                        <p className="text-xs text-muted-foreground pl-12">
                          <span className="text-primary">Options:</span> {cmd.options}
                        </p>
                      )}
                      <div className="pl-12">
                        <div className="text-xs text-muted-foreground mb-1">Example:</div>
                        <code className="text-xs font-mono bg-card px-2 py-1 rounded block">
                          $ {cmd.example}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}