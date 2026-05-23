import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export async function getSmartCategory(note) {

  try {

    if (!auth.currentUser || !note) return null

    const keyword = note
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .split(' ')[0]

    if (!keyword) return null

    const snap = await getDoc(
      doc(db, 'userPatterns', keyword)
    )

    if (!snap.exists()) return null

    const data = snap.data()

    let bestCategory = null
    let bestCount = 0

    // FIX: safe iteration
    Object.entries(data).forEach(([category, value]) => {

      if (!value) return

      const count = typeof value.count === 'number'
        ? value.count
        : 0

      if (count > bestCount) {
        bestCount = count
        bestCategory = category
      }

    })

    return bestCategory

  } catch (error) {
    console.error('Smart category error:', error)
    return null
  }
}