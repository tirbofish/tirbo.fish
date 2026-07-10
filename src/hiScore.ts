const HI_SCORE_KEY = 'tirbofish-hi-score'

export function readHiScore(): number {
  try {
    return Number(window.localStorage.getItem(HI_SCORE_KEY)) || 0
  } catch {
    return 0
  }
}

export function saveHiScore(score: number) {
  try {
    window.localStorage.setItem(HI_SCORE_KEY, String(score))
  } catch {
    /* ignore */
  }
}
