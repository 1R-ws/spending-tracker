import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'
import { db, auth } from '../firebase/config'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'
import '../styles/dashboard.css'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function Dashboard() {
  const [expenses, setExpenses] = useState([])
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth())
  const [selectedCategory, setSelectedCategory] = useState(null)
  const navigate = useNavigate()

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

  const filteredExp = selectedCategory
    ? monthExp.filter(e => e.category === selectedCategory)
    : monthExp

  const recentExp = [...filteredExp]
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5)

  const filteredTotal = filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0)

  const handleCatClick = (catName) => {
    setSelectedCategory(prev => prev === catName ? null : catName)
  }

  return (
    <div className="dash-root">

      {/* MONTH SCROLL */}
      <div className="month-scroll">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            className={`month-btn${activeMonth === i ? ' active' : ''}`}
            onClick={() => {
              setActiveMonth(i)
              setSelectedCategory(null)
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* DONUT */}
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              strokeWidth={0}
            >
              {pieData.length > 0
                ? pieData.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name] || '#9ca3af'}
                      opacity={!selectedCategory || selectedCategory === entry.name ? 1 : 0.2}
                    />
                  ))
                : <Cell fill="var(--dash-border)" />
              }
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="donut-center">
          <div className="donut-label">
            {selectedCategory ? selectedCategory : 'This month'}
          </div>
          <div className="donut-total">
            RM {(selectedCategory ? filteredTotal : total).toFixed(2)}
          </div>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="cat-scroll">
        {pieData.length === 0 ? (
          <div className="dash-empty">No expenses this month.</div>
        ) : pieData.map(cat => (
          <div
            key={cat.name}
            className={`cat-pill${selectedCategory === cat.name ? ' active' : ''}`}
            onClick={() => handleCatClick(cat.name)}
            style={{ '--pill-color': COLORS[cat.name] || '#9ca3af' }}
          >
            <div className="cat-pill-icon">
              {CATEGORY_ICONS[cat.name] || '📦'}
            </div>
            <div className="cat-pill-name">{cat.name}</div>
            <div className="cat-pill-amt">RM {cat.value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="recent-section">
        <div className="recent-header">
          <span className="recent-title">
            {selectedCategory ? selectedCategory : 'Recent'}
          </span>
          <button className="see-all" onClick={() => navigate('/history')}>
            See all
          </button>
        </div>

        {recentExp.length === 0 ? (
          <div className="dash-empty">No transactions yet.</div>
        ) : recentExp.map(e => (
          <div key={e.id} className="tx-item">
            <div
              className="tx-icon"
              style={{ background: (COLORS[e.category] || '#9ca3af') + '22' }}
            >
              {CATEGORY_ICONS[e.category] || '📦'}
            </div>
            <div className="tx-info">
              <div className="tx-name">{e.note || e.category}</div>
              <div className="tx-meta">{e.category} · {e.date}</div>
            </div>
            <div className="tx-amount">- RM {Number(e.amount || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Dashboard
