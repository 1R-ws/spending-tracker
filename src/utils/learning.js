import { collection, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export async function learnFromExpenses(keyword) {

  if (!keyword) return null

  const q = query(
    collection(db, 'expenses'),
    where('uid', '==', auth.currentUser.uid)
  )

  const snap = await getDocs(q)

  const map = {}

  snap.forEach(doc => {

    const data = doc.data()

    const note = (data.note || '').toLowerCase()

    if (note.includes(keyword.toLowerCase())) {

      map[data.category] =
        (map[data.category] || 0) + 1

    }

  })

  // find most used category for this keyword
  let best = null
  let max = 0

  for (const cat in map) {

    if (map[cat] > max) {
      max = map[cat]
      best = cat
    }

  }

  return best

}