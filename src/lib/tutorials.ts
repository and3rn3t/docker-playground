import { Tutorial } from './types'

export const tutorials: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Docker',
    description: 'Learn the basics: pull an image, run a container, and manage its lifecycle.',
    difficulty: 'beginner',
    estimatedTime: '5 min',
    icon: 'rocket',
    steps: [
      {
        id: 'pull-image',
        title: 'Pull your first Docker image',
        description: 'Docker images are templates for containers. Let\'s pull the nginx web server image from Docker Hub.',
        expectedCommand: ['docker pull nginx:latest', 'docker pull nginx'],
        hints: [
          'Use the docker pull command',
          'The format is: docker pull <image-name>:<tag>',
          'Try: docker pull nginx:latest'
        ],
        successMessage: 'Great! You\'ve pulled your first Docker image. Images are stored locally and can be used to create containers.'
      },
      {
        id: 'list-images',
        title: 'View available images',
        description: 'Check that the image was downloaded successfully by listing all images.',
        expectedCommand: ['docker images', 'docker image ls'],
        hints: [
          'Use the docker images command',
          'This shows all images on your system',
          'Try: docker images'
        ],
        successMessage: 'Perfect! You can see the nginx image is now available locally.'
      },
      {
        id: 'run-container',
        title: 'Run your first container',
        description: 'Create and start a container from the nginx image. Give it a memorable name.',
        expectedCommand: ['docker run -d --name my-nginx nginx:latest', 'docker run -d --name my-nginx nginx'],
        hints: [
          'Use docker run to create and start a container',
          'The -d flag runs it in detached mode (background)',
          'Use --name to give it a custom name',
          'Try: docker run -d --name my-nginx nginx:latest'
        ],
        validation: (state) => {
          return state.containers.some(c => c.status === 'running')
        },
        successMessage: 'Excellent! Your first container is now running. The -d flag keeps it running in the background.'
      },
      {
        id: 'list-containers',
        title: 'Check running containers',
        description: 'List all running containers to see your new nginx container.',
        expectedCommand: ['docker ps', 'docker container ls'],
        hints: [
          'Use docker ps to list running containers',
          'This is like "ps" in Unix/Linux for processes',
          'Try: docker ps'
        ],
        successMessage: 'Nice! You can see your container is up and running with all its details.'
      },
      {
        id: 'stop-container',
        title: 'Stop the container',
        description: 'Gracefully stop your running container.',
        expectedCommand: ['docker stop my-nginx'],
        hints: [
          'Use docker stop followed by the container name or ID',
          'This sends a SIGTERM signal to gracefully shut down',
          'Try: docker stop my-nginx'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'my-nginx' && c.status === 'stopped')
        },
        successMessage: 'Well done! The container is stopped but still exists. You can restart it or remove it.'
      },
      {
        id: 'remove-container',
        title: 'Clean up',
        description: 'Remove the stopped container to clean up resources.',
        expectedCommand: ['docker rm my-nginx'],
        hints: [
          'Use docker rm to remove a stopped container',
          'You can only remove stopped containers (or use -f to force)',
          'Try: docker rm my-nginx'
        ],
        validation: (state) => {
          return !state.containers.some(c => c.name === 'my-nginx')
        },
        successMessage: 'Perfect! You\'ve completed the basics: pull, run, stop, and remove. You\'re ready for more!'
      }
    ]
  },
  {
    id: 'multi-container',
    title: 'Managing Multiple Containers',
    description: 'Learn to work with multiple containers simultaneously.',
    difficulty: 'beginner',
    estimatedTime: '8 min',
    icon: 'stack',
    steps: [
      {
        id: 'pull-multiple-images',
        title: 'Pull multiple images',
        description: 'Let\'s pull both nginx and redis images to run multiple services.',
        expectedCommand: ['docker pull nginx:latest', 'docker pull nginx'],
        hints: [
          'First, pull the nginx image',
          'Try: docker pull nginx:latest'
        ],
        successMessage: 'Good! Now let\'s pull another image.'
      },
      {
        id: 'pull-redis',
        title: 'Pull Redis image',
        description: 'Redis is a popular in-memory data store. Let\'s pull it.',
        expectedCommand: ['docker pull redis:latest', 'docker pull redis'],
        hints: [
          'Pull the redis image',
          'Try: docker pull redis:latest'
        ],
        successMessage: 'Great! Now we have two images ready to use.'
      },
      {
        id: 'run-web-server',
        title: 'Start a web server',
        description: 'Run nginx as a web server container.',
        expectedCommand: ['docker run -d --name web-server -p 80:80 nginx:latest', 'docker run -d --name web-server -p 80:80 nginx'],
        hints: [
          'Use docker run with -d for detached mode',
          'Use -p 80:80 to map port 80',
          'Try: docker run -d --name web-server -p 80:80 nginx:latest'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'web-server' && c.status === 'running')
        },
        successMessage: 'Web server is running! The -p flag maps ports from container to host.'
      },
      {
        id: 'run-cache',
        title: 'Start a cache server',
        description: 'Run redis as a cache server.',
        expectedCommand: ['docker run -d --name cache-server redis:latest', 'docker run -d --name cache-server redis'],
        hints: [
          'Run redis with a different name',
          'Try: docker run -d --name cache-server redis:latest'
        ],
        validation: (state) => {
          return state.containers.filter(c => c.status === 'running').length >= 2
        },
        successMessage: 'Excellent! You now have multiple containers running together.'
      },
      {
        id: 'inspect-running',
        title: 'Check all running containers',
        description: 'List all running containers to see both services.',
        expectedCommand: ['docker ps', 'docker container ls'],
        hints: [
          'Use docker ps to see all running containers',
          'Try: docker ps'
        ],
        successMessage: 'Perfect! You can see multiple containers running simultaneously.'
      },
      {
        id: 'stop-all',
        title: 'Stop a specific container',
        description: 'Stop just the web server while leaving the cache running.',
        expectedCommand: ['docker stop web-server'],
        hints: [
          'Use docker stop with the container name',
          'Try: docker stop web-server'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'web-server' && c.status === 'stopped')
        },
        successMessage: 'Good! You can control containers individually.'
      },
      {
        id: 'cleanup-all',
        title: 'Clean up all containers',
        description: 'Remove all containers to finish the tutorial.',
        expectedCommand: ['docker rm web-server', 'docker rm cache-server', 'docker stop cache-server'],
        hints: [
          'Stop and remove both containers',
          'You may need to stop cache-server first',
          'Try: docker stop cache-server, then docker rm cache-server and docker rm web-server'
        ],
        validation: (state) => {
          return state.containers.length === 0
        },
        successMessage: 'Excellent work! You\'ve mastered managing multiple containers.'
      }
    ]
  },
  {
    id: 'container-lifecycle',
    title: 'Container Lifecycle Management',
    description: 'Master the complete lifecycle: create, start, pause, restart, and more.',
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    icon: 'cycle',
    steps: [
      {
        id: 'pull-ubuntu',
        title: 'Pull Ubuntu image',
        description: 'We\'ll use Ubuntu to explore container lifecycle management.',
        expectedCommand: ['docker pull ubuntu:latest', 'docker pull ubuntu'],
        hints: [
          'Pull the ubuntu image',
          'Try: docker pull ubuntu:latest'
        ],
        successMessage: 'Ubuntu image ready!'
      },
      {
        id: 'run-interactive',
        title: 'Run a named container',
        description: 'Create a container with a specific name for easier management.',
        expectedCommand: ['docker run -d --name lifecycle-demo ubuntu:latest sleep 3600', 'docker run -d --name lifecycle-demo ubuntu sleep 3600'],
        hints: [
          'Use docker run with --name flag',
          'Add a command like "sleep 3600" to keep it running',
          'Try: docker run -d --name lifecycle-demo ubuntu:latest sleep 3600'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'lifecycle-demo' && c.status === 'running')
        },
        successMessage: 'Container is running with a long-running process!'
      },
      {
        id: 'inspect-container',
        title: 'Inspect the container',
        description: 'View detailed information about your container.',
        expectedCommand: ['docker ps', 'docker inspect lifecycle-demo'],
        hints: [
          'Use docker ps to see running containers',
          'Try: docker ps'
        ],
        successMessage: 'You can see all the container details!'
      },
      {
        id: 'stop-and-start',
        title: 'Stop the container',
        description: 'Stop the container gracefully.',
        expectedCommand: ['docker stop lifecycle-demo'],
        hints: [
          'Use docker stop with the container name',
          'Try: docker stop lifecycle-demo'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'lifecycle-demo' && c.status === 'stopped')
        },
        successMessage: 'Stopped! The container still exists and can be restarted.'
      },
      {
        id: 'start-again',
        title: 'Start the container again',
        description: 'Restart a stopped container.',
        expectedCommand: ['docker start lifecycle-demo'],
        hints: [
          'Use docker start to restart a stopped container',
          'Try: docker start lifecycle-demo'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'lifecycle-demo' && c.status === 'running')
        },
        successMessage: 'The container is running again with the same state!'
      },
      {
        id: 'view-all-containers',
        title: 'View all containers',
        description: 'Check both running and stopped containers.',
        expectedCommand: ['docker ps -a', 'docker container ls -a'],
        hints: [
          'Use docker ps -a to see all containers (running and stopped)',
          'Try: docker ps -a'
        ],
        successMessage: 'The -a flag shows all containers, not just running ones!'
      },
      {
        id: 'final-cleanup',
        title: 'Force remove running container',
        description: 'Remove a running container without stopping it first.',
        expectedCommand: ['docker rm -f lifecycle-demo'],
        hints: [
          'Use docker rm with the -f flag to force removal',
          'Try: docker rm -f lifecycle-demo'
        ],
        validation: (state) => {
          return !state.containers.some(c => c.name === 'lifecycle-demo')
        },
        successMessage: 'Perfect! The -f flag forces removal even if the container is running.'
      }
    ]
  },
  {
    id: 'advanced-operations',
    title: 'Advanced Container Operations',
    description: 'Learn port mapping, environment variables, and container inspection.',
    difficulty: 'intermediate',
    estimatedTime: '12 min',
    icon: 'gear',
    steps: [
      {
        id: 'setup-images',
        title: 'Pull required images',
        description: 'Let\'s pull nginx and postgres for advanced operations.',
        expectedCommand: ['docker pull nginx:latest', 'docker pull nginx'],
        hints: [
          'Pull the nginx image first',
          'Try: docker pull nginx:latest'
        ],
        successMessage: 'Nginx ready!'
      },
      {
        id: 'pull-postgres',
        title: 'Pull database image',
        description: 'Pull PostgreSQL database image.',
        expectedCommand: ['docker pull postgres:latest', 'docker pull postgres'],
        hints: [
          'Pull the postgres image',
          'Try: docker pull postgres:latest'
        ],
        successMessage: 'Database image ready!'
      },
      {
        id: 'run-with-ports',
        title: 'Run with port mapping',
        description: 'Run nginx with custom port mapping.',
        expectedCommand: ['docker run -d --name web -p 8080:80 nginx:latest', 'docker run -d --name web -p 8080:80 nginx'],
        hints: [
          'Use -p to map ports: -p host-port:container-port',
          'Map host port 8080 to container port 80',
          'Try: docker run -d --name web -p 8080:80 nginx:latest'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'web' && c.ports.includes('8080:80'))
        },
        successMessage: 'Great! Port mapping allows accessing container services from the host.'
      },
      {
        id: 'run-with-env',
        title: 'Run with environment variables',
        description: 'Run postgres with required environment variables.',
        expectedCommand: ['docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:latest', 'docker run -d --name db -e POSTGRES_PASSWORD=secret postgres'],
        hints: [
          'Use -e to set environment variables',
          'Postgres requires POSTGRES_PASSWORD',
          'Try: docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:latest'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'db')
        },
        successMessage: 'Perfect! Environment variables configure container behavior.'
      },
      {
        id: 'list-with-ports',
        title: 'View containers with details',
        description: 'Check all containers to see their port mappings.',
        expectedCommand: ['docker ps', 'docker container ls'],
        hints: [
          'Use docker ps to see running containers',
          'Notice the PORTS column',
          'Try: docker ps'
        ],
        successMessage: 'You can see port mappings and other details in the output!'
      },
      {
        id: 'stop-multiple',
        title: 'Stop multiple containers',
        description: 'Stop both containers.',
        expectedCommand: ['docker stop web', 'docker stop db'],
        hints: [
          'Stop both containers one by one',
          'Try: docker stop web and then docker stop db'
        ],
        validation: (state) => {
          return state.containers.every(c => c.status === 'stopped')
        },
        successMessage: 'Both containers stopped!'
      },
      {
        id: 'cleanup-advanced',
        title: 'Remove all containers',
        description: 'Clean up both containers.',
        expectedCommand: ['docker rm web', 'docker rm db'],
        hints: [
          'Remove both stopped containers',
          'Try: docker rm web and docker rm db'
        ],
        validation: (state) => {
          return state.containers.length === 0
        },
        successMessage: 'Excellent! You\'ve mastered advanced container operations!'
      }
    ]
  },
  {
    id: 'image-tagging',
    title: 'Image Tagging & Organization',
    description: 'Learn to tag images, view layer history, and organize your image library.',
    difficulty: 'intermediate',
    estimatedTime: '8 min',
    icon: 'tag',
    steps: [
      {
        id: 'check-images',
        title: 'List available images',
        description: 'Start by checking what images you already have locally.',
        expectedCommand: ['docker images'],
        hints: [
          'Use docker images to list all local images',
          'Try: docker images'
        ],
        successMessage: 'Good! You can see all your local images with their tags and sizes.'
      },
      {
        id: 'pull-node',
        title: 'Pull a base image',
        description: 'Pull the Node.js Alpine image — a small, efficient base for apps.',
        expectedCommand: ['docker pull node:20-alpine', 'docker pull node'],
        hints: [
          'Pull the node image with the 20-alpine tag',
          'Try: docker pull node:20-alpine'
        ],
        successMessage: 'Node.js Alpine is a popular lightweight base image!'
      },
      {
        id: 'tag-image',
        title: 'Tag the image',
        description: 'Create a new tag for the image to simulate pushing to your own registry.',
        expectedCommand: ['docker tag node:20-alpine myapp:latest', 'docker tag node myapp:latest'],
        hints: [
          'Use docker tag SOURCE TARGET to create a new reference',
          'Try: docker tag node:20-alpine myapp:latest'
        ],
        validation: (state) => {
          return state.images.some(i => i.name === 'myapp')
        },
        successMessage: 'Tagged! The new tag shares the same layers as the source — no extra space used.'
      },
      {
        id: 'tag-version',
        title: 'Create a version tag',
        description: 'Tag the image with a version number for proper release management.',
        expectedCommand: ['docker tag node:20-alpine myapp:v1.0', 'docker tag node myapp:v1.0'],
        hints: [
          'Tag with a version number like v1.0',
          'Try: docker tag node:20-alpine myapp:v1.0'
        ],
        validation: (state) => {
          return state.images.some(i => i.name === 'myapp' && i.tag === 'v1.0')
        },
        successMessage: 'Version tags help track releases — always tag with semantic versions in production!'
      },
      {
        id: 'view-history',
        title: 'View image layer history',
        description: 'Inspect the layers that make up an image to understand how it was built.',
        expectedCommand: ['docker history node:20-alpine', 'docker history node', 'docker history myapp:latest', 'docker history myapp:v1.0'],
        hints: [
          'Use docker history to see image layers',
          'Try: docker history node:20-alpine'
        ],
        successMessage: 'Each layer represents a build step. Smaller images mean faster pulls and deployments!'
      },
      {
        id: 'verify-tags',
        title: 'Verify your tagged images',
        description: 'List images again to see all your tags alongside the originals.',
        expectedCommand: ['docker images'],
        hints: [
          'List all images to see your work',
          'Try: docker images'
        ],
        successMessage: 'Excellent! You\'ve mastered image tagging. Tags are essential for versioning and registry workflows!'
      }
    ]
  },
  {
    id: 'cleanup-workflows',
    title: 'System Cleanup & Maintenance',
    description: 'Learn to clean up unused resources and keep your Docker environment tidy.',
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    icon: 'broom',
    steps: [
      {
        id: 'create-mess',
        title: 'Create some containers',
        description: 'Let\'s create a few containers to simulate a busy development environment.',
        expectedCommand: ['docker run -d --name app-1 nginx:latest', 'docker run -d --name app-1 nginx'],
        hints: [
          'Run an nginx container named app-1',
          'Try: docker run -d --name app-1 nginx'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'app-1')
        },
        successMessage: 'First container created!'
      },
      {
        id: 'create-more',
        title: 'Create another container',
        description: 'Add a second container to the mix.',
        expectedCommand: ['docker run -d --name app-2 redis:alpine', 'docker run -d --name app-2 redis'],
        hints: [
          'Run a redis container named app-2',
          'Try: docker run -d --name app-2 redis:alpine'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'app-2')
        },
        successMessage: 'Two containers running now!'
      },
      {
        id: 'stop-one',
        title: 'Stop a container',
        description: 'Stop one container to simulate an abandoned workload.',
        expectedCommand: ['docker stop app-1'],
        hints: [
          'Stop the first container',
          'Try: docker stop app-1'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'app-1' && c.status === 'stopped')
        },
        successMessage: 'Now we have a mix of running and stopped containers — a common real-world scenario.'
      },
      {
        id: 'view-all',
        title: 'View all containers including stopped',
        description: 'Use the -a flag to see all containers, including stopped ones.',
        expectedCommand: ['docker ps -a'],
        hints: [
          'Add -a flag to see all containers',
          'Try: docker ps -a'
        ],
        successMessage: 'The -a flag reveals stopped containers that are still using disk space.'
      },
      {
        id: 'system-prune',
        title: 'Prune the system',
        description: 'Use system prune to clean up stopped containers and unused images in one command.',
        expectedCommand: ['docker system prune'],
        hints: [
          'System prune removes all stopped containers and unused images',
          'Try: docker system prune'
        ],
        validation: (state) => {
          return !state.containers.some(c => c.status === 'stopped')
        },
        successMessage: 'Clean! System prune is the quickest way to reclaim disk space. Always review what\'s running first!'
      },
      {
        id: 'verify-cleanup',
        title: 'Verify the cleanup',
        description: 'Check that stopped containers were removed while running ones are still active.',
        expectedCommand: ['docker ps -a', 'docker ps'],
        hints: [
          'List all containers to confirm the cleanup',
          'Try: docker ps -a'
        ],
        successMessage: 'Excellent! You\'ve learned to keep Docker environments clean — a critical production skill!'
      }
    ]
  },
  {
    id: 'docker-networking',
    title: 'Docker Networking',
    description: 'Learn to create networks, connect containers, and enable inter-service communication.',
    difficulty: 'advanced',
    estimatedTime: '12 min',
    icon: 'graph',
    steps: [
      {
        id: 'list-networks',
        title: 'List default networks',
        description: 'Docker comes with built-in networks. Let\'s see them.',
        expectedCommand: ['docker network ls'],
        hints: [
          'Use docker network ls to list all networks',
          'Try: docker network ls'
        ],
        successMessage: 'You can see the default bridge, host, and none networks. Containers use "bridge" by default.'
      },
      {
        id: 'create-network',
        title: 'Create a custom network',
        description: 'Custom networks enable DNS-based service discovery between containers.',
        expectedCommand: ['docker network create app-net'],
        hints: [
          'Use docker network create followed by a name',
          'Try: docker network create app-net'
        ],
        validation: (_state) => {
          // Check against containers/images since that's what validation receives
          // The network creation is verified through the command match
          return true
        },
        successMessage: 'Custom network created! Containers on the same custom network can reach each other by name.'
      },
      {
        id: 'run-on-network',
        title: 'Run a container on the network',
        description: 'Launch an nginx container attached to your custom network.',
        expectedCommand: ['docker run -d --name web --network app-net nginx:latest', 'docker run -d --name web --network app-net nginx'],
        hints: [
          'Use --network to attach a container to a specific network at run time',
          'Try: docker run -d --name web --network app-net nginx:latest'
        ],
        validation: (state) => {
          return state.containers.some(c => c.name === 'web' && c.status === 'running')
        },
        successMessage: 'Container is running on your custom network!'
      },
      {
        id: 'run-second-container',
        title: 'Add a second container',
        description: 'Add a redis container to the same network so the services can communicate.',
        expectedCommand: ['docker run -d --name cache --network app-net redis:alpine', 'docker run -d --name cache --network app-net redis'],
        hints: [
          'Run redis on the same app-net network',
          'Try: docker run -d --name cache --network app-net redis:alpine'
        ],
        validation: (state) => {
          return state.containers.filter(c => c.status === 'running').length >= 2
        },
        successMessage: 'Both containers share the same network and can communicate using their names (e.g., ping web from cache).'
      },
      {
        id: 'connect-existing',
        title: 'Connect a container to another network',
        description: 'Containers can belong to multiple networks. Let\'s connect web to the default bridge too.',
        expectedCommand: ['docker network connect bridge web'],
        hints: [
          'Use docker network connect NETWORK CONTAINER',
          'Try: docker network connect bridge web'
        ],
        successMessage: 'A container can be on multiple networks — useful for gateway patterns between isolated services.'
      },
      {
        id: 'disconnect-container',
        title: 'Disconnect from a network',
        description: 'Remove the web container from the bridge network.',
        expectedCommand: ['docker network disconnect bridge web'],
        hints: [
          'Use docker network disconnect NETWORK CONTAINER',
          'Try: docker network disconnect bridge web'
        ],
        successMessage: 'Disconnected! Network segmentation is key to secure microservice architectures.'
      },
      {
        id: 'cleanup-networking',
        title: 'Clean up',
        description: 'Stop and remove the containers, then remove the custom network.',
        expectedCommand: ['docker stop web', 'docker stop cache', 'docker rm web', 'docker rm cache', 'docker network rm app-net'],
        hints: [
          'Stop both containers, remove them, then remove the network',
          'Try: docker stop web, docker stop cache, then docker rm web, docker rm cache, docker network rm app-net'
        ],
        validation: (state) => {
          return state.containers.length === 0
        },
        successMessage: 'Excellent! You\'ve mastered Docker networking — networks isolate services and enable secure communication between containers.'
      }
    ]
  }
]

export function getTutorialById(id: string): Tutorial | undefined {
  return tutorials.find(t => t.id === id)
}

export function checkCommandMatch(expected: string | string[], actual: string): boolean {
  const normalizedActual = actual.trim().toLowerCase()
  
  if (Array.isArray(expected)) {
    return expected.some(cmd => normalizedActual === cmd.toLowerCase().trim())
  }
  
  return normalizedActual === expected.toLowerCase().trim()
}
