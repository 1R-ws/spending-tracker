import { useEffect, useState } from 'react'

import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'
import { useExpenses } from '../hooks/useExpenses'

function Budget() {

  const { expenses, loading } = useExpenses()

  const [budgets, setBudgets] = useState({})
  const [inputs, setInputs] = useState({})
  const [editMode, setEditMode] = useState({})

  const thisMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {

    const load = async () => {

      if (!auth.currentUser) return

      const ref = doc(db, 'budgets', auth.currentUser.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        setBudgets(snap.data())
      }

    }

    load()

  }, [])

  const handleEdit = (cat) => {

    setEditMode(prev => ({
      ...prev,
      [cat]: true
    }))

    // IMPORTANT FIX: always sync latest value
    setInputs(prev => ({
      ...prev,
      [cat]: budgets[cat] || ''
    }))

  }

  const handleSave = async (cat) => {

    const raw = inputs[cat]

    // allow empty = no limit
    if (raw === '' || raw === null || raw === undefined) {

      const updated = { ...budgets }
      delete updated[cat]

      setBudgets(updated)
      setEditMode(prev => ({ ...prev, [cat]: false }))

      await setDoc(
        doc(db, 'budgets', auth.currentUser.uid),
        updated
      )

      return
    }

    const val = Number(raw)

    if (isNaN(val) || val < 0) return

    const updated = {
      ...budgets,
      [cat]: val
    }

    setBudgets(updated)

    setEditMode(prev => ({
      ...prev,
      [cat]: false
    }))

    await setDoc(
      doc(db, 'budgets', auth.currentUser.uid),
      updated
    )
  }

  const handleCancel = (cat) => {

    setInputs(prev => ({
      ...prev,
      [cat]: budgets[cat] || ''
    }))

    setEditMode(prev => ({
      ...prev,
      [cat]: false
    }))

  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const thisMonthExp = expenses.filter(
    e => e.date?.startsWith(thisMonth)
  )

  return (
    <div className="page-container">

      <h2 className="page-title">💰 Budget</h2>

      <div className="budget-grid">

        {CATEGORIES.map(cat => {

          const spent = thisMonthExp
            .filter(e => e.category === cat)
            .reduce((s, e) => s + Number(e.amount || 0), 0)

          const limit = Number(budgets[cat] || 0)

          const pct = limit > 0
            ? Math.min((spent / limit) * 100, 100)
            : 0

          const over = limit > 0 && spent > limit

          const color = over
            ? '#E24B4A'
            : pct > 70
              ? '#EF9F27'
              : COLORS[cat]

          const isEditing = editMode[cat]

          return (

            <div key={cat} className="budget-card">

              {/* HEADER */}
              <div className="budget-top">

                <div className="budget-left">

                  <div
                    className="budget-icon"
                    style={{
                      background: COLORS[cat] + '22',
                      color: COLORS[cat]
                    }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </div>

                  <div>
                    <div className="budget-title">{cat}</div>

                    <div className="budget-sub">
                      RM {spent.toFixed(2)}
                      {limit > 0 ? ` / RM ${limit}` : ' / RM 0'}
                    </div>
                  </div>

                </div>

                {!isEditing && (
                  <button
                    className="save-btn"
                    onClick={() => handleEdit(cat)}
                  >
                    Edit
                  </button>
                )}

              </div>

              {/* INPUT */}
              {isEditing && (

                <div className="budget-input-wrap">

                  <input
                    className="budget-input"
                    type="number"
                    value={inputs[cat] || ''}
                    onChange={e =>
                      setInputs({
                        ...inputs,
                        [cat]: e.target.value
                      })
                    }
                  />

                  <button
                    className="budget-save"
                    onClick={() => handleSave(cat)}
                  >
                    Save
                  </button>

                  <button
                    className="save-btn"
                    onClick={() => handleCancel(cat)}
                    style={{ background: '#aaa' }}
                  >
                    Cancel
                  </button>

                </div>

              )}

              {/* PROGRESS */}
              {limit > 0 && !isEditing && (

                <div className="budget-progress">

                  <div className="budget-bar">

                    <div
                      className="budget-fill"
                      style={{
                        width: `${pct}%`,
                        background: color
                      }}
                    />

                  </div>

                </div>

              )}

            </div>

          )

        })}

      </div>

    </div>
  )
}

export default Budget