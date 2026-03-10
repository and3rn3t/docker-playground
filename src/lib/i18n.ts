// Lightweight i18n framework for Docker Playground
// English is the default. Add new languages by creating a translation object
// and registering it with registerLocale().

export type LocaleKey = keyof typeof en

const en = {
  // App
  'app.title': 'Docker Playground',
  'app.subtitle': 'Learn Docker commands in an interactive sandbox',
  'app.skip-nav': 'Skip to terminal',

  // Header buttons
  'header.achievements': 'Achievements',
  'header.tutorials': 'Tutorials',
  'header.challenges': 'Challenges',
  'header.export': 'Export',
  'header.sandbox': 'Sandbox',
  'header.profile': 'Profile',
  'header.help': 'Help',
  'header.toggle-theme': 'Toggle theme',

  // Terminal
  'terminal.title': 'Docker Terminal',
  'terminal.hint': "Type 'help' for commands",
  'terminal.input-label': 'Docker terminal input',
  'terminal.output-label': 'Terminal output',
  'terminal.welcome': 'Welcome to Docker Playground! Type "help" to see available commands.',

  // Containers
  'containers.tab': 'Containers',
  'containers.empty': 'No containers yet. Try: docker run -d --name web nginx:latest',
  'containers.stop': 'Stop Container',
  'containers.start': 'Start Container',
  'containers.remove': 'Remove Container',

  // Images
  'images.tab': 'Images',
  'images.empty': 'No custom images yet. Try: docker pull ubuntu',
  'images.remove': 'Remove Image',

  // Tutorials
  'tutorials.start': 'Start',
  'tutorials.continue': 'Continue',
  'tutorials.restart': 'Restart',
  'tutorials.completed': 'Completed',

  // Achievements
  'achievements.unlocked': 'Achievement Unlocked!',
  'achievements.locked': 'Locked',

  // Profile
  'profile.title': 'Profile Dashboard',
  'profile.streak': 'Streak',
  'profile.daily-challenge': 'Daily Challenge',
  'profile.statistics': 'Statistics',
  'profile.commands': 'Commands',
  'profile.containers': 'Containers',
  'profile.images': 'Images',
  'profile.tutorials': 'Tutorials',

  // Common
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.loading': 'Loading...',
  'common.running': 'running',
  'common.stopped': 'stopped',
  'common.paused': 'paused',
  'common.exited': 'exited',
} as const

type Translations = typeof en

const locales: Record<string, Translations> = {
  en,
}

let currentLocale = 'en'

export function setLocale(locale: string): void {
  if (locales[locale]) {
    currentLocale = locale
  }
}

export function getLocale(): string {
  return currentLocale
}

export function registerLocale(code: string, translations: Translations): void {
  locales[code] = translations
}

export function t(key: LocaleKey): string {
  const translations = locales[currentLocale] ?? locales.en
  return translations[key] ?? en[key] ?? key
}

export function getAvailableLocales(): string[] {
  return Object.keys(locales)
}
