import { useState } from 'react'

import {
  doc,
  deleteDoc
} from 'firebase/firestore'

import { db } from '../firebase/config'

import {
  CATEGORIES,
  COLORS
} from '../constants/categories'

import { useExpenses } from '../hooks/useExpenses'

function History() {

  const {
    expenses,
    loading
  } = useExpenses()

  const [filterCat, setFilterCat] = useState('All')

  const [filterMonth, setFilterMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const handleDelete = async (id) => {

    if (!confirm('Delete this expense?')) {
      return
    }

    await deleteDoc(
      doc(db, 'expenses', id)
    )

  }

  const filtered = expenses

    .filter(e =>
      !filterMonth ||
      e.date?.startsWith(filterMonth)
    )

    .filter(e =>
      filterCat === 'All' ||
      e.category === filterCat
    )

    .sort((a, b) =>
      b.date?.localeCompare(a.date)
    )

  const exportCSV = () => {

    const headers = [
      'Date',
      'Category',
      'Amount (RM)',
      'Note'
    ]

    const rows = filtered.map(e => [
      e.date,
      e.category,
      e.amount,
      e.note || ''
    ])

    const csv = [headers, ...rows]
      .map(r => r.join(','))
      .join('\n')

    const a = document.createElement('a')

    a.href =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(csv)

    a.download =
      `spending-${filterMonth}.csv`

    a.click()

  }

  // Build month options
  const months = Array.from(
    { length: 6 },
    (_, i) => {

      const d = new Date()

      d.setMonth(d.getMonth() - i)

      return d
        .toISOString()
        .slice(0, 7)

    }
  )

  if (loading) {
    return (
      <div className="loading">
        Loading...
      </div>
    )
  }

  return (

    <div className="page-container">

      <h2 className="page-title">
        History
      </h2>

      {/* Filters */}
      <div className="filter-row">

        <select
          value={filterMonth}
          onChange={e =>
            setFilterMonth(e.target.value)
          }
        >

          <option value="">
            All months
          </option>

          {months.map(m => (

            <option
              key={m}
              value={m}
            >

              {
                new Date(m + '-01')
                  .toLocaleString(
                    'default',
                    {
                      month: 'long',
                      year: 'numeric'
                    }
                  )
              }

            </option>

          ))}

        </select>

        <select
          value={filterCat}
          onChange={e =>
            setFilterCat(e.target.value)
          }
        >

          <option value="All">
            All
          </option>

          {CATEGORIES.map(cat => (

            <option
              key={cat}
              value={cat}
            >

              {cat}

            </option>

          ))}

        </select>

        <button
          className="export-btn"
          onClick={exportCSV}
        >
          ⬇ Export CSV
        </button>

      </div>

      {/* Expense List */}
      <div className="form-card">

        {filtered.length === 0 ? (

          <div className="empty">
            No expenses found.
          </div>

        ) : (

          filtered.map(e => (

            <div
              key={e.id}
              className="expense-item"
            >

              <span
                className="cat-dot"
                style={{
                  background:
                    COLORS[e.category]
                }}
              ></span>

              <div className="expense-info">

                <div className="expense-name">

                  {e.note || e.category}

                </div>

                <div className="expense-meta">

                  {e.category} · {e.date}

                </div>

              </div>

              <span className="expense-amount">

                RM {e.amount?.toFixed(2)}

              </span>

              <button
                className="delete-btn"
                onClick={() =>
                  handleDelete(e.id)
                }
              >
                🗑
              </button>

            </div>

          ))

        )}

      </div>

    </div>

  )
}

export default History