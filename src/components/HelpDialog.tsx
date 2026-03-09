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
        },
        {
          command: 'docker cp SRC DEST',
          description: 'Copy files between container and local filesystem',
          options: 'Use CONTAINER:PATH for the container side',
          example: 'docker cp web:/etc/nginx/nginx.conf ./nginx.conf'
        },
        {
          command: 'docker commit CONTAINER IMAGE',
          description: 'Create a new image from a container\'s changes',
          options: '',
          example: 'docker commit web my-custom-nginx:v1'
        },
        {
          command: 'docker stats',
          description: 'Display resource usage statistics for running containers',
          options: '',
          example: 'docker stats'
        },
        {
          command: 'docker top CONTAINER',
          description: 'Display the running processes of a container',
          options: '',
          example: 'docker top web'
        },
        {
          command: 'docker diff CONTAINER',
          description: 'Show filesystem changes made inside a container',
          options: '',
          example: 'docker diff web'
        },
        {
          command: 'docker port CONTAINER',
          description: 'List port mappings for a container',
          options: '',
          example: 'docker port web'
        },
        {
          command: 'docker export CONTAINER',
          description: 'Export a container\'s filesystem as a tar archive',
          options: '',
          example: 'docker export web > web.tar'
        },
        {
          command: 'docker import FILE [IMAGE]',
          description: 'Create an image from a tarball',
          options: '',
          example: 'docker import backup.tar myimage:latest'
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
        },
        {
          command: 'docker save IMAGE',
          description: 'Save an image to a tar archive (simulated)',
          options: '',
          example: 'docker save nginx > nginx.tar'
        },
        {
          command: 'docker load -i FILE',
          description: 'Load an image from a tar archive (simulated)',
          options: '-i FILE or --input FILE',
          example: 'docker load -i nginx.tar'
        }
      ]
    },
    {
      category: 'Network Commands',
      items: [
        {
          command: 'docker network create NAME',
          description: 'Create a new network',
          options: '--driver DRIVER (default: bridge)',
          example: 'docker network create my-net'
        },
        {
          command: 'docker network ls',
          description: 'List all networks',
          options: '',
          example: 'docker network ls'
        },
        {
          command: 'docker network rm NETWORK',
          description: 'Remove a network',
          options: '',
          example: 'docker network rm my-net'
        },
        {
          command: 'docker network connect NETWORK CONTAINER',
          description: 'Connect a container to a network',
          options: '',
          example: 'docker network connect my-net web'
        },
        {
          command: 'docker network disconnect NETWORK CONTAINER',
          description: 'Disconnect a container from a network',
          options: '',
          example: 'docker network disconnect my-net web'
        }
      ]
    },
    {
      category: 'Volume Commands',
      items: [
        {
          command: 'docker volume create NAME',
          description: 'Create a new volume',
          options: '',
          example: 'docker volume create my-data'
        },
        {
          command: 'docker volume ls',
          description: 'List all volumes',
          options: '',
          example: 'docker volume ls'
        },
        {
          command: 'docker volume rm VOLUME',
          description: 'Remove a volume',
          options: '',
          example: 'docker volume rm my-data'
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