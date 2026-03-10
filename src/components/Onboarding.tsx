import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, ArrowLeft, X, Rocket, TerminalWindow, Cube, GraduationCap, Trophy, Keyboard } from '@phosphor-icons/react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tip?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Docker Playground!',
    description: 'This interactive sandbox lets you learn Docker commands without installing anything. Everything runs right in your browser.',
    icon: <Rocket weight="duotone" className="text-3xl text-accent" />,
    tip: 'No real Docker daemon required — it\'s all simulated!',
  },
  {
    id: 'terminal',
    title: 'The Terminal',
    description: 'Type Docker commands in the terminal on the left. Try "docker run -d --name web nginx" to create your first container.',
    icon: <TerminalWindow weight="duotone" className="text-3xl text-accent" />,
    tip: 'Press Tab for auto-complete, ↑/↓ for history, Ctrl+R to search.',
  },
  {
    id: 'containers',
    title: 'Containers & Images',
    description: 'The right panel shows your containers and images. Watch them appear in real-time as you run commands.',
    icon: <Cube weight="duotone" className="text-3xl text-accent" />,
    tip: 'Click on an image card to expand its layer details.',
  },
  {
    id: 'tutorials',
    title: 'Guided Tutorials',
    description: 'Follow step-by-step tutorials to learn Docker concepts. Each tutorial guides you through specific commands.',
    icon: <GraduationCap weight="duotone" className="text-3xl text-accent" />,
    tip: 'Start with "Getting Started" if you\'re new to Docker.',
  },
  {
    id: 'achievements',
    title: 'Achievements & Challenges',
    description: 'Earn achievements as you learn. Try timed challenges to test your skills under pressure!',
    icon: <Trophy weight="duotone" className="text-3xl text-accent" />,
    tip: 'There are hidden achievements too — explore to find them all!',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Use "d" as a shorthand for "docker". Type "help" to see all available commands. Use "clear" or Ctrl+L to clear the terminal.',
    icon: <Keyboard weight="duotone" className="text-3xl text-accent" />,
    tip: 'You can also use Ctrl+R to search through your command history.',
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  const step = ONBOARDING_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === ONBOARDING_STEPS.length - 1

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete()
    } else {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    }
  }, [isLast, onComplete])

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }, [isFirst])

  // Allow keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') onComplete()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome walkthrough"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="border-accent/50 overflow-hidden">
          <CardContent className="p-0">
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pt-4 px-6">
              {ONBOARDING_STEPS.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`h-1.5 rounded-full transition-colors ${
                    idx === currentStep
                      ? 'bg-accent w-6'
                      : idx < currentStep
                        ? 'bg-accent/40 w-1.5'
                        : 'bg-muted w-1.5'
                  }`}
                  layout
                />
              ))}
            </div>

            {/* Step content */}
            <div className="relative min-h-[260px] px-6 py-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  initial={{ x: direction * 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction * -60, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="p-4 rounded-full bg-accent/10 mb-4">
                    {step.icon}
                  </div>
                  <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  {step.tip && (
                    <div className="text-xs bg-accent/10 text-accent rounded-lg px-3 py-2 font-mono">
                      💡 {step.tip}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 pb-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={isFirst}
                className="gap-1"
              >
                <ArrowLeft weight="bold" />
                Back
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {ONBOARDING_STEPS.length}
              </span>
              <Button
                size="sm"
                onClick={goNext}
                className="gap-1 glow-primary"
              >
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && <ArrowRight weight="bold" />}
              </Button>
            </div>

            {/* Skip button */}
            <div className="absolute top-3 right-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onComplete}
                aria-label="Skip onboarding"
              >
                <X weight="bold" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
