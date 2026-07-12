import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

type Project = { name: string; description: string; link?: string }
type SiteConfig = {
  name: string
  handle: string
  birthDate: string
  about: string
  links: { github: string; linkedin: string; email: string; resume: string }
  skills: string[]
  skillGroups: { name: string; items: string[] }[]
  featuredProjects: Project[]
  otherProjects: Project[]
}

const siteConfig = JSON.parse(
  readFileSync(new URL('./src/site-config.json', import.meta.url), 'utf8'),
) as SiteConfig

function terminalPortfolio(config: SiteConfig) {
  const birth = new Date(`${config.birthDate}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--

  const groups = config.skillGroups
    .map((group) => `  ${group.name}: ${group.items.join(', ')}`)
    .join('\n')
  const projects = [...config.featuredProjects, ...config.otherProjects]
    .map((project) => [
      `  ${project.name}`,
      `    ${project.description.replaceAll('\n', '\n    ')}`,
      project.link ? `    ${project.link}` : '',
    ].filter(Boolean).join('\n'))
    .join('\n\n')

  return [
    `# ${config.name} ${config.handle}`,
    '',
    config.about.replaceAll('{age}', String(age)),
    '',
    '## links',
    `  github:   ${config.links.github}`,
    `  linkedin: ${config.links.linkedin}`,
    `  email:    ${config.links.email}`,
    `  resume:   ${config.links.resume}`,
    '',
    '## skills',
    `  languages and tools: ${config.skills.join(', ')}`,
    groups,
    '',
    '## projects',
    projects,
    '',
  ].join('\n')
}

function terminalResponse() {
  const content = terminalPortfolio(siteConfig)

  return {
    name: 'terminal-response',
    configureServer(server: { middlewares: { use: (handler: (request: { url?: string; headers: { 'user-agent'?: string } }, response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (content: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/' || !/\b(curl|wget)\b/i.test(request.headers['user-agent'] ?? '')) return next()
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.setHeader('Vary', 'User-Agent')
        response.end(content)
      })
    },
    configurePreviewServer(server: { middlewares: { use: (handler: (request: { url?: string; headers: { 'user-agent'?: string } }, response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (content: string) => void }, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/' || !/\b(curl|wget)\b/i.test(request.headers['user-agent'] ?? '')) return next()
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.setHeader('Vary', 'User-Agent')
        response.end(content)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    terminalResponse(),
    react(),
    tailwindcss(),
  ],
})
