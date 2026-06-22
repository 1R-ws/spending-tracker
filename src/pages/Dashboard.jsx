import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'

import { db, auth } from '../firebase/config'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'

import { useNavigate } from 'react-router-dom'

import {
  CATEGORIES,
  COLORS,
  CATEGORY_ICONS
} from '../constants/categories'

function Dashboard() {

  const [expenses, setExpenses] = useState([])
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth())
  const [selectedCategory, setSelectedCategory] = useState(null) // ← NEW

  const navigate = useNavigate()

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

  useEffect(() => {
    if (!auth.currentUser) return

    const q = query(
      collection(db, 'expenses'),
      where('uid', '==', auth.currentUser.uid)
    )

    const unsub = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    return () => unsub()
  }, [])

  const year = new Date().getFullYear()
  const monthKey = `${year}-${String(activeMonth + 1).padStart(2, '0')}`
  const monthExp = expenses.filter(e => e.date?.startsWith(monthKey))

  const total = monthExp.reduce((s, e) => s + Number(e.amount || 0), 0)

  const pieData = CATEGORIES
    .map(cat => ({
      name: cat,
      value: monthExp
        .filter(e => e.category === cat)
        .reduce((s, e) => s + Number(e.amount || 0), 0)
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const topCats = [...pieData]

  // ── FILTER recent by selected category ──────────────────────────────
  const filteredExp = selectedCategory
    ? monthExp.filter(e => e.category === selectedCategory)
    : monthExp

  const recentExp = [...filteredExp]
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5)
  // ────────────────────────────────────────────────────────────────────

  // ── Toggle handler ───────────────────────────────────────────────────
  const handleCatClick = (catName) => {
    setSelectedCategory(prev => prev === catName ? null : catName)
  }
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="dash-container">

      {/* Month Selector */}
      <div className="month-scroll">
        {months.map((m, i) => (
          <button
            key={m}
            className={`month-btn ${activeMonth === i ? 'active' : ''}`}
            onClick={() => {
              setActiveMonth(i)
              setSelectedCategory(null) // reset filter on month change
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Donut Chart */}
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={110}
              strokeWidth={2}
            >
              {pieData.length > 0
                ? pieData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name] || '#999'}
                      // ← dim non-selected slices when a category is active
                      opacity={
                        !selectedCategory || selectedCategory === entry.name
                          ? 1
                          : 0.25
                      }
                    />
                  ))
                : <Cell fill="#f0f0f0" />
              }
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="donut-center">
          <div className="donut-label">
            {selectedCategory ? `${selectedCategory} spending` : "This month's spending"}
          </div>
          <div className="donut-total">
            RM {selectedCategory
              ? filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0).toFixed(2)
              : total.toFixed(2)
            }
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="cat-scroll">
        {topCats.length === 0 ? (
          <div className="empty">No expenses this month.</div>
        ) : (
          topCats.map(cat => (
            <div
              key={cat.name}
              className={`cat-pill ${selectedCategory === cat.name ? 'active' : ''}`}
              onClick={() => handleCatClick(cat.name)} // ← clickable
              style={{ cursor: 'pointer' }}
            >
              <div
                className="cat-pill-icon"
                style={{
                  background: (COLORS[cat.name] || '#999') + '22',
                  color: COLORS[cat.name] || '#999'
                }}
              >
                {CATEGORY_ICONS[cat.name] || '📦'}
              </div>
              <div className="cat-pill-name">{cat.name}</div>
              <div className="cat-pill-amt">RM {cat.value.toFixed(2)}</div>
            </div>
          ))
        )}
      </div>

      {/* Recent Transactions */}
      <div className="recent-section">
        <div className="recent-header">
          <span className="recent-title">
            {selectedCategory ? `${selectedCategory} transactions` : 'Recent'} {/* ← dynamic label */}
          </span>
          <button className="see-all" onClick={() => navigate('/history')}>
            See all
          </button>
        </div>

        {recentExp.length === 0 ? (
          <div className="empty">No transactions yet.</div>
        ) : (
          recentExp.map(e => (
            <div key={e.id} className="recent-item">
              <div
                className="recent-icon"
                style={{ background: (COLORS[e.category] || '#999') + '22' }}
              >
                <span>{CATEGORY_ICONS[e.category] || '📦'}</span>
              </div>
              <div className="recent-info">
                <div className="recent-name">{e.note || e.category}</div>
                <div className="recent-meta">{e.category} · {e.date}</div>
              </div>
              <div className="recent-amount">
                - RM {Number(e.amount || 0).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <button className="fab" onClick={() => navigate('/add')}>
        + Add Expense
      </button>

    </div>
  )
}

export default Dashboard