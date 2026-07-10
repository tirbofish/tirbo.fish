import { useEffect, useRef } from 'react'
import { readHiScore, saveHiScore } from './hiScore'

type Kind = 'fry' | 'fish' | 'turbo' | 'tirbo'

type Swimmer = { kind: Kind; x: number; y: number; vx: number }
type Jelly = { x0: number; y: number; t: number; vy: number }
type Bubble = { x: number; y: number; vy: number }
type Pop = { x: number; y: number; text: string; t: number }

type Mode = 'idle' | 'play' | 'over'

type Game = {
  mode: Mode
  t: number
  score: number
  hi: number
  hookY: number
  hookVy: number
  up: boolean
  down: boolean
  swimmers: Swimmer[]
  jellies: Jelly[]
  bubbles: Bubble[]
  pops: Pop[]
  spawnT: number
  jellyT: number
  bubbleT: number
}

const SPRITES: Record<Kind, { r: string; l: string; pts: number }> = {
  fry: { r: '><>', l: '<><', pts: 1 },
  fish: { r: '><)))*>', l: '<*(((><', pts: 10 },
  turbo: { r: '::<>', l: '<>::', pts: 5 },
  tirbo: { r: '::<tirbofish>', l: '<tirbofish>::', pts: 50 },
}

const JELLY_SPRITE = '\\(;;)/'
const CRAB_SPRITE = 'V(..)V'

const BOAT = ['    o _______', "   /|\\/", ' __/_\\_____', ' \\_________/']
const ROD_TIP_OFFSET = 12 // column of the fishing line, relative to the boat

const WATERLINE = 8

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max)

