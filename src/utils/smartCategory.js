import { doc, getDoc, setDoc, increment } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

// ========================
// GET SMART CATEGORY
// Priority: Personal → Global → null
// ========================
export async function getSmartCategory(note) {
  try {
    if (!note) return null

    const keyword = buildKeyword(note)
    if (!keyword) return null

    const uid = auth.currentUser?.uid

    // 1. Check personal memory first
    if (uid) {
      const personalSnap = await getDoc(
        doc(db, 'userPatterns', `${uid}_${keyword}`)
      )

      if (personalSnap.exists()) {
        const category = getBestCategory(personalSnap.data())
        if (category) {
          console.log(`Smart category (personal): ${category}`)
          return category
        }
      }
    }

    // 2. Fallback to global community memory
    const globalSnap = await getDoc(
      doc(db, 'globalPatterns', keyword)
    )

    if (globalSnap.exists()) {
      const category = getBestCategory(globalSnap.data())
      if (category) {
        console.log(`Smart category (global): ${category}`)
        return category
      }
    }

    return null

  } catch (error) {
    console.error('Smart category error:', error)
    return null
  }
}

// ========================
// SAVE MEMORY — saves to both personal + global
// ========================
export async function savePattern(note, category) {
  try {
    if (!note || !category) return

    const keyword = buildKeyword(note)
    if (!keyword) return

    const uid = auth.currentUser?.uid

    // Save to personal memory
    if (uid) {
      await setDoc(
        doc(db, 'userPatterns', `${uid}_${keyword}`),
        {
          [category]: {
            count: increment(1),
            lastUsed: new Date().toISOString()
          }
        },
        { merge: true }
      )
    }

    // Save to global community memory
    await setDoc(
      doc(db, 'globalPatterns', keyword),
      {
        [category]: {
          count: increment(1),
          lastUsed: new Date().toISOString()
        }
      },
      { merge: true }
    )

    console.log(`Pattern saved: "${keyword}" → ${category}`)

  } catch (error) {
    console.error('Save pattern error:', error)
  }
}

// ========================
// HELPERS
// ========================

function buildKeyword(note) {
  return note
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .join('_')
}

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