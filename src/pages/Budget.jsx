import { useEffect, useState } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'
import { useExpenses } from '../hooks/useExpenses'
import '../styles/budget.css'

function Budget() {
  const { expenses, loading } = useExpenses()
  const [budgets, setBudgets] = useState({})
  const [inputs, setInputs] = useState({})
  const [editMode, setEditMode] = useState({})

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) return
      const ref = doc(db, 'budgets', auth.currentUser.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) setBudgets(snap.data())
    }
    load()
  }, [])

  const thisMonthExp = expenses.filter(e => e.date?.startsWith(thisMonth))

  // Only count categories that have a limit set for the summary
  const catsWithLimit = CATEGORIES.filter(cat => Number(budgets[cat] || 0) > 0)
  const totalBudget = catsWithLimit.reduce((s, cat) => s + Number(budgets[cat]), 0)
  const totalSpent = catsWithLimit.reduce((s, cat) => {
    const catSpent = thisMonthExp
      .filter(e => e.category === cat)
      .reduce((cs, e) => cs + Number(e.amount || 0), 0)
    return s + catSpent
  }, 0)
  const totalRemaining = totalBudget - totalSpent
  const hasBudgets = catsWithLimit.length > 0

  const handleEdit = (cat) => {
    setEditMode(prev => ({ ...prev, [cat]: true }))
    setInputs(prev => ({ ...prev, [cat]: budgets[cat] || '' }))
  }

  const handleSave = async (cat) => {
    if (!auth.currentUser) {
      alert('Session expired. Please sign in again.')
      return
    }
    const uid = auth.currentUser.uid
    const raw = inputs[cat]
    if (raw === '' || raw === null || raw === undefined) {
      const updated = { ...budgets }
      delete updated[cat]
      setBudgets(updated)
      setEditMode(prev => ({ ...prev, [cat]: false }))
      await setDoc(doc(db, 'budgets', uid), updated)
      return
    }
    const val = Number(raw)
    if (isNaN(val) || val < 0) return
    const updated = { ...budgets, [cat]: val }
    setBudgets(updated)
    setEditMode(prev => ({ ...prev, [cat]: false }))
    await setDoc(doc(db, 'budgets', uid), updated)
  }

  const handleCancel = (cat) => {
    setInputs(prev => ({ ...prev, [cat]: budgets[cat] || '' }))
    setEditMode(prev => ({ ...prev, [cat]: false }))
  }

  if (loading) {
    return <div className="bg-loading">Loading…</div>
  }

  return (
    <div className="bg-root">

      {/* HEADER */}
      <div className="bg-header">
        <span className="bg-title">Budget</span>
        <span className="bg-month">{monthName}</span>
      </div>

      {/* SUMMARY STRIP — only shown when at least one limit is set */}
      {hasBudgets && (
        <>
          <div className="bg-summary">
            <div className="bg-stat">
              <div className="bg-stat-label">Spent</div>
              <div className="bg-stat-value">RM {totalSpent.toFixed(2)}</div>
            </div>
            <div className="bg-stat-divider" />
            <div className="bg-stat">
              <div className="bg-stat-label">Budget</div>
              <div className="bg-stat-value">RM {totalBudget.toFixed(2)}</div>
            </div>
            <div className="bg-stat-divider" />
            <div className="bg-stat">
              <div className="bg-stat-label">Remaining</div>
              <div className={`bg-stat-value${totalRemaining < 0 ? ' over' : ' good'}`}>
                {totalRemaining < 0
                  ? `RM ${Math.abs(totalRemaining).toFixed(2)} over`
                  : `RM ${totalRemaining.toFixed(2)}`
                }
              </div>
            </div>
          </div>

          <div className="bg-overall-bar-wrap">
            <div className="bg-overall-bar">
              <div
                className="bg-overall-fill"
                style={{
                  width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                  background: totalSpent > totalBudget ? '#E24B4A' : '#534AB7'
                }}
              />
            </div>
            <span className="bg-overall-pct">
              {Math.round((totalSpent / totalBudget) * 100)}% used
            </span>
          </div>
        </>
      )}

      {/* NO BUDGETS SET HINT */}
      {!hasBudgets && (
        <div className="bg-no-budget-hint">
          Tap <strong>Edit</strong> on any category to set a spending limit.
        </div>
      )}

      {/* CATEGORY CARDS */}
      <div className="bg-list">
        {CATEGORIES.map(cat => {
          const spent = thisMonthExp
            .filter(e => e.category === cat)
            .reduce((s, e) => s + Number(e.amount || 0), 0)
          const limit = Number(budgets[cat] || 0)
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
          const over = limit > 0 && spent > limit
          const warn = !over && pct > 70
          const barColor = over ? '#E24B4A' : warn ? '#EF9F27' : (COLORS[cat] || '#534AB7')
          const isEditing = editMode[cat]

          return (
            <div key={cat} className="bg-card">

              {/* TOP ROW */}
              <div className="bg-card-top">
                <div
                  className="bg-icon"
                  style={{
                    background: (COLORS[cat] || '#534AB7') + '20',
                    color: COLORS[cat] || '#534AB7'
                  }}
                >
                  {CATEGORY_ICONS[cat]}
                </div>

                <div className="bg-card-info">
                  <div className="bg-cat-name">{cat}</div>
                  <div className="bg-cat-sub">
                    {spent > 0 || limit > 0
                      ? `RM ${spent.toFixed(2)}${limit > 0 ? ` of RM ${limit}` : ' · no limit set'}`
                      : 'No spending this month'
                    }
                  </div>
                </div>

                <div className="bg-card-right">
                  {over && <span className="bg-over-badge">Over</span>}
                  {!over && limit > 0 && (
                    <span className="bg-pct">{Math.round(pct)}%</span>
                  )}
                  {!isEditing && (
                    <button className="bg-edit-btn" onClick={() => handleEdit(cat)}>
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* PROGRESS BAR — only when limit is set */}
              {limit > 0 && !isEditing && (
                <div className="bg-bar-wrap">
                  <div className="bg-bar">
                    <div
                      className="bg-bar-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </div>
              )}

              {/* EDIT INLINE */}
              {isEditing && (
                <div className="bg-edit-row">
                  <div className="bg-input-wrap">
                    <span className="bg-input-prefix">RM</span>
                    <input
                      className="bg-input"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={inputs[cat] || ''}
                      onChange={e => setInputs({ ...inputs, [cat]: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <button className="bg-save-btn" onClick={() => handleSave(cat)}>Save</button>
                  <button className="bg-cancel-btn" onClick={() => handleCancel(cat)}>Cancel</button>
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
