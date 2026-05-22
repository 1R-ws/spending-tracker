import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'

import { db, auth } from '../firebase/config'

export function useExpenses() {

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    if (!auth.currentUser) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'expenses'),
      where('uid', '==', auth.currentUser.uid)
    )

    const unsub = onSnapshot(q, (snapshot) => {

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setExpenses(data)
      setLoading(false)

    })

    return () => unsub()

  }, [])

  return {
    expenses,
    loading
  }
}