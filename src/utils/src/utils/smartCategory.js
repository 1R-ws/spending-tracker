import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

import { CATEGORIES } from '../constants/categories'

export async function getSmartCategory(note) {

  const keyword = (note || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(' ')[0]

  if (!keyword) return null

  const snap = await getDoc(doc(db, 'userPatterns', keyword))

  if (!snap.exists()) return null

  const data = snap.data()

  let bestCategory = null
  let bestCount = 0

  for (const cat in data) {

    const count = data[cat]?.count || 0

    if (count > bestCount) {
      bestCount = count
      bestCategory = cat
    }

  }

  return bestCategory
}