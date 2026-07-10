import { useEffect, useState } from 'react'
import './App.css'
import { Landing } from './Landing'

const viewRevealDelay = 700

function App() {
  const [isExpanding, setIsExpanding] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (!isExpanding) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const timeout = window.setTimeout(
      () => setHasEntered(true),
      reducedMotion ? 0 : viewRevealDelay,
    )

    return () => window.clearTimeout(timeout)
  }, [isExpanding])

  if (hasEntered) {
    return <Landing />
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-hidden bg-cocoa p-8 text-cream">
      <button
        className="group relative inline-grid cursor-pointer place-items-center border-0 bg-transparent p-0 font-mono text-inherit outline-offset-[0.45em] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
        type="button"
        onClick={() => setIsExpanding(true)}
        disabled={isExpanding}
        aria-label="Enter Thribhu K's portfolio"
      >
        <span
          className={`pointer-events-none fixed left-1/2 top-1/2 z-0 size-[clamp(11rem,36vw,21.5rem)] -translate-x-1/2 -translate-y-1/2 transition-[scale,opacity] motion-reduce:transition-none ${
            isExpanding
              ? 'scale-[15] opacity-100 duration-700 ease-in-out'
              : 'scale-90 opacity-0 duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100'
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute inset-0 rounded-full bg-cream ${
              isExpanding ? '' : 'animate-pulse-scale'
            } motion-reduce:animate-none`}
          />
        </span>

        <span
          className={`relative z-10 [grid-area:1/1] whitespace-nowrap text-[clamp(1.55rem,5vw,3rem)] font-bold leading-none tracking-[-0.08em] transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${
            isExpanding
              ? '-translate-y-[0.35em] opacity-0'
              : 'group-hover:-translate-y-[0.35em] group-hover:opacity-0 group-focus-visible:-translate-y-[0.35em] group-focus-visible:opacity-0'
          }`}
          aria-hidden="true"
        >
          ::&lt;tirbofish&gt;
        </span>
        <span
          className={`relative z-10 [grid-area:1/1] whitespace-nowrap text-[clamp(1.55rem,5vw,3rem)] leading-none tracking-[0.02em] text-cocoa transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${
            isExpanding
              ? 'translate-y-0 opacity-100'
              : 'translate-y-[0.35em] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100'
          }`}
          aria-hidden="true"
        >
          Thribhu K
        </span>
      </button>
    </main>
  )
}

export default App
