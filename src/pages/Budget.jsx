import { useEffect, useState } from 'react'

import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore'

import { db, auth } from '../firebase/config'

import {
  CATEGORIES,
  COLORS,
  CATEGORY_ICONS
} from '../constants/categories'

import { useExpenses } from '../hooks/useExpenses'

function Budget() {

  const {
    expenses,
    loading
  } = useExpenses()

  const [budgets, setBudgets] = useState({})
  const [inputs, setInputs] = useState({})

  const thisMonth = new Date()
    .toISOString()
    .slice(0, 7)

  // Load budgets
  useEffect(() => {

    const loadBudgets = async () => {

      try {

        if (!auth.currentUser) {
          return
        }

        const ref = doc(
          db,
          'budgets',
          auth.currentUser.uid
        )

        const snap = await getDoc(ref)

        if (snap.exists()) {

          setBudgets(snap.data())
          setInputs(snap.data())

        }

      } catch (error) {

        console.error(error)

      }

    }

    loadBudgets()

  }, [])

  // Save budget
  const handleSave = async (cat) => {

    try {

      const val = parseFloat(inputs[cat])

      if (isNaN(val) || val <= 0) {

        alert('Please enter a valid amount.')
        return

      }

      const updated = {
        ...budgets,
        [cat]: val
      }

      setBudgets(updated)

      await setDoc(
        doc(
          db,
          'budgets',
          auth.currentUser.uid
        ),
        updated
      )

      alert(`${cat} budget saved!`)

    } catch (error) {

      console.error(error)

      alert('Failed to save budget.')

    }

  }

  if (loading) {

    return (
      <div className="loading">
        Loading...
      </div>
    )

  }

  const thisMonthExp = expenses.filter(
    e => e.date?.startsWith(thisMonth)
  )

  return (

    <div className="page-container">

      <h2 className="page-title">
        💰 Budget
      </h2>

      {/* Set Budget */}
      <div
        className="form-card"
        style={{ marginBottom: '1rem' }}
      >

        <h3 className="chart-title">
          Set Monthly Limits
        </h3>

        {CATEGORIES.map(cat => (

          <div
            key={cat}
            className="budget-input-row"
          >

            <span className="budget-cat-label">

              <span
                style={{
                  fontSize: '18px'
                }}
              >
                {CATEGORY_ICONS[cat]}
              </span>

              {cat}

            </span>

            <input
              type="number"
              placeholder="No limit"
              value={inputs[cat] || ''}
              onChange={e =>
                setInputs({
                  ...inputs,
                  [cat]: e.target.value
                })
              }
              min="0"
              step="1"
            />

            <button
              className="save-btn"
              onClick={() => handleSave(cat)}
            >
              Save
            </button>

          </div>

        ))}

      </div>

      {/* Budget Progress */}
      <div className="form-card">

        <h3 className="chart-title">

          Progress • {

            new Date().toLocaleString(
              'default',
              {
                month: 'long',
                year: 'numeric'
              }
            )

          }

        </h3>

        {CATEGORIES.map(cat => {

          const spent = thisMonthExp
            .filter(e => e.category === cat)
            .reduce(
              (s, e) => s + Number(e.amount || 0),
              0
            )

          const limit = Number(
            budgets[cat] || 0
          )

          const pct = limit > 0
            ? Math.min(
                (spent / limit) * 100,
                100
              )
            : 0

          const over =
            limit > 0 &&
            spent > limit

          const color = over
            ? '#E24B4A'
            : pct > 70
              ? '#EF9F27'
              : COLORS[cat]

          return (

            <div
              key={cat}
              className="budget-progress-item"
            >

              <div className="budget-progress-header">

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >

                  <span
                    style={{
                      fontSize: '18px'
                    }}
                  >
                    {CATEGORY_ICONS[cat]}
                  </span>

                  {cat}

                </span>

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >

                  <span className="budget-amounts">

                    RM {spent.toFixed(2)}

                    {limit > 0
                      ? ` / RM ${limit.toFixed(2)}`
                      : ' (No limit)'}

                  </span>

                  {over && (

                    <span className="badge-over">
                      Over!
                    </span>

                  )}

                </span>

              </div>

              {limit > 0 && (

                <div className="progress-bar">

                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: color
                    }}
                  ></div>

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