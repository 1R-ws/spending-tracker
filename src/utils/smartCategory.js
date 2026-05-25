import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export async function getSmartCategory(note) {

  try {

    if (!auth.currentUser || !note) return null

    const uid = auth.currentUser.uid

    const keyword = note
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .split(' ')[0]

    if (!keyword) return null

    // ─────────────────────────────────────────
    // 1. PERSONAL MEMORY FIRST (highest weight)
    //    patternId must start with uid + "_"
    // ─────────────────────────────────────────
    const personalSnap = await getDoc(
      doc(db, 'userPatterns', `${uid}_${keyword}`)
    )

    if (personalSnap.exists()) {
      const data = personalSnap.data()
      const best = getBestCategory(data)
      if (best) return best
    }

    // ─────────────────────────────────────────
    // 2. GLOBAL COMMUNITY MEMORY FALLBACK
    // ─────────────────────────────────────────
    const globalSnap = await getDoc(
      doc(db, 'globalPatterns', keyword)
    )

    if (globalSnap.exists()) {
      const data = globalSnap.data()
      const best = getBestCategory(data)
      if (best) return best
    }

    return null

  } catch (error) {
    console.error('Smart category error:', error)
    return null
  }
}

// ─────────────────────────────────────────
// Helper: pick category with highest count
// ─────────────────────────────────────────
function getBestCategory(data) {
  let bestCategory = null
  let bestCount = 0

  Object.entries(data).forEach(([category, value]) => {
    if (!value) return
    const count = typeof value.count === 'number' ? value.count : 0
    if (count > bestCount) {
      bestCount = count
      bestCategory = category
    }
  })

  return bestCategory
}
