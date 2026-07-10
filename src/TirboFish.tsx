import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const threatRadius = 110
const dartCooldownMs = 600
const dartDistanceMin = 150
const dartDistanceMax = 450
const calmDelayMinMs = 2500
const calmDelayMaxMs = 4000
const offPageMargin = 40

type Point = { x: number; y: number }

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

function TirboFish() {
  const placeholderRef = useRef<HTMLSpanElement>(null)
  const fishRef = useRef<HTMLSpanElement>(null)
  const homeRef = useRef<Point | null>(null)
  const disturbedRef = useRef(false)
  const lastDartRef = useRef(0)
  const calmTimerRef = useRef(0)

  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [pos, setPos] = useState<Point | null>(null)
  const [settled, setSettled] = useState(false)
  const [darting, setDarting] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [away, setAway] = useState(false)

  // Enable movement transitions only after the fish has painted at home,
  // so it doesn't visibly swim in from the viewport origin on load.
  useEffect(() => {
    if (pos && !settled) setSettled(true)
  }, [pos, settled])

  useLayoutEffect(() => {
    if (reducedMotion) return

    const measureHome = () => {
      const rect = placeholderRef.current?.getBoundingClientRect()
      if (!rect) return null
      homeRef.current = { x: rect.left, y: rect.top }
      return homeRef.current
    }

    const settleAtHome = () => {
      const home = measureHome()
      if (home && !disturbedRef.current) setPos(home)
    }

    settleAtHome()
    // Re-measure once the navbar's view-in entrance animation has settled.
    const settleTimer = window.setTimeout(settleAtHome, 500)
    window.addEventListener('resize', settleAtHome)
    return () => {
      window.clearTimeout(settleTimer)
      window.removeEventListener('resize', settleAtHome)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return

    const swimHome = () => {
      disturbedRef.current = false
      setDarting(false)
      setAway(false)
      const rect = placeholderRef.current?.getBoundingClientRect()
      if (rect) homeRef.current = { x: rect.left, y: rect.top }
      const home = homeRef.current
      if (!home) return
      const fishRect = fishRef.current?.getBoundingClientRect()
      if (fishRect) setFlipped(home.x > fishRect.left)
      setPos(home)
    }

    const scheduleSwimHome = () => {
      window.clearTimeout(calmTimerRef.current)
      const delay =
        calmDelayMinMs + Math.random() * (calmDelayMaxMs - calmDelayMinMs)
      calmTimerRef.current = window.setTimeout(swimHome, delay)
    }

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now()
      if (now - lastDartRef.current < dartCooldownMs) return

      const fish = fishRef.current
      if (!fish) return

      const rect = fish.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const awayX = centerX - event.clientX
      const awayY = centerY - event.clientY
      if (Math.hypot(awayX, awayY) > threatRadius) return

      lastDartRef.current = now

      const jitter = (Math.random() - 0.5) * (Math.PI / 1.5)
      const angle = Math.atan2(awayY, awayX) + jitter
      const distance =
        dartDistanceMin + Math.random() * (dartDistanceMax - dartDistanceMin)

      const nextX = clamp(
        centerX + Math.cos(angle) * distance - rect.width / 2,
        -rect.width - offPageMargin,
        window.innerWidth + offPageMargin,
      )
      const nextY = clamp(
        centerY + Math.sin(angle) * distance - rect.height / 2,
        -rect.height - offPageMargin,
        window.innerHeight + offPageMargin,
      )

      disturbedRef.current = true
      setDarting(true)
      setAway(true)
      setFlipped(nextX > rect.left)
      setPos({ x: nextX, y: nextY })
      scheduleSwimHome()
    }

    window.addEventListener('pointermove', onPointerMove)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.clearTimeout(calmTimerRef.current)
    }
  }, [reducedMotion])

  const brandText = (
    <>
      <span className="inline-block animate-fin motion-reduce:animate-none">
        :
      </span>
      <span
        className="inline-block animate-fin motion-reduce:animate-none"
        style={{ animationDelay: 'calc(var(--fin-speed, 900ms) / -2)' }}
      >
        :
      </span>
      &lt;tirbofish&gt;
    </>
  )

  if (reducedMotion) {
    return (
      <span className="text-sm tracking-[-0.08em]" aria-hidden="true">
        {brandText}
      </span>
    )
  }

  return (
    <>
      <span
        className="inline-grid whitespace-nowrap text-sm"
        aria-hidden="true"
      >
        <span
          ref={placeholderRef}
          className="invisible tracking-[-0.08em] [grid-area:1/1]"
        >
          ::&lt;tirbofish&gt;
        </span>
        <span
          className={`tracking-[0.02em] transition-opacity duration-700 ease-out [grid-area:1/1] motion-reduce:transition-none ${
            away ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Thribhu K
        </span>
      </span>
      {createPortal(
        <span
          ref={fishRef}
          className={`pointer-events-none fixed left-0 top-0 z-30 whitespace-nowrap font-mono text-sm tracking-[-0.08em] text-cocoa ${
            settled
              ? `transition-[translate] ease-in-out ${
                  darting ? 'duration-[1400ms]' : 'duration-[2200ms]'
                }`
              : 'transition-none'
          } ${pos ? '' : 'invisible'}`}
          style={
            {
              translate: pos ? `${pos.x}px ${pos.y}px` : undefined,
              '--fin-speed': darting ? '450ms' : '900ms',
            } as React.CSSProperties
          }
          onTransitionEnd={(event) => {
            if (event.propertyName === 'translate' && !disturbedRef.current) {
              setFlipped(false)
            }
          }}
          aria-hidden="true"
        >
          <span
            className={`inline-block transition-transform duration-300 ${
              flipped ? '-scale-x-100' : ''
            }`}
          >
            {brandText}
          </span>
        </span>,
        document.body,
      )}
    </>
  )
}

export default TirboFish
