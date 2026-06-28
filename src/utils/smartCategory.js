import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

// Minimum times a word must have been seen before it's trusted as a word-level key.
// This prevents personal names or one-off words from polluting category signals.
const WORD_CONFIDENCE_THRESHOLD = 2

export async function getSmartCategory(note) {
  try {
    if (!auth.currentUser || !note) return null

    const uid = auth.currentUser.uid
    const keyword = normalizeNote(note)
    if (!keyword) return null

    const words = getWords(keyword)

    // Always check the full note first (personal → global)
    const [personalFull, globalFull] = await Promise.all([
      getDoc(doc(db, 'userPatterns', `${uid}_${keyword}`)),
      getDoc(doc(db, 'globalPatterns', keyword)),
    ])

    if (personalFull.exists()) {
      const best = getBestCategory(personalFull.data())
      if (best) return best
    }
    if (globalFull.exists()) {
      const best = getBestCategory(globalFull.data())
      if (best) return best
    }

    // Fall back to word-level keys — only trust words with count >= threshold
    if (words.length === 0) return null

    const wordSnaps = await Promise.all([
      ...words.map(w => getDoc(doc(db, 'userPatterns', `${uid}_${w}`))),
      ...words.map(w => getDoc(doc(db, 'globalPatterns', w))),
    ])

    const votes = {}
    wordSnaps.forEach((snap, i) => {
      if (!snap.exists()) return
      const isPersonal = i < words.length
      const weight = isPersonal ? 2 : 1
      Object.entries(snap.data()).forEach(([cat, value]) => {
        if (!value || typeof value.count !== 'number') return
        if (value.count < WORD_CONFIDENCE_THRESHOLD) return  // skip low-confidence words
        votes[cat] = (votes[cat] || 0) + value.count * weight
      })
    })

    if (Object.keys(votes).length === 0) return null

    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1])
    const [topCat, topScore] = sorted[0]
    const secondScore = sorted[1]?.[1] ?? 0

    // If top category doesn't have at least 2x the votes of the runner-up,
    // the result is ambiguous — let Gemini decide instead.
    if (secondScore > 0 && topScore < secondScore * 2) return null

    return topCat

  } catch (error) {
    console.error('Smart category error:', error)
    return null
  }
}

export function normalizeNote(note) {
  return note
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

// Returns individual words (>3 chars) — all of them, no hardcoded whitelist.
// Confidence filtering happens at lookup time using saved counts.
export function getWords(keyword) {
  return keyword.split(' ').filter(w => w.length > 3)
}

// Returns the full phrase + all words for saving patterns
export function getKeys(keyword) {
  const keys = new Set([keyword])
  getWords(keyword).forEach(w => keys.add(w))
  return [...keys]
}

function getBestCategory(data) {
  let best = null
  let bestCount = 0
  Object.entries(data).forEach(([cat, value]) => {
    if (!value || typeof value.count !== 'number') return
    if (value.count > bestCount) { bestCount = value.count; best = cat }
  })
  return best
}
