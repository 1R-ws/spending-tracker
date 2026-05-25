import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

import { db, auth } from '../firebase/config'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubSnapshot = null;

    // Listen continuously to user login authentication status changes
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // If no valid session is active yet, close states safely
      if (!user) {
        setExpenses([])
        setLoading(false)
        if (unsubSnapshot) unsubSnapshot();
        return;
      }

      setLoading(true);

      // Secure database path query tied to user permissions
      const q = query(
        collection(db, 'expenses'),
        where('uid', '==', user.uid),
        orderBy('date', 'desc') // Keeps transactions chronological
      );

      // Fire down real-time sync mapping pipeline
      unsubSnapshot = onSnapshot(
        q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setExpenses(data);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore read error matching permission rules:", error);
          setLoading(false);
        }
      );
    });

    // Run cleanups for both listeners when components are unmounted
    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  return {
    expenses,
    loading
  }
}