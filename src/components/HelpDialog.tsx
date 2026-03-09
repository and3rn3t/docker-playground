import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
          command: 'docker ps [OPTIONS]',
          description: 'List containers (running by default)',
          options: '-a (all), -q (IDs only), --no-trunc, --filter key=value',
          example: 'docker ps -a --filter status=running'
        },
        {
          command: 'docker run [OPTIONS] IMAGE',
          description: 'Create and start a new container',
          options: '-d (detached), --name NAME, -p HOST:CONTAINER, -e KEY=VALUE, -v HOST:CONTAINER',
          example: 'docker run -d --name web -p 8080:80 -e NODE_ENV=prod nginx'
        },
        {
          command: 'docker stop CONTAINER...',
          description: 'Stop one or more running containers',
          options: 'Accepts multiple container names/IDs',
          example: 'docker stop web api db'
        },
        {
          command: 'docker start CONTAINER...',
          description: 'Start one or more stopped containers',
          options: 'Accepts multiple container names/IDs',
          example: 'docker start web api'
        },
        {
          command: 'docker rm [-f] CONTAINER...',
          description: 'Remove one or more containers',
          options: '-f or --force to remove running containers',
          example: 'docker rm -f web api'
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
        },
        {
          command: 'docker rename OLD NEW',
          description: 'Rename a container',
          options: '',
          example: 'docker rename old-name new-name'
        },
        {
          command: 'docker pause CONTAINER',
          description: 'Pause a running container (freeze processes)',
          options: '',
          example: 'docker pause web'
        },
        {
          command: 'docker unpause CONTAINER',
          description: 'Resume a paused container',
          options: '',
          example: 'docker unpause web'
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
          command: 'docker tag SOURCE TARGET',
          description: 'Create a tag TARGET from SOURCE image',
          options: '',
          example: 'docker tag nginx myregistry/nginx:v1'
        },
        {
          command: 'docker history IMAGE',
          description: 'Show image layer history',
          options: '',
          example: 'docker history nginx:latest'
        }
      ]
    },
    {
      category: 'Inspect & System',
      items: [
        {
          command: 'docker inspect NAME/ID',
          description: 'Show detailed information about container or image',
          options: '',
          example: 'docker inspect web'
        },
        {
          command: 'docker system prune',
          description: 'Remove stopped containers and unused images',
          options: '',
          example: 'docker system prune'
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
        <div className="h-[60vh] pr-4 overflow-y-auto custom-scrollbar">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}