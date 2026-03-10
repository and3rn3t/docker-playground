export interface CatalogImage {
  name: string
  description: string
  tags: string[]
  pulls: string
  official: boolean
  category: string
}

export const imageCatalog: CatalogImage[] = [
  {
    name: 'nginx',
    description: 'Official build of Nginx, a high-performance HTTP server and reverse proxy.',
    tags: ['latest', 'alpine', '1.25', '1.25-alpine', 'mainline'],
    pulls: '1B+',
    official: true,
    category: 'Web Server',
  },
  {
    name: 'node',
    description: 'Node.js is a JavaScript runtime built on V8.',
    tags: ['latest', '20', '20-alpine', '18', '18-alpine', 'lts'],
    pulls: '500M+',
    official: true,
    category: 'Runtime',
  },
  {
    name: 'postgres',
    description: 'The PostgreSQL object-relational database system.',
    tags: ['latest', '16', '15', '14', 'alpine'],
    pulls: '500M+',
    official: true,
    category: 'Database',
  },
  {
    name: 'redis',
    description: 'Redis is an open-source, in-memory data structure store.',
    tags: ['latest', '7', '7-alpine', '6', '6-alpine'],
    pulls: '500M+',
    official: true,
    category: 'Database',
  },
  {
    name: 'python',
    description: 'Python is an interpreted, high-level programming language.',
    tags: ['latest', '3.12', '3.12-slim', '3.11', '3.11-alpine'],
    pulls: '500M+',
    official: true,
    category: 'Runtime',
  },
  {
    name: 'ubuntu',
    description: 'Ubuntu is a Debian-based Linux operating system.',
    tags: ['latest', '24.04', '22.04', '20.04'],
    pulls: '1B+',
    official: true,
    category: 'OS',
  },
  {
    name: 'alpine',
    description: 'A minimal Docker image based on Alpine Linux.',
    tags: ['latest', '3.19', '3.18', '3.17'],
    pulls: '1B+',
    official: true,
    category: 'OS',
  },
  {
    name: 'mysql',
    description: 'MySQL is a widely used, open-source relational database management system.',
    tags: ['latest', '8.3', '8.0', '5.7'],
    pulls: '500M+',
    official: true,
    category: 'Database',
  },
  {
    name: 'mongo',
    description: 'MongoDB document databases provide high availability and easy scalability.',
    tags: ['latest', '7', '6', '5'],
    pulls: '500M+',
    official: true,
    category: 'Database',
  },
  {
    name: 'httpd',
    description: 'The Apache HTTP Server Project.',
    tags: ['latest', '2.4', '2.4-alpine'],
    pulls: '500M+',
    official: true,
    category: 'Web Server',
  },
  {
    name: 'golang',
    description: 'Go (golang) is a general-purpose, higher-level, imperative programming language.',
    tags: ['latest', '1.22', '1.22-alpine', '1.21'],
    pulls: '100M+',
    official: true,
    category: 'Runtime',
  },
  {
    name: 'rabbitmq',
    description: 'RabbitMQ is an open-source multi-protocol messaging broker.',
    tags: ['latest', '3-management', '3-alpine', '3'],
    pulls: '100M+',
    official: true,
    category: 'Messaging',
  },
  {
    name: 'elasticsearch',
    description: 'Elasticsearch is a distributed RESTful search and analytics engine.',
    tags: ['latest', '8.13.0', '7.17.18'],
    pulls: '100M+',
    official: false,
    category: 'Search',
  },
  {
    name: 'traefik',
    description: 'Traefik is a modern HTTP reverse proxy and load balancer.',
    tags: ['latest', 'v3.0', 'v2.11'],
    pulls: '100M+',
    official: false,
    category: 'Networking',
  },
  {
    name: 'grafana/grafana',
    description: 'The open observability platform.',
    tags: ['latest', '10.4.0', '9.5.18'],
    pulls: '100M+',
    official: false,
    category: 'Monitoring',
  },
  {
    name: 'prometheus',
    description: 'Prometheus monitoring system and time series database.',
    tags: ['latest', 'v2.50.1', 'v2.49.1'],
    pulls: '100M+',
    official: false,
    category: 'Monitoring',
  },
]

export function searchCatalog(query: string): CatalogImage[] {
  const q = query.toLowerCase()
  return imageCatalog.filter(
    (img) =>
      img.name.toLowerCase().includes(q) ||
      img.description.toLowerCase().includes(q) ||
      img.category.toLowerCase().includes(q),
  )
}

export function getCatalogImage(name: string): CatalogImage | undefined {
  return imageCatalog.find((img) => img.name === name)
}