const hash = (n: number) => {
  let h = (n ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ (h >>> 16), 2246822519) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

const put = (grid: string[][], x: number, y: number, text: string) => {
  if (y < 0 || y >= grid.length) return
  const row = grid[y]
  const cx = Math.round(x)
  for (let i = 0; i < text.length; i++) {
    const px = cx + i
    if (px < 0 || px >= row.length) continue
    if (text[i] !== ' ') row[px] = text[i]
  }
}

const putCentered = (grid: string[][], y: number, text: string) => {
  put(grid, Math.floor((grid[0].length - text.length) / 2), y, text)
}

function spawnSwimmer(cols: number, rows: number): Swimmer {
  const roll = Math.random()
  const kind: Kind =
    roll < 0.5 ? 'fry' : roll < 0.75 ? 'turbo' : roll < 0.94 ? 'fish' : 'tirbo'
  const speed =
    kind === 'fry'
      ? 5 + Math.random() * 4
      : kind === 'turbo'
        ? 10 + Math.random() * 6
        : kind === 'fish'
          ? 4 + Math.random() * 3
          : 18 + Math.random() * 8
  const goingRight = Math.random() < 0.5
  const len = SPRITES[kind].r.length
  return {
    kind,
    x: goingRight ? -len : cols,
    y: WATERLINE + 2 + Math.floor(Math.random() * (rows - WATERLINE - 5)),
    vx: goingRight ? speed : -speed,
  }
}

export function FishingGame({ onExit }: { onExit: (hi: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const quitRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const isTouch = window.matchMedia('(pointer: coarse)').matches

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    let cols = 80
    let rows = 24
    let chW = 8.4
    let lineH = 16
    let ink = '#fff4e6'

    const measure = () => {
      const style = getComputedStyle(canvas)
      const fontSize = parseFloat(style.fontSize) || 14
      lineH = fontSize * 1.15
      ink = style.color
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      // resizing resets canvas state, so reconfigure everything
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${fontSize}px ${style.fontFamily}`
      ctx.textBaseline = 'top'
      chW = ctx.measureText('M').width || chW
      cols = Math.max(48, Math.floor(window.innerWidth / chW))
      rows = Math.max(22, Math.floor(window.innerHeight / lineH))
    }

    measure()
    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('resize', measure)

    const game: Game = {
      mode: 'idle',
      t: 0,
      score: 0,
      hi: readHiScore(),
      hookY: WATERLINE - 1,
      hookVy: 0,
      up: false,
      down: false,
      swimmers: [],
      jellies: [],
      bubbles: [],
      pops: [],
      spawnT: 0.4,
      jellyT: 4,
      bubbleT: 0.5,
    }

    const boatX = () => Math.max(2, Math.floor(cols * 0.16))
    const lineX = () => boatX() + ROD_TIP_OFFSET
    const seafloor = () => rows - 2

    const cast = () => {
      game.mode = 'play'
      game.score = 0
      game.hookY = WATERLINE + 1
      game.hookVy = 3
      game.swimmers = []
      game.jellies = []
      game.pops = []
      game.spawnT = 0.3
      game.jellyT = 4
    }

    const quit = () => {
      game.hi = Math.max(game.hi, game.score)
      saveHiScore(game.hi)
      onExitRef.current(game.hi)
    }
    quitRef.current = quit

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        quit()
        return
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (game.mode !== 'play') cast()
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        game.up = true
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        game.down = true
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') game.up = false
      else if (e.key === 'ArrowDown') game.down = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // pointer controls: tap/click casts, press-and-hold reels up
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      if (game.mode !== 'play') cast()
      game.up = true
    }
    const onPointerUp = () => {
      game.up = false
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    const step = (dt: number) => {
      game.t += dt

      if (game.mode === 'play') {
        // hook physics: rises while holding up, sinks otherwise
        game.hookVy += (game.up ? -34 : 15) * dt
        if (game.down) game.hookVy += 26 * dt
        game.hookVy = clamp(game.hookVy, -13, 10)
        game.hookY += game.hookVy * dt
        const minY = WATERLINE + 1
        const maxY = seafloor() - 0.4
        if (game.hookY <= minY || game.hookY >= maxY) {
          game.hookY = clamp(game.hookY, minY, maxY)
          game.hookVy = 0
        }
      }

      if (game.mode !== 'over') {
        const playing = game.mode === 'play'
        const hx = lineX()
        const hy = Math.round(game.hookY)

        // spawn swimmers
        game.spawnT -= dt
        if (game.spawnT <= 0) {
          game.spawnT = 0.7 + Math.random() * 0.9
          game.swimmers.push(spawnSwimmer(cols, rows))
        }

        // spawn jellyfish while playing, faster as score grows
        if (playing) {
          game.jellyT -= dt
          if (game.jellyT <= 0) {
            const ramp = clamp(1 - game.score / 300, 0.35, 1)
            game.jellyT = (2.5 + Math.random() * 3) * ramp
            game.jellies.push({
              x0: 4 + Math.random() * (cols - 12),
              y: seafloor() - 0.5,
              t: Math.random() * Math.PI * 2,
              vy: 1.5 + Math.random() * 1.8,
            })
          }
        }

        // move swimmers + catch detection
        game.swimmers = game.swimmers.filter((s) => {
          s.x += s.vx * dt
          const len = SPRITES[s.kind].r.length
          if (s.x < -len - 2 || s.x > cols + 2) return false
          const sx = Math.round(s.x)
          if (playing && s.y === hy && hx >= sx && hx < sx + len) {
            const pts = SPRITES[s.kind].pts
            game.score += pts
            game.hi = Math.max(game.hi, game.score)
            game.pops.push({ x: hx - 1, y: hy - 1, text: `+${pts}`, t: 0 })
            if (s.kind === 'tirbo')
              game.pops.push({ x: hx - 5, y: hy - 2, text: 'tirbofish!!', t: 0 })
            for (let i = 0; i < 3; i++)
              game.bubbles.push({
                x: hx + (Math.random() * 4 - 2),
                y: hy,
                vy: 3 + Math.random() * 3,
              })
            return false
          }
          return true
        })

        // move jellyfish + sting detection
        let stung = false
        game.jellies = game.jellies.filter((j) => {
          j.t += dt
          j.y -= j.vy * dt
          if (j.y < WATERLINE + 1) return false
          const jx = Math.round(j.x0 + Math.sin(j.t * 2) * 2)
          const jy = Math.round(j.y)
          if (playing && jy === hy && hx >= jx && hx < jx + JELLY_SPRITE.length)
            stung = true
          return true
        })
        if (stung) {
          game.mode = 'over'
          saveHiScore(game.hi)
        }

        // ambient + hook bubbles
        game.bubbleT -= dt
        if (game.bubbleT <= 0) {
          game.bubbleT = 0.25 + Math.random() * 0.4
          game.bubbles.push(
            playing && Math.random() < 0.4
              ? { x: hx + 1, y: game.hookY, vy: 3 + Math.random() * 2 }
              : {
                  x: Math.random() * cols,
                  y: seafloor() - 1,
                  vy: 2 + Math.random() * 4,
                },
          )
        }
      }

      game.bubbles = game.bubbles.filter((b) => {
        b.y -= b.vy * dt
        return b.y > WATERLINE + 0.5
      })
      game.pops = game.pops.filter((p) => {
        p.t += dt
        return p.t < 1.1
      })
    }

    const draw = () => {
      const grid: string[][] = Array.from({ length: rows }, () =>
        new Array<string>(cols).fill(' '),
      )
      const bx = boatX()
      const hx = lineX()
      const floor = seafloor()

      // seafloor sand
      for (let x = 0; x < cols; x++)
        grid[rows - 1][x] = hash(x) % 5 === 0 ? ',' : '.'

      // seaweed
      for (let x = 2; x < cols - 2; x++) {
        const h = hash(x * 31)
        if (h % 13 === 0 && hash((x - 1) * 31) % 13 !== 0) {
          const height = 2 + (h % 4)
          for (let k = 0; k < height; k++)
            put(grid, x, floor - k, k % 2 === 0 ? '(' : ')')
        }
      }

      // crab patrolling the seafloor
      const crabX =
        cols / 2 + Math.sin(game.t * 0.35) * (cols / 2 - CRAB_SPRITE.length - 4)
      put(grid, crabX, floor, CRAB_SPRITE)

      // bubbles
      for (const b of game.bubbles)
        put(grid, b.x, Math.round(b.y), hash(Math.round(b.x) * 7) % 3 ? '.' : 'o')

      // swimmers
      for (const s of game.swimmers) {
        const sprite = s.vx >= 0 ? SPRITES[s.kind].r : SPRITES[s.kind].l
        put(grid, s.x, s.y, sprite)
      }

      // jellyfish
      for (const j of game.jellies)
        put(grid, j.x0 + Math.sin(j.t * 2) * 2, Math.round(j.y), JELLY_SPRITE)

      // waterline shimmer (skip under the hull)
      for (let x = 0; x < cols; x++) {
        if (x > bx && x < bx + 11) continue
        grid[WATERLINE][x] =
          (x + Math.floor(game.t * 5)) % 9 === 4 ? ' ' : '~'
      }

      // boat + fisher + rod
      for (let i = 0; i < BOAT.length; i++)
        put(grid, bx, WATERLINE - 4 + i, BOAT[i])

      // fishing line, float and hook
      const hy = Math.round(game.hookY)
      for (let y = WATERLINE - 3; y < hy; y++) put(grid, hx, y, '|')
      if (game.mode !== 'idle') put(grid, hx - 1, WATERLINE, 'o')
      put(grid, hx, hy, 'J')

      // score popups
      for (const p of game.pops)
        put(grid, p.x, Math.round(p.y - p.t * 3), p.text)

      // HUD
      put(grid, 2, 1, `score ${game.score}   hi ${game.hi}`)
      const help = isTouch
        ? '[tap] cast   [hold] reel up'
        : '[space] cast   [up] reel up   [esc] quit'
      put(grid, 2, 2, help)

      if (game.mode === 'idle') {
        putCentered(grid, 3, "~ gone fishin' ~")
        putCentered(
          grid,
          5,
          isTouch ? 'tap to cast your line' : 'press [space] to cast your line',
        )
      } else if (game.mode === 'over') {
        const lines = [
          'stung by a jellyfish!',
          `score ${game.score}   hi ${game.hi}`,
          isTouch ? '[tap] recast' : '[space] recast   [esc] quit',
        ]
        const w = Math.max(...lines.map((l) => l.length)) + 6
        const top = Math.floor(rows / 2) - 3
        const left = Math.floor((cols - w) / 2)
        put(grid, left, top, `+${'-'.repeat(w - 2)}+`)
        lines.forEach((l, i) => {
          const pad = Math.floor((w - 2 - l.length) / 2)
          put(
            grid,
            left,
            top + 1 + i,
            `|${' '.repeat(pad)}${l}${' '.repeat(w - 2 - pad - l.length)}|`,
          )
        })
        put(grid, left, top + lines.length + 1, `+${'-'.repeat(w - 2)}+`)
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.fillStyle = ink
      for (let y = 0; y < rows; y++)
        ctx.fillText(grid[y].join(''), 0, y * lineH)
    }

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(dt)
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('resize', measure)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-cocoa font-mono text-cream"
      role="dialog"
      aria-label="ASCII fishing game. Tap or press space to cast, hold or press up arrow to reel up, escape to quit."
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none select-none font-mono text-sm text-cream"
        aria-hidden="true"
      />
      <button
        className="absolute right-3 top-1.5 cursor-pointer border-0 bg-transparent p-2 font-mono text-sm text-cream opacity-70 outline-offset-[0.35em] [-webkit-tap-highlight-color:transparent] hover:underline hover:opacity-100 focus-visible:rounded-[0.15em] focus-visible:outline-2 focus-visible:outline-current"
        type="button"
        onClick={() => quitRef.current()}
        aria-label="Quit fishing game"
      >
        [x] quit
      </button>
    </div>
  )
}
